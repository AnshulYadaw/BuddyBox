const express = require('express');
const { register, login, refreshToken, logout } = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.post('/logout', authenticate, logout);

module.exports = router; 