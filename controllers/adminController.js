const pool  = require('../config/db');
const admin = require('../config/firebase');

// GET /api/admin/stats
const getDashboardStats = async (req, res) => {
  try {
    const [employees, services, resources, learningInterests] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'employee'"),
      pool.query('SELECT COUNT(*) FROM services'),
      pool.query('SELECT COUNT(*) FROM resources'),
      pool.query('SELECT COUNT(*) FROM learning_interests'),
    ]);

    const topWanted = await pool.query(
      `SELECT s.title, COUNT(li.firebase_uid) AS interest_count
       FROM learning_interests li
       JOIN services s ON li.service_id = s.id
       GROUP BY s.id, s.title
       ORDER BY interest_count DESC
       LIMIT 5`
    );

    // ✅ FIXED: DISTINCT add kiya — duplicate services nahi aayengi
    // ✅ FIXED: expert proficiency check — sirf tab skill gap jab koi expert na ho
    const skillGap = await pool.query(
      `SELECT DISTINCT s.id, s.title
       FROM services s
       LEFT JOIN employee_services es
         ON s.id = es.service_id AND es.proficiency = 'expert'
       WHERE es.id IS NULL
       ORDER BY s.title`
    );

    res.json({
      success: true,
      stats: {
        total_employees:      parseInt(employees.rows[0].count),
        total_services:       parseInt(services.rows[0].count),
        total_resources:      parseInt(resources.rows[0].count),
        total_learning_marks: parseInt(learningInterests.rows[0].count),
        top_wanted_services:  topWanted.rows,
        skill_gaps:           skillGap.rows,
      },
    });
  } catch (err) {
    console.error('getDashboardStats error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/admin/users
const getAllUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json({ success: true, users: result.rows });
  } catch (err) {
    console.error('getAllUsers error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/admin/users/:uid/role
const updateUserRole = async (req, res) => {
  const { uid }  = req.params;
  const { role } = req.body;

  if (!['employee', 'admin'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role. Use employee or admin' });
  }

  try {
    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE firebase_uid = $2 RETURNING *',
      [role, uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('updateUserRole error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/admin/users/:uid/profile — admin kisi bhi employee ka profile update kar sake
const updateUserProfile = async (req, res) => {
  const { uid } = req.params;
  const { full_name, designation, department, phone } = req.body;

  if (!full_name && !designation && !department && !phone) {
    return res.status(400).json({ success: false, message: 'Koi bhi field update ke liye nahi di' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET
         full_name   = COALESCE($1, full_name),
         designation = COALESCE($2, designation),
         department  = COALESCE($3, department),
         phone       = COALESCE($4, phone),
         updated_at  = CURRENT_TIMESTAMP
       WHERE firebase_uid = $5
       RETURNING *`,
      [
        full_name   || null,
        designation || null,
        department  || null,
        phone       || null,
        uid,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('updateUserProfile error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/admin/users/:uid — Firebase Auth + PostgreSQL dono se delete
const deleteUser = async (req, res) => {
  const { uid } = req.params;

  try {
    try {
      await admin.auth().deleteUser(uid);
    } catch (firebaseErr) {
      if (firebaseErr.code !== 'auth/user-not-found') {
        console.error('Firebase Auth delete error:', firebaseErr.message);
        return res.status(500).json({ success: false, message: 'Firebase delete failed' });
      }
      console.warn(`Firebase user ${uid} not found — skipping Auth delete`);
    }

    await pool.query('DELETE FROM users WHERE firebase_uid = $1', [uid]);

    res.json({ success: true, message: 'User deleted from Auth and database' });
  } catch (err) {
    console.error('deleteUser error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getDashboardStats,
  getAllUsers,
  updateUserRole,
  updateUserProfile,
  deleteUser,
};