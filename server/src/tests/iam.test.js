const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const { generateTokens } = require('../controllers/iam');

describe('IAM System Tests', () => {
  let adminToken;
  let userToken;
  let adminId;
  let userId;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/buddybox-test');
  });

  afterAll(async () => {
    // Clean up and disconnect
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear users before each test
    await User.deleteMany({});

    // Create test users
    const admin = await User.create({
      email: 'admin@test.com',
      password: 'hashedPassword123',
      name: 'Admin User',
      role: 'admin'
    });

    const user = await User.create({
      email: 'user@test.com',
      password: 'hashedPassword123',
      name: 'Test User',
      role: 'user'
    });

    adminId = admin._id;
    userId = user._id;

    // Generate tokens
    const adminTokens = generateTokens(adminId);
    const userTokens = generateTokens(userId);

    adminToken = adminTokens.accessToken;
    userToken = userTokens.accessToken;
  });

  describe('Authentication', () => {
    test('should register a new user', async () => {
      const res = await request(app)
        .post('/api/iam/register')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          name: 'New User',
          role: 'user'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.user).toHaveProperty('email', 'newuser@test.com');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
    });

    test('should reject registration with existing email', async () => {
      const res = await request(app)
        .post('/api/iam/register')
        .send({
          email: 'user@test.com',
          password: 'password123',
          name: 'Duplicate User',
          role: 'user'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('email already exists');
    });

    test('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/iam/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Invalid User',
          role: 'user'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('invalid email');
    });

    test('should reject registration with weak password', async () => {
      const res = await request(app)
        .post('/api/iam/register')
        .send({
          email: 'weak@test.com',
          password: '123',
          name: 'Weak User',
          role: 'user'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('password too weak');
    });

    test('should login existing user', async () => {
      const res = await request(app)
        .post('/api/iam/login')
        .send({
          email: 'user@test.com',
          password: 'hashedPassword123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user).toHaveProperty('email', 'user@test.com');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
    });

    test('should handle rate limiting on login attempts', async () => {
      const attempts = 6; // Assuming rate limit is 5 attempts
      for (let i = 0; i < attempts; i++) {
        await request(app)
          .post('/api/iam/login')
          .send({
            email: 'user@test.com',
            password: 'wrongpassword'
          });
      }

      const res = await request(app)
        .post('/api/iam/login')
        .send({
          email: 'user@test.com',
          password: 'hashedPassword123'
        });

      expect(res.statusCode).toBe(429); // Too Many Requests
    });

    test('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/iam/login')
        .send({
          email: 'user@test.com',
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('User Management', () => {
    test('should list users (admin only)', async () => {
      const res = await request(app)
        .get('/api/iam/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.users.length).toBe(2);
    });

    test('should prevent non-admin from listing users', async () => {
      const res = await request(app)
        .get('/api/iam/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    test('should update user (admin only)', async () => {
      const res = await request(app)
        .put(`/api/iam/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Name',
          role: 'admin'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user).toHaveProperty('name', 'Updated Name');
      expect(res.body.data.user).toHaveProperty('role', 'admin');
    });

    test('should prevent non-admin from updating users', async () => {
      const res = await request(app)
        .put(`/api/iam/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name'
        });

      expect(res.statusCode).toBe(403);
    });

    test('should delete user (admin only)', async () => {
      const res = await request(app)
        .delete(`/api/iam/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);

      // Verify user is deleted
      const deletedUser = await User.findById(userId);
      expect(deletedUser).toBeNull();
    });

    test('should prevent non-admin from deleting users', async () => {
      const res = await request(app)
        .delete(`/api/iam/users/${userId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(403);
    });

    test('should handle invalid user ID format', async () => {
      const res = await request(app)
        .get('/api/iam/users/invalid-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('invalid id');
    });
  });

  describe('Token Management', () => {
    test('should refresh access token', async () => {
      const res = await request(app)
        .post('/api/iam/refresh-token')
        .send({
          refreshToken: 'valid-refresh-token'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.tokens).toHaveProperty('accessToken');
      expect(res.body.data.tokens).toHaveProperty('refreshToken');
    });

    test('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/iam/refresh-token')
        .send({
          refreshToken: 'invalid-token'
        });

      expect(res.statusCode).toBe(401);
    });

    test('should logout user', async () => {
      const res = await request(app)
        .post('/api/iam/logout')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);

      // Verify refresh token is cleared
      const user = await User.findById(userId);
      expect(user.refreshToken).toBeNull();
    });

    test('should reject requests with expired token', async () => {
      // Create an expired token
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1IiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.4Adcj3UFYzPUVaVF43Fm5SWUJQnHUdF1NQjE8zqJ5U';

      const res = await request(app)
        .get('/api/iam/users')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('token expired');
    });
  });
}); 