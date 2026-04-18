const pool = require('../config/db');

// POST /api/auth/register
// Called after Firebase signup — saves user to PostgreSQL
const registerUser = async (req, res) => {
  const { firebase_uid, email, full_name, designation, department, phone } = req.body;

  if (!firebase_uid || !email || !full_name) {
    return res.status(400).json({ success: false, message: 'firebase_uid, email, and full_name are required' });
  }

  try {
    // Upsert: insert or update if already exists
    const result = await pool.query(
      `INSERT INTO users (firebase_uid, email, full_name, designation, department, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (firebase_uid) DO UPDATE
         SET email       = EXCLUDED.email,
             full_name   = EXCLUDED.full_name,
             updated_at  = CURRENT_TIMESTAMP
       RETURNING *`,
      [firebase_uid, email, full_name, designation, department, phone]
    );

    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('registerUser error:', err.message);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// GET /api/auth/me
// Returns current user's DB profile
// ✅ Auto-creates user in PostgreSQL if Firebase user exists but DB record missing
const getMe = async (req, res) => {
  try {
    let result = await pool.query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    // ✅ User DB mein nahi hai — Firebase token se auto-create karo
    // Yeh tab hota hai jab register API call fail ho gayi ho ya purana account ho
    if (result.rows.length === 0) {
      console.log(`Auto-creating DB record for Firebase user: ${req.user.uid}`);
      result = await pool.query(
        `INSERT INTO users (firebase_uid, email, full_name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [
          req.user.uid,
          req.user.email,
          req.user.name || req.user.email.split('@')[0], // fallback: email se naam lo
        ]
      );
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('getMe error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { registerUser, getMe };