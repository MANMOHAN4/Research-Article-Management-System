const pool = require("../db/config");

/**
 * Get all conferences
 */
const getAllConferences = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        c.*,
        COUNT(ra.ArticleID) as ArticleCount
      FROM Conference c
      LEFT JOIN ResearchArticle ra ON c.ConferenceID = ra.ConferenceID
      GROUP BY c.ConferenceID
      ORDER BY c.StartDate DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching conferences:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get conference by ID with articles
 */
const getConferenceById = async (req, res) => {
  try {
    const [conference] = await pool.query(
      "SELECT * FROM Conference WHERE ConferenceID = ?",
      [req.params.id]
    );

    if (conference.length === 0) {
      return res.status(404).json({ error: "Conference not found" });
    }

    const [articles] = await pool.query(
      `
      SELECT 
        ra.*,
        GROUP_CONCAT(
          DISTINCT COALESCE(u.Username, a.Name) 
          ORDER BY a.Name 
          SEPARATOR ', '
        ) AS Authors
      FROM ResearchArticle ra
      LEFT JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
      LEFT JOIN Author a ON aa.AuthorID = a.AuthorID
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      WHERE ra.ConferenceID = ?
      GROUP BY ra.ArticleID
      ORDER BY ra.SubmissionDate DESC
      `,
      [req.params.id]
    );

    res.json({ ...conference[0], articles });
  } catch (err) {
    console.error("Error fetching conference:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create conference
 */
const createConference = async (req, res) => {
  const { name, location, startDate, endDate } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({
      error: "Start date must be before end date",
    });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO Conference (Name, Location, StartDate, EndDate) VALUES (?, ?, ?, ?)",
      [name, location || null, startDate || null, endDate || null]
    );

    const [conference] = await pool.query(
      "SELECT * FROM Conference WHERE ConferenceID = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Conference created successfully",
      conference: conference[0],
    });
  } catch (err) {
    console.error("Error creating conference:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update conference
 */
const updateConference = async (req, res) => {
  const { name, location, startDate, endDate } = req.body;

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({
      error: "Start date must be before end date",
    });
  }

  try {
    const [result] = await pool.query(
      "UPDATE Conference SET Name = ?, Location = ?, StartDate = ?, EndDate = ? WHERE ConferenceID = ?",
      [name, location || null, startDate || null, endDate || null, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Conference not found" });
    }

    const [conference] = await pool.query(
      "SELECT * FROM Conference WHERE ConferenceID = ?",
      [req.params.id]
    );

    res.json({
      message: "Conference updated successfully",
      conference: conference[0],
    });
  } catch (err) {
    console.error("Error updating conference:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete conference — Admin only (enforced by requireAdmin middleware in router)
 * SET NULL in ResearchArticle due to ON DELETE SET NULL
 */
const deleteConference = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM Conference WHERE ConferenceID = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Conference not found" });
    }

    res.json({
      message:
        "Conference deleted successfully. Articles in this conference now have ConferenceID set to NULL.",
      deletedBy: req.adminUserId,
    });
  } catch (err) {
    console.error("Error deleting conference:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllConferences,
  getConferenceById,
  createConference,
  updateConference,
  deleteConference,
};
