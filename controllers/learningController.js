const pool = require('../config/db');

// GET /api/learning — current user's learning interests
const getMyLearning = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT li.*, s.title, s.description, s.category
       FROM learning_interests li
       JOIN services s ON li.service_id = s.id
       WHERE li.firebase_uid = $1
       ORDER BY li.added_at DESC`,
      [req.user.uid]
    );

    res.json({ success: true, learning: result.rows });
  } catch (err) {
    console.error('getMyLearning error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/learning/all — all learning interests (admin: see everyone's)
const getAllLearning = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT li.*, s.title AS service_title,
              u.full_name, u.email, u.designation
       FROM learning_interests li
       JOIN services s ON li.service_id = s.id
       JOIN users u ON li.firebase_uid = u.firebase_uid
       ORDER BY li.added_at DESC`
    );

    res.json({ success: true, learning: result.rows });
  } catch (err) {
    console.error('getAllLearning error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/learning — mark interest in a service
const addLearningInterest = async (req, res) => {
  const { service_id, status } = req.body;

  if (!service_id) {
    return res.status(400).json({ success: false, message: 'service_id is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO learning_interests (firebase_uid, service_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (firebase_uid, service_id)
       DO UPDATE SET status = EXCLUDED.status
       RETURNING *`,
      [req.user.uid, service_id, status || 'interested']
    );

    res.status(201).json({ success: true, record: result.rows[0] });
  } catch (err) {
    console.error('addLearningInterest error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PUT /api/learning/:serviceId — update status
const updateLearningStatus = async (req, res) => {
  const { serviceId } = req.params;
  const { status } = req.body;

  try {
    const result = await pool.query(
      `UPDATE learning_interests SET status = $1
       WHERE firebase_uid = $2 AND service_id = $3
       RETURNING *`,
      [status, req.user.uid, serviceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Learning interest not found' });
    }

    res.json({ success: true, record: result.rows[0] });
  } catch (err) {
    console.error('updateLearningStatus error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/learning/:serviceId
const removeLearningInterest = async (req, res) => {
  const { serviceId } = req.params;

  try {
    await pool.query(
      'DELETE FROM learning_interests WHERE firebase_uid = $1 AND service_id = $2',
      [req.user.uid, serviceId]
    );

    res.json({ success: true, message: 'Learning interest removed' });
  } catch (err) {
    console.error('removeLearningInterest error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /learning/custom — { title }
const addCustomLearning = async (req, res) => {
  const { title } = req.body;
  const firebase_uid = req.user.uid;

  if (!title?.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }

  try {
    // Pehle check karo: kya is title ka service already exist karta hai?
    let serviceResult = await pool.query(
      `SELECT id FROM services WHERE LOWER(title) = LOWER($1) LIMIT 1`,
      [title.trim()]
    );

    let service_id;

    if (serviceResult.rows.length > 0) {
      // Service exist karti hai — use karo
      service_id = serviceResult.rows[0].id;
    } else {
      // Nahi hai — create karo
      const newService = await pool.query(
        `INSERT INTO services (title, created_by) VALUES ($1, $2) RETURNING id`,
        [title.trim(), firebase_uid]
      );
      service_id = newService.rows[0].id;
    }

    // Ab learning interest add karo (duplicate ignore)
    await pool.query(
      `INSERT INTO learning_interests (firebase_uid, service_id, status)
       VALUES ($1, $2, 'interested')
       ON CONFLICT (firebase_uid, service_id) DO NOTHING`,
      [firebase_uid, service_id]
    );

    res.status(201).json({ message: "Added to learning interests", service_id });
  } catch (err) {
    console.error("addCustomLearning error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};


module.exports = { getMyLearning, getAllLearning, addCustomLearning, addLearningInterest, updateLearningStatus, removeLearningInterest };