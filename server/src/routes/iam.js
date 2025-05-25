const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  register,
  login,
  refreshToken,
  logout,
  listUsers,
  updateUser,
  deleteUser,
  getUserById
} = require('../controllers/iam');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.use(authenticate); // All routes below require authentication
router.post('/logout', logout);

// Admin only routes
router.get('/users', authorize('admin', 'superadmin'), listUsers);
router.get('/users/:id', authorize('admin', 'superadmin'), getUserById);
router.put('/users/:id', authorize('admin', 'superadmin'), updateUser);
router.delete('/users/:id', authorize('admin', 'superadmin'), deleteUser);

module.exports = router; 