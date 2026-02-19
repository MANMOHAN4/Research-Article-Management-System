const pool = require("../db/config");

/**
 * Get citations by article (articles that this article cites)
 */
const getCitationsByArticle = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        c.*,
        ra.Title AS CitedTitle,
        ra.DOI AS CitedDOI,
        ra.SubmissionDate AS CitedDate,
        ra.Status AS CitedStatus
      FROM Citation c
      JOIN ResearchArticle ra ON c.CitedArticleID = ra.ArticleID
      WHERE c.CitingArticleID = ?
      ORDER BY ra.SubmissionDate DESC
      `,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching citations:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get cited-by articles (articles that cite this article)
 */
const getCitedByArticle = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        c.*,
        ra.Title AS CitingTitle,
        ra.DOI AS CitingDOI,
        ra.SubmissionDate AS CitingDate,
        ra.Status AS CitingStatus
      FROM Citation c
      JOIN ResearchArticle ra ON c.CitingArticleID = ra.ArticleID
      WHERE c.CitedArticleID = ?
      ORDER BY ra.SubmissionDate DESC
      `,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching cited-by:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create citation
 */
const createCitation = async (req, res) => {
  const { citingArticleId, citedArticleId } = req.body;

  console.log("Received citation data:", {
    citingArticleId,
    citedArticleId,
  });

  // Validation
  if (!citingArticleId || !citedArticleId) {
    return res.status(400).json({
      error: "Both citingArticleId and citedArticleId are required",
    });
  }

  // Self-citation check (trigger will also catch this)
  if (citingArticleId === citedArticleId) {
    return res.status(400).json({
      error: "An article cannot cite itself",
    });
  }

  try {
    // Check if citation already exists
    const [existing] = await pool.query(
      "SELECT CitationID FROM Citation WHERE CitingArticleID = ? AND CitedArticleID = ?",
      [citingArticleId, citedArticleId],
    );

    if (existing.length > 0) {
      return res.status(400).json({
        error: "Citation already exists",
        citationId: existing[0].CitationID,
      });
    }

    // Verify both articles exist
    const [citingArticle] = await pool.query(
      "SELECT ArticleID FROM ResearchArticle WHERE ArticleID = ?",
      [citingArticleId],
    );

    if (citingArticle.length === 0) {
      return res.status(404).json({ error: "Citing article not found" });
    }

    const [citedArticle] = await pool.query(
      "SELECT ArticleID FROM ResearchArticle WHERE ArticleID = ?",
      [citedArticleId],
    );

    if (citedArticle.length === 0) {
      return res.status(404).json({ error: "Cited article not found" });
    }

    // Create citation
    const [result] = await pool.query(
      "INSERT INTO Citation (CitingArticleID, CitedArticleID) VALUES (?, ?)",
      [citingArticleId, citedArticleId],
    );

    // Return created citation with article details
    const [citation] = await pool.query(
      `
      SELECT 
        c.*,
        citing.Title AS CitingTitle,
        citing.DOI AS CitingDOI,
        cited.Title AS CitedTitle,
        cited.DOI AS CitedDOI
      FROM Citation c
      JOIN ResearchArticle citing ON c.CitingArticleID = citing.ArticleID
      JOIN ResearchArticle cited ON c.CitedArticleID = cited.ArticleID
      WHERE c.CitationID = ?
      `,
      [result.insertId],
    );

    res.status(201).json({
      message: "Citation added successfully",
      citation: citation[0],
    });
  } catch (err) {
    console.error("Error adding citation:", err);

    // Handle trigger error for self-citation
    if (
      err.sqlState === "45000" &&
      err.sqlMessage.includes("cannot cite itself")
    ) {
      return res.status(400).json({
        error: err.sqlMessage,
      });
    }

    res.status(500).json({
      error: "Failed to add citation",
      message: err.message,
    });
  }
};

/**
 * Delete citation
 */
const deleteCitation = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM Citation WHERE CitationID = ?",
      [req.params.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Citation not found" });
    }

    res.json({
      message: "Citation deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting citation:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get citation statistics - most cited articles
 */
const getCitationStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        ra.ArticleID,
        ra.Title,
        ra.DOI,
        ra.SubmissionDate,
        COUNT(c.CitationID) AS CitationCount,
        GROUP_CONCAT(
          DISTINCT COALESCE(u.Username, a.Name) 
          ORDER BY a.Name 
          SEPARATOR ', '
        ) AS Authors
      FROM ResearchArticle ra
      LEFT JOIN Citation c ON ra.ArticleID = c.CitedArticleID
      LEFT JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
      LEFT JOIN Author a ON aa.AuthorID = a.AuthorID
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      GROUP BY ra.ArticleID, ra.Title, ra.DOI, ra.SubmissionDate
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

/**
 * Get citation network for an article (both citing and cited)
 */
const getCitationNetwork = async (req, res) => {
  try {
    // Get articles this one cites
    const [citedBy] = await pool.query(
      `
      SELECT 
        'cites' as RelationType,
        ra.ArticleID,
        ra.Title,
        ra.DOI
      FROM Citation c
      JOIN ResearchArticle ra ON c.CitedArticleID = ra.ArticleID
      WHERE c.CitingArticleID = ?
      `,
      [req.params.id],
    );

    // Get articles that cite this one
    const [cites] = await pool.query(
      `
      SELECT 
        'cited_by' as RelationType,
        ra.ArticleID,
        ra.Title,
        ra.DOI
      FROM Citation c
      JOIN ResearchArticle ra ON c.CitingArticleID = ra.ArticleID
      WHERE c.CitedArticleID = ?
      `,
      [req.params.id],
    );

    res.json({
      articleId: parseInt(req.params.id),
      cites: citedBy,
      citedBy: cites,
      totalCitations: citedBy.length,
      totalCitedBy: cites.length,
    });
  } catch (err) {
    console.error("Error fetching citation network:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getCitationsByArticle,
  getCitedByArticle,
  createCitation,
  deleteCitation,
  getCitationStats,
  getCitationNetwork,
};
