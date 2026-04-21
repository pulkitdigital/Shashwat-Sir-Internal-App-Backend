const pool = require('../config/db');
const admin = require('../config/firebase'); // Firebase Admin SDK

// POST /api/auth/register
const registerUser = async (req, res) => {
  const { firebase_uid, email, full_name, designation, department, phone } = req.body;

  if (!firebase_uid || !email || !full_name) {
    return res.status(400).json({ success: false, message: 'firebase_uid, email, and full_name are required' });
  }

  try {
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
const getMe = async (req, res) => {
  try {
    let result = await pool.query(
      'SELECT * FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (result.rows.length === 0) {
      console.log(`Auto-creating DB record for Firebase user: ${req.user.uid}`);
      result = await pool.query(
        `INSERT INTO users (firebase_uid, email, full_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (email) DO UPDATE
           SET firebase_uid = EXCLUDED.firebase_uid,
               updated_at   = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          req.user.uid,
          req.user.email,
          req.user.name || req.user.email.split('@')[0],
        ]
      );
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('getMe error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/check-email
// Step 1 — Check if email exists in DB
const checkEmail = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  try {
    const result = await pool.query(
      'SELECT firebase_uid, full_name FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No account found with this email.' });
    }

    res.json({ success: true, message: 'Email found.' });
  } catch (err) {
    console.error('checkEmail error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/auth/reset-password
// Step 2 — Reset password directly via Firebase Admin SDK
const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ success: false, message: 'Email and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  try {
    // Check email exists in DB
    const result = await pool.query(
      'SELECT firebase_uid FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No account found with this email.' });
    }

    const { firebase_uid } = result.rows[0];

    // Update password in Firebase using Admin SDK
    await admin.auth().updateUser(firebase_uid, { password: newPassword });

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    console.error('resetPassword error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to reset password. Please try again.' });
  }
};

module.exports = { registerUser, getMe, checkEmail, resetPassword };