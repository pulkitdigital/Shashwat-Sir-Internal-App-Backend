const pool = require('../config/db');

// GET /api/services — all services with employee count
const getAllServices = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*,
        u.full_name AS created_by_name,
        COUNT(DISTINCT es.firebase_uid) AS employee_count
       FROM services s
       LEFT JOIN users u ON s.created_by = u.firebase_uid
       LEFT JOIN employee_services es ON s.id = es.service_id
       GROUP BY s.id, u.full_name
       ORDER BY s.created_at DESC`
    );
    res.json({ success: true, services: result.rows });
  } catch (err) {
    console.error('getAllServices error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/services/:id — single service with employees + resources
const getServiceById = async (req, res) => {
  const { id } = req.params;
  try {
    const serviceResult = await pool.query(
      `SELECT s.*, u.full_name AS created_by_name
       FROM services s
       LEFT JOIN users u ON s.created_by = u.firebase_uid
       WHERE s.id = $1`,
      [id]
    );

    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const employeesResult = await pool.query(
      `SELECT u.firebase_uid, u.full_name, u.designation, u.avatar_url, es.proficiency
       FROM employee_services es
       JOIN users u ON es.firebase_uid = u.firebase_uid
       WHERE es.service_id = $1`,
      [id]
    );

    const resourcesResult = await pool.query(
      'SELECT * FROM resources WHERE service_id = $1 ORDER BY created_at DESC',
      [id]
    );

    res.json({
      success:   true,
      service:   serviceResult.rows[0],
      employees: employeesResult.rows,
      resources: resourcesResult.rows,
    });
  } catch (err) {
    console.error('getServiceById error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/services — create new service
const createService = async (req, res) => {
  const { title, description, category } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, message: 'Title is required' });
  }

  try {
    const insertResult = await pool.query(
      `INSERT INTO services (title, description, category, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [title, description, category, req.user.uid]
    );

    // ✅ creator name ke saath full row fetch karo
    const serviceResult = await pool.query(
      `SELECT s.*, u.full_name AS created_by_name,
              0 AS employee_count
       FROM services s
       LEFT JOIN users u ON s.created_by = u.firebase_uid
       WHERE s.id = $1`,
      [insertResult.rows[0].id]
    );

    res.status(201).json({ success: true, service: serviceResult.rows[0] });
  } catch (err) {
    console.error('createService error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/services/:id — only creator can update
const updateService = async (req, res) => {
  const { id } = req.params;
  const { title, description, category } = req.body;

  try {
    // ✅ Creator check
    const ownerCheck = await pool.query(
      'SELECT created_by FROM services WHERE id = $1',
      [id]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (ownerCheck.rows[0].created_by !== req.user.uid) {
      return res.status(403).json({ success: false, message: 'Sirf creator hi edit kar sakta hai' });
    }

    const result = await pool.query(
      `UPDATE services
       SET title       = COALESCE($1, title),
           description = COALESCE($2, description),
           category    = COALESCE($3, category),
           updated_at  = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [title, description, category, id]
    );

    res.json({ success: true, service: result.rows[0] });
  } catch (err) {
    console.error('updateService error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/services/:id — admin only
const deleteService = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM services WHERE id = $1', [id]);
    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (err) {
    console.error('deleteService error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllServices, getServiceById, createService, updateService, deleteService };