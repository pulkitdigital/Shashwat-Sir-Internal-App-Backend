const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getAllEmployees,
  getEmployeeByUid,
  addEmployeeService,
  addCustomSkill,
  removeEmployeeService,
} = require('../controllers/employeeController');

// GET  /api/employees
router.get('/',              verifyToken, getAllEmployees);

// GET  /api/employees/:uid
router.get('/:uid',          verifyToken, getEmployeeByUid);

// POST /api/employees/services         — add existing service by service_id
router.post('/services',     verifyToken, addEmployeeService);

// POST /api/employees/services/custom  — create new service + add to profile
router.post('/services/custom', verifyToken, addCustomSkill);

// DELETE /api/employees/services/:serviceId
router.delete('/services/:serviceId', verifyToken, removeEmployeeService);

module.exports = router;