const pool = require('../config/db');

// GET /api/users/profile
const getProfile = async (req, res) => {
  try {
    // FIX: Use subqueries instead of double LEFT JOIN to avoid cross-product
    // that causes json_agg to produce duplicate entries even with DISTINCT
    const result = await pool.query(
      `SELECT u.*,
        (
          SELECT COALESCE(json_agg(DISTINCT jsonb_build_object(
            'service_id', es.service_id,
            'title', s.title,
            'proficiency', es.proficiency
          )), '[]'::json)
          FROM employee_services es
          JOIN services s ON es.service_id = s.id
          WHERE es.firebase_uid = u.firebase_uid
        ) AS known_services,
        (
          SELECT COALESCE(json_agg(DISTINCT jsonb_build_object(
            'service_id', li.service_id,
            'title', ls.title,
            'status', li.status
          )), '[]'::json)
          FROM learning_interests li
          JOIN services ls ON li.service_id = ls.id
          WHERE li.firebase_uid = u.firebase_uid
        ) AS learning_interests
       FROM users u
       WHERE u.firebase_uid = $1`,
      [req.user.uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Profile not found' });
    }

    res.json({ success: true, profile: result.rows[0] });
  } catch (err) {
    console.error('getProfile error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/users/profile
const updateProfile = async (req, res) => {
  const { full_name, designation, department, phone, avatar_url } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users
       SET full_name   = COALESCE($1, full_name),
           designation = COALESCE($2, designation),
           department  = COALESCE($3, department),
           phone       = COALESCE($4, phone),
           avatar_url  = COALESCE($5, avatar_url),
           updated_at  = CURRENT_TIMESTAMP
       WHERE firebase_uid = $6
       RETURNING *`,
      [full_name, designation, department, phone, avatar_url, req.user.uid]
    );

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('updateProfile error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getProfile, updateProfile };