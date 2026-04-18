const express = require('express');
const router = express.Router();
const {
  getAllEmployees, getEmployeeByUid,
  addEmployeeService, removeEmployeeService,
} = require('../controllers/employeeController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/',                      getAllEmployees);
router.get('/:uid',                  getEmployeeByUid);
router.post('/services',             addEmployeeService);
router.delete('/services/:serviceId', removeEmployeeService);

module.exports = router;