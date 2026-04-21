const express = require('express');
const router = express.Router();
const { registerUser, getMe, checkEmail, resetPassword } = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// POST /api/auth/register
router.post('/register', registerUser);

// GET /api/auth/me
router.get('/me', verifyToken, getMe);

// POST /api/auth/check-email — Step 1: verify email exists (no auth needed)
router.post('/check-email', checkEmail);

// PUT /api/auth/reset-password — Step 2: update password via Firebase Admin (no auth needed)
router.put('/reset-password', resetPassword);

module.exports = router;