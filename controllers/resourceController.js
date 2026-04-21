const pool               = require("../config/db");
const { uploadPdfToDrive } = require("../utils/driveUpload");

// ─── GET /api/resources ───────────────────────────────────────────────────────
// Optional query param: ?service_id=5
const getAllResources = async (req, res) => {
  try {
    const { service_id } = req.query;

    let query = `
      SELECT
        r.id,
        r.title,
        r.description,
        r.url,
        r.pdf_url,
        r.resource_type,
        r.service_id,
        r.added_by,
        r.created_at,
        s.title        AS service_title,
        u.full_name    AS added_by_name
      FROM resources r
      LEFT JOIN services s ON s.id = r.service_id
      LEFT JOIN users   u ON u.firebase_uid = r.added_by
    `;

    const values = [];
    if (service_id) {
      query += ` WHERE r.service_id = $1`;
      values.push(service_id);
    }
    query += ` ORDER BY r.created_at DESC`;

    const result = await pool.query(query, values);
    res.json({ resources: result.rows });
  } catch (err) {
    console.error("getAllResources error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─── POST /api/resources/upload-pdf ──────────────────────────────────────────
// Accepts multipart/form-data with a single field "pdf"
// Returns { url } — the Google Drive public view link
const uploadPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file received." });
    }
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Only PDF files are allowed." });
    }
    if (req.file.size > 20 * 1024 * 1024) {
      return res.status(400).json({ error: "File must be smaller than 20 MB." });
    }

    const driveUrl = await uploadPdfToDrive(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.status(201).json({ url: driveUrl });
  } catch (err) {
    //console.error("uploadPdf error:", err.message);
    console.error("uploadPdf error:", err.response?.data || err.message);
    res.status(500).json({ error: "PDF upload to Google Drive failed." });
  }
};

// ─── POST /api/resources ──────────────────────────────────────────────────────
const createResource = async (req, res) => {
  try {
    const { title, description, url, resource_type, service_id, pdf_url } = req.body;
    const added_by = req.user.uid;

    if (!title || !url) {
      return res.status(400).json({ error: "Title and URL are required." });
    }

    const result = await pool.query(
      `INSERT INTO resources (title, description, url, resource_type, service_id, added_by, pdf_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title,
        description || null,
        url,
        resource_type || "other",
        service_id   || null,
        added_by,
        pdf_url      || null,   // Drive URL for article's attached PDF
      ]
    );

    // Return enriched row so UI doesn't need to re-fetch
    const enriched = await pool.query(
      `SELECT
         r.*,
         s.title     AS service_title,
         u.full_name AS added_by_name
       FROM resources r
       LEFT JOIN services s ON s.id = r.service_id
       LEFT JOIN users   u ON u.firebase_uid = r.added_by
       WHERE r.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({ resource: enriched.rows[0] });
  } catch (err) {
    console.error("createResource error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// ─── DELETE /api/resources/:id ────────────────────────────────────────────────
const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await pool.query(`SELECT id FROM resources WHERE id = $1`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Resource not found." });
    }
    await pool.query(`DELETE FROM resources WHERE id = $1`, [id]);
    res.json({ message: "Resource deleted successfully." });
  } catch (err) {
    console.error("deleteResource error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { getAllResources, uploadPdf, createResource, deleteResource };