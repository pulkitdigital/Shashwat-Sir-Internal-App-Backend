const pool = require('../config/db');

// GET /api/resources
const getAllResources = async (req, res) => {
  const { service_id } = req.query;

  try {
    let query = `
      SELECT r.*, s.title AS service_title, u.full_name AS added_by_name
      FROM resources r
      LEFT JOIN services s ON r.service_id = s.id
      LEFT JOIN users u ON r.added_by = u.firebase_uid
    `;
    const params = [];

    if (service_id) {
      query += ' WHERE r.service_id = $1';
      params.push(service_id);
    }

    query += ' ORDER BY r.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, resources: result.rows });
  } catch (err) {
    console.error('getAllResources error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/resources — any employee can add
const createResource = async (req, res) => {
  const { title, description, url, resource_type, service_id } = req.body;

  if (!title || !url) {
    return res.status(400).json({ success: false, message: 'Title and URL are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO resources (title, description, url, resource_type, service_id, added_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description, url, resource_type || 'video', service_id, req.user.uid]
    );

    res.status(201).json({ success: true, resource: result.rows[0] });
  } catch (err) {
    console.error('createResource error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/resources/:id — admin only
const deleteResource = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM resources WHERE id = $1', [id]);
    res.json({ success: true, message: 'Resource deleted' });
  } catch (err) {
    console.error('deleteResource error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getAllResources, createResource, deleteResource };