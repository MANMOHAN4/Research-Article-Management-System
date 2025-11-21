const pool = require("../db/config");

const getCitationsByArticle = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT c.*, ra.Title AS CitedTitle, ra.DOI AS CitedDOI,
             ra.SubmissionDate AS CitedDate
      FROM Citation c
      JOIN ResearchArticle ra ON c.CitedArticleID = ra.ArticleID
      WHERE c.CitingArticleID = ?
      ORDER BY c.CitationDate DESC
      `,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching citations:", err);
    res.status(500).json({ error: err.message });
  }
};

const getCitedByArticle = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT c.*, ra.Title AS CitingTitle, ra.DOI AS CitingDOI,
             ra.SubmissionDate AS CitingDate
      FROM Citation c
      JOIN ResearchArticle ra ON c.CitingArticleID = ra.ArticleID
      WHERE c.CitedArticleID = ?
      ORDER BY c.CitationDate DESC
      `,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching cited-by:", err);
    res.status(500).json({ error: err.message });
  }
};

const createCitation = async (req, res) => {
  const { citingArticleId, citedArticleId, citationDate } = req.body;

  console.log("Received citation data:", {
    citingArticleId,
    citedArticleId,
    citationDate,
  });

  if (!citingArticleId || !citedArticleId) {
    return res.status(400).json({
      error: "Both citingArticleId and citedArticleId are required",
    });
  }

  if (citingArticleId === citedArticleId) {
    return res.status(400).json({
      error: "An article cannot cite itself",
    });
  }

  try {
    const [existing] = await pool.query(
      "SELECT * FROM Citation WHERE CitingArticleID = ? AND CitedArticleID = ?",
      [citingArticleId, citedArticleId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Citation already exists" });
    }

    const [citingArticle] = await pool.query(
      "SELECT ArticleID FROM ResearchArticle WHERE ArticleID = ?",
      [citingArticleId]
    );

    const [citedArticle] = await pool.query(
      "SELECT ArticleID FROM ResearchArticle WHERE ArticleID = ?",
      [citedArticleId]
    );

    if (citingArticle.length === 0) {
      return res.status(404).json({ error: "Citing article not found" });
    }

    if (citedArticle.length === 0) {
      return res.status(404).json({ error: "Cited article not found" });
    }

    const [result] = await pool.query(
      "INSERT INTO Citation (CitingArticleID, CitedArticleID, CitationDate) VALUES (?, ?, ?)",
      [
        citingArticleId,
        citedArticleId,
        citationDate || new Date().toISOString().split("T")[0],
      ]
    );

    const [citation] = await pool.query(
      `
      SELECT c.*, ra.Title AS CitedTitle, ra.DOI AS CitedDOI
      FROM Citation c
      JOIN ResearchArticle ra ON c.CitedArticleID = ra.ArticleID
      WHERE c.CitationID = ?
      `,
      [result.insertId]
    );

    res.status(201).json({
      message: "Citation added successfully",
      citation: citation[0],
    });
  } catch (err) {
    console.error("Error adding citation:", err);
    res.status(500).json({
      error: "Failed to add citation",
      message: err.message,
    });
  }
};

const deleteCitation = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM Citation WHERE CitationID = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Citation not found" });
    }

    res.json({ message: "Citation deleted successfully" });
  } catch (err) {
    console.error("Error deleting citation:", err);
    res.status(500).json({ error: err.message });
  }
};

const getCitationStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        ra.ArticleID,
        ra.Title,
        ra.DOI,
        COUNT(c.CitationID) AS CitationCount
      FROM ResearchArticle ra
      LEFT JOIN Citation c ON ra.ArticleID = c.CitedArticleID
      GROUP BY ra.ArticleID, ra.Title, ra.DOI
      HAVING CitationCount > 0
      ORDER BY CitationCount DESC
      LIMIT 10
    `);
    res.json(stats);
  } catch (err) {
    console.error("Error fetching citation stats:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getCitationsByArticle,
  getCitedByArticle,
  createCitation,
  deleteCitation,
  getCitationStats,
};
