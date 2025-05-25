const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const User = require('../models/User');
const { generateTokens } = require('../controllers/iam');

describe('IAM System Performance Tests', () => {
  let adminToken;
  let adminId;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/buddybox-test');
    
    // Create admin user
    const admin = await User.create({
      email: 'admin@test.com',
      password: 'hashedPassword123',
      name: 'Admin User',
      role: 'admin'
    });

    adminId = admin._id;
    const adminTokens = generateTokens(adminId);
    adminToken = adminTokens.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('Authentication Performance', () => {
    test('should handle multiple concurrent registrations', async () => {
      const numUsers = 50;
      const startTime = Date.now();

      const registrations = Array(numUsers).fill().map((_, i) => 
        request(app)
          .post('/api/iam/register')
          .send({
            email: `user${i}@test.com`,
            password: 'password123',
            name: `User ${i}`,
            role: 'user'
          })
      );

      const results = await Promise.all(registrations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All registrations should succeed
      results.forEach(res => {
        expect(res.statusCode).toBe(201);
      });

      // Performance check: should complete within 5 seconds
      expect(totalTime).toBeLessThan(5000);
      console.log(`Registered ${numUsers} users in ${totalTime}ms`);
    });

    test('should handle multiple concurrent logins', async () => {
      const numUsers = 50;
      const startTime = Date.now();

      const logins = Array(numUsers).fill().map((_, i) => 
        request(app)
          .post('/api/iam/login')
          .send({
            email: `user${i}@test.com`,
            password: 'password123'
          })
      );

      const results = await Promise.all(logins);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All logins should succeed
      results.forEach(res => {
        expect(res.statusCode).toBe(200);
      });

      // Performance check: should complete within 5 seconds
      expect(totalTime).toBeLessThan(5000);
      console.log(`Logged in ${numUsers} users in ${totalTime}ms`);
    });
  });

  describe('User Management Performance', () => {
    test('should handle listing large number of users', async () => {
      const numUsers = 1000;
      const startTime = Date.now();

      // Create many users
      const users = Array(numUsers).fill().map((_, i) => ({
        email: `bulkuser${i}@test.com`,
        password: 'hashedPassword123',
        name: `Bulk User ${i}`,
        role: 'user'
      }));

      await User.insertMany(users);

      // Test listing performance
      const res = await request(app)
        .get('/api/iam/users')
        .set('Authorization', `Bearer ${adminToken}`);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(res.statusCode).toBe(200);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(numUsers);

      // Performance check: should complete within 2 seconds
      expect(totalTime).toBeLessThan(2000);
      console.log(`Listed ${numUsers} users in ${totalTime}ms`);
    });

    test('should handle pagination efficiently', async () => {
      const pageSize = 50;
      const startTime = Date.now();

      const res = await request(app)
        .get('/api/iam/users?page=1&limit=50')
        .set('Authorization', `Bearer ${adminToken}`);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(res.statusCode).toBe(200);
      expect(res.body.data.users.length).toBeLessThanOrEqual(pageSize);

      // Performance check: should complete within 100ms
      expect(totalTime).toBeLessThan(100);
      console.log(`Paginated ${pageSize} users in ${totalTime}ms`);
    });
  });

  describe('Token Management Performance', () => {
    test('should handle multiple concurrent token refreshes', async () => {
      const numRefreshes = 50;
      const startTime = Date.now();

      const refreshes = Array(numRefreshes).fill().map(() => 
        request(app)
          .post('/api/iam/refresh-token')
          .send({
            refreshToken: 'valid-refresh-token'
          })
      );

      const results = await Promise.all(refreshes);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All refreshes should succeed
      results.forEach(res => {
        expect(res.statusCode).toBe(200);
      });

      // Performance check: should complete within 2 seconds
      expect(totalTime).toBeLessThan(2000);
      console.log(`Refreshed ${numRefreshes} tokens in ${totalTime}ms`);
    });
  });

  describe('Memory Usage', () => {
    test('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      const numOperations = 1000;

      // Perform many operations
      for (let i = 0; i < numOperations; i++) {
        await request(app)
          .get('/api/iam/users?page=1&limit=10')
          .set('Authorization', `Bearer ${adminToken}`);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });
  });
}); 