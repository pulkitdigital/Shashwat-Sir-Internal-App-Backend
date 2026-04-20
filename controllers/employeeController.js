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

// POST /api/employees/services — add an existing service to current user
const addEmployeeService = async (req, res) => {
  const { service_id, proficiency } = req.body;

  if (!service_id) {
    return res.status(400).json({ success: false, message: 'service_id is required' });
  }

  try {
    // Validate service exists
    const serviceCheck = await pool.query(
      'SELECT id FROM services WHERE id = $1',
      [service_id]
    );
    if (serviceCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // DO NOTHING on conflict — prevents duplicates silently
    await pool.query(
      `INSERT INTO employee_services (firebase_uid, service_id, proficiency)
       VALUES ($1, $2, $3)
       ON CONFLICT (firebase_uid, service_id) DO NOTHING`,
      [req.user.uid, service_id, proficiency || 'beginner']
    );

    res.status(201).json({ success: true, message: 'Skill added' });
  } catch (err) {
    console.error('addEmployeeService error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/employees/services/custom — create a new service and add to current user
// Used when employee types a skill that doesn't exist in the services table yet
const addCustomSkill = async (req, res) => {
  const { title, proficiency } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'title is required' });
  }

  const trimmedTitle = title.trim();

  try {
    // Step 1: Check if a service with this title already exists (case-insensitive)
    // If yes, reuse it instead of creating a duplicate service
    let serviceId;
    const existing = await pool.query(
      'SELECT id FROM services WHERE LOWER(title) = LOWER($1)',
      [trimmedTitle]
    );

    if (existing.rows.length > 0) {
      // Service already exists — just use its id
      serviceId = existing.rows[0].id;
    } else {
      // Step 2: Create new service in services table
      // created_by = current user's firebase_uid
      const newService = await pool.query(
        `INSERT INTO services (title, description, category, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [trimmedTitle, '', 'Custom', req.user.uid]
      );
      serviceId = newService.rows[0].id;
    }

    // Step 3: Add to employee_services — DO NOTHING if already linked
    await pool.query(
      `INSERT INTO employee_services (firebase_uid, service_id, proficiency)
       VALUES ($1, $2, $3)
       ON CONFLICT (firebase_uid, service_id) DO NOTHING`,
      [req.user.uid, serviceId, proficiency || 'beginner']
    );

    res.status(201).json({ success: true, message: 'Custom skill added', service_id: serviceId });
  } catch (err) {
    console.error('addCustomSkill error:', err.message);
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

module.exports = {
  getAllEmployees,
  getEmployeeByUid,
  addEmployeeService,
  addCustomSkill,
  removeEmployeeService,
};