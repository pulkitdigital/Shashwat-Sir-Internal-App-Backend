const pool = require('../config/db');

// GET /api/employees — all employees with their services
const getAllEmployees = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.firebase_uid, u.full_name, u.email, u.designation,
       u.department, u.phone, u.avatar_url, u.role, u.created_at,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'service_id', es.service_id,
          'title', s.title,
          'proficiency', es.proficiency
        )) FILTER (WHERE es.service_id IS NOT NULL), '[]') AS services
       FROM users u
       LEFT JOIN employee_services es ON u.firebase_uid = es.firebase_uid
       LEFT JOIN services s ON es.service_id = s.id
       GROUP BY u.id
       ORDER BY u.full_name`
    );

    res.json({ success: true, employees: result.rows });
  } catch (err) {
    console.error('getAllEmployees error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/employees/:uid — single employee profile
const getEmployeeByUid = async (req, res) => {
  const { uid } = req.params;

  try {
    const result = await pool.query(
      `SELECT u.*,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'service_id', es.service_id,
          'title', s.title,
          'proficiency', es.proficiency
        )) FILTER (WHERE es.service_id IS NOT NULL), '[]') AS known_services
       FROM users u
       LEFT JOIN employee_services es ON u.firebase_uid = es.firebase_uid
       LEFT JOIN services s ON es.service_id = s.id
       WHERE u.firebase_uid = $1
       GROUP BY u.id`,
      [uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, employee: result.rows[0] });
  } catch (err) {
    console.error('getEmployeeByUid error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/employees/services — add a service to current user
const addEmployeeService = async (req, res) => {
  const { service_id, proficiency } = req.body;

  if (!service_id) {
    return res.status(400).json({ success: false, message: 'service_id is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO employee_services (firebase_uid, service_id, proficiency)
       VALUES ($1, $2, $3)
       ON CONFLICT (firebase_uid, service_id)
       DO UPDATE SET proficiency = EXCLUDED.proficiency
       RETURNING *`,
      [req.user.uid, service_id, proficiency || 'beginner']
    );

    res.status(201).json({ success: true, record: result.rows[0] });
  } catch (err) {
    console.error('addEmployeeService error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/employees/services/:serviceId — remove a service from current user
const removeEmployeeService = async (req, res) => {
  const { serviceId } = req.params;

  try {
    await pool.query(
      'DELETE FROM employee_services WHERE firebase_uid = $1 AND service_id = $2',
      [req.user.uid, serviceId]
    );

    res.json({ success: true, message: 'Service removed from profile' });
  } catch (err) {
    console.error('removeEmployeeService error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllEmployees, getEmployeeByUid, addEmployeeService, removeEmployeeService };