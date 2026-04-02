const pool = require("../db/config");

/**
 * Get all journals
 */
const getAllJournals = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        j.*,
        COUNT(ra.ArticleID) as ArticleCount
      FROM Journal j
      LEFT JOIN ResearchArticle ra ON j.JournalID = ra.JournalID
      GROUP BY j.JournalID
      ORDER BY j.Name
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching journals:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get journal by ID with articles
 */
const getJournalById = async (req, res) => {
  try {
    const [journal] = await pool.query(
      "SELECT * FROM Journal WHERE JournalID = ?",
      [req.params.id]
    );

    if (journal.length === 0) {
      return res.status(404).json({ error: "Journal not found" });
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
      WHERE ra.JournalID = ?
      GROUP BY ra.ArticleID
      ORDER BY ra.SubmissionDate DESC
      `,
      [req.params.id]
    );

    res.json({ ...journal[0], articles });
  } catch (err) {
    console.error("Error fetching journal:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create journal
 */
const createJournal = async (req, res) => {
  const { name, publisher, issn, impactFactor } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO Journal (Name, Publisher, ISSN, ImpactFactor) VALUES (?, ?, ?, ?)",
      [name, publisher || null, issn || null, impactFactor || null]
    );

    const [journal] = await pool.query(
      "SELECT * FROM Journal WHERE JournalID = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: "Journal created successfully",
      journal: journal[0],
    });
  } catch (err) {
    console.error("Error creating journal:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update journal
 */
const updateJournal = async (req, res) => {
  const { name, publisher, issn, impactFactor } = req.body;

  try {
    const [result] = await pool.query(
      "UPDATE Journal SET Name = ?, Publisher = ?, ISSN = ?, ImpactFactor = ? WHERE JournalID = ?",
      [name, publisher || null, issn || null, impactFactor || null, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Journal not found" });
    }

    const [journal] = await pool.query(
      "SELECT * FROM Journal WHERE JournalID = ?",
      [req.params.id]
    );

    res.json({
      message: "Journal updated successfully",
      journal: journal[0],
    });
  } catch (err) {
    console.error("Error updating journal:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete journal — Admin only (enforced by requireAdmin middleware in router)
 * SET NULL in ResearchArticle due to ON DELETE SET NULL
 */
const deleteJournal = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM Journal WHERE JournalID = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Journal not found" });
    }

    res.json({
      message:
        "Journal deleted successfully. Articles in this journal now have JournalID set to NULL.",
      deletedBy: req.adminUserId,
    });
  } catch (err) {
    console.error("Error deleting journal:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllJournals,
  getJournalById,
  createJournal,
  updateJournal,
  deleteJournal,
};
