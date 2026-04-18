const express = require('express');
const router = express.Router();
const { getAllResources, createResource, deleteResource } = require('../controllers/resourceController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/',    getAllResources);
router.post('/',   createResource);
router.delete('/:id', isAdmin, deleteResource); // Admin only

module.exports = router;