const express = require('express');
const router  = express.Router();

const {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  updateUserProfile, // ← import kiya
  deleteUser,
} = require('../controllers/adminController');

const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Saare admin routes ke liye auth + admin role required
router.use(verifyToken, isAdmin);

router.get('/stats',              getDashboardStats);
router.get('/users',              getAllUsers);
router.put('/users/:uid/role',    updateUserRole);
router.put('/users/:uid/profile', updateUserProfile); // ← naya route (verifyToken/isAdmin upar se already lag raha hai)
router.delete('/users/:uid',      deleteUser);

module.exports = router;