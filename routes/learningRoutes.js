const express = require('express');
const router = express.Router();
const {
  getMyLearning, getAllLearning,
  addLearningInterest, updateLearningStatus, removeLearningInterest,
} = require('../controllers/learningController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/',              getMyLearning);
router.get('/all',           isAdmin, getAllLearning); // Admin only
router.post('/',             addLearningInterest);
router.put('/:serviceId',    updateLearningStatus);
router.delete('/:serviceId', removeLearningInterest);

module.exports = router;