const express = require('express');
const router = express.Router();
const {
  getAllServices, getServiceById,
  createService, updateService, deleteService,
} = require('../controllers/serviceController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken); // All routes require auth

router.get('/',    getAllServices);
router.get('/:id', getServiceById);
router.post('/',   createService);
router.put('/:id', updateService);
router.delete('/:id', isAdmin, deleteService); // Admin only

module.exports = router;