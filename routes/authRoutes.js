const express = require('express');
const router = express.Router();
const { registerUser, getMe } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST /api/auth/register — save Firebase user to DB (call after Firebase signup)
router.post('/register', registerUser);

// GET /api/auth/me — get current user's DB profile
router.get('/me', verifyToken, getMe);

module.exports = router;