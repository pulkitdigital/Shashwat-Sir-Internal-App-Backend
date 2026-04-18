const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken); // All user routes require auth

// GET  /api/users/profile
router.get('/profile', getProfile);

// PUT  /api/users/profile
router.put('/profile', updateProfile);

module.exports = router;