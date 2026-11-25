const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/register - Team dynamic registration
router.post('/register', authController.register);

// POST /api/auth/login - Universal login (Admin and Teams)
router.post('/login', authController.login);

// GET /api/auth/me - Authenticated user profile
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
