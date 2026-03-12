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
        ra.Status AS CitedStatus,
        GROUP_CONCAT(
          DISTINCT COALESCE(u.Username, a.Name) 
          ORDER BY a.Name 
          SEPARATOR ', '
        ) AS CitedAuthors
      FROM Citation c
      JOIN ResearchArticle ra ON c.CitedArticleID = ra.ArticleID
      LEFT JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
      LEFT JOIN Author a ON aa.AuthorID = a.AuthorID
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      WHERE c.CitingArticleID = ?
      GROUP BY c.CitationID
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
        ra.Status AS CitingStatus,
        GROUP_CONCAT(
          DISTINCT COALESCE(u.Username, a.Name) 
          ORDER BY a.Name 
          SEPARATOR ', '
        ) AS CitingAuthors
      FROM Citation c
      JOIN ResearchArticle ra ON c.CitingArticleID = ra.ArticleID
      LEFT JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
      LEFT JOIN Author a ON aa.AuthorID = a.AuthorID
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      WHERE c.CitedArticleID = ?
      GROUP BY c.CitationID
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
 * UPDATED: Handles CHECK constraint instead of trigger for self-citation prevention
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

  // Pre-validation for better user experience
  // (CHECK constraint will also prevent this, but we provide better error message)
  if (citingArticleId === citedArticleId) {
    return res.status(400).json({
      error: "An article cannot cite itself",
      details: "The citing article and cited article must be different",
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
        details: "This citation relationship has already been recorded",
      });
    }

    // Verify both articles exist
    const [citingArticle] = await pool.query(
      "SELECT ArticleID, Title FROM ResearchArticle WHERE ArticleID = ?",
      [citingArticleId],
    );

    if (citingArticle.length === 0) {
      return res.status(404).json({
        error: "Citing article not found",
        articleId: citingArticleId,
      });
    }

    const [citedArticle] = await pool.query(
      "SELECT ArticleID, Title FROM ResearchArticle WHERE ArticleID = ?",
      [citedArticleId],
    );

    if (citedArticle.length === 0) {
      return res.status(404).json({
        error: "Cited article not found",
        articleId: citedArticleId,
      });
    }

    // ================================================================
    // PARTITION JOIN OPTIMIZATION:
    // NO NEED for trigger to check self-citation!
    // The CHECK constraint chk_no_self_citation handles this automatically
    // ================================================================

    // Old code (REMOVED - trigger is gone):
    // Trigger used to check: IF NEW.CitingArticleID = NEW.CitedArticleID THEN SIGNAL...

    // Create citation - CHECK constraint will automatically prevent self-citation
    const [result] = await pool.query(
      "INSERT INTO Citation (CitingArticleID, CitedArticleID) VALUES (?, ?)",
      [citingArticleId, citedArticleId],
    );

    // Return created citation with article details (lossless join)
    const [citation] = await pool.query(
      `
      SELECT 
        c.*,
        citing.Title AS CitingTitle,
        citing.DOI AS CitingDOI,
        citing.Status AS CitingStatus,
        cited.Title AS CitedTitle,
        cited.DOI AS CitedDOI,
        cited.Status AS CitedStatus
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

    // ================================================================
    // PARTITION JOIN ERROR HANDLING:
    // Handle CHECK constraint violation (replaces trigger-based check)
    // ================================================================
    if (err.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
      // Check if it's the self-citation constraint
      if (err.sqlMessage && err.sqlMessage.includes("chk_no_self_citation")) {
        return res.status(400).json({
          error: "An article cannot cite itself",
          details: "The citing article and cited article must be different",
          constraint: "chk_no_self_citation",
          sqlError: err.code,
        });
      }
      // Generic check constraint error
      return res.status(400).json({
        error: "Check constraint violation",
        message: err.message,
      });
    }

    // Handle duplicate entry (shouldn't happen if we checked above, but just in case)
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        error: "Citation already exists",
        message: err.message,
      });
    }

    // Generic error
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
        ra.Status,
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
      GROUP BY ra.ArticleID, ra.Title, ra.DOI, ra.SubmissionDate, ra.Status
      HAVING CitationCount > 0
      ORDER BY CitationCount DESC, ra.SubmissionDate DESC
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
    const [cites] = await pool.query(
      `
      SELECT 
        'cites' as RelationType,
        ra.ArticleID,
        ra.Title,
        ra.DOI,
        ra.Status,
        ra.SubmissionDate,
        GROUP_CONCAT(
          DISTINCT COALESCE(u.Username, a.Name) 
          ORDER BY a.Name 
          SEPARATOR ', '
        ) AS Authors
      FROM Citation c
      JOIN ResearchArticle ra ON c.CitedArticleID = ra.ArticleID
      LEFT JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
      LEFT JOIN Author a ON aa.AuthorID = a.AuthorID
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      WHERE c.CitingArticleID = ?
      GROUP BY ra.ArticleID, ra.Title, ra.DOI, ra.Status, ra.SubmissionDate
      ORDER BY ra.SubmissionDate DESC
      `,
      [req.params.id],
    );

    // Get articles that cite this one
    const [citedBy] = await pool.query(
      `
      SELECT 
        'cited_by' as RelationType,
        ra.ArticleID,
        ra.Title,
        ra.DOI,
        ra.Status,
        ra.SubmissionDate,
        GROUP_CONCAT(
          DISTINCT COALESCE(u.Username, a.Name) 
          ORDER BY a.Name 
          SEPARATOR ', '
        ) AS Authors
      FROM Citation c
      JOIN ResearchArticle ra ON c.CitingArticleID = ra.ArticleID
      LEFT JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
      LEFT JOIN Author a ON aa.AuthorID = a.AuthorID
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      WHERE c.CitedArticleID = ?
      GROUP BY ra.ArticleID, ra.Title, ra.DOI, ra.Status, ra.SubmissionDate
      ORDER BY ra.SubmissionDate DESC
      `,
      [req.params.id],
    );

    res.json({
      articleId: parseInt(req.params.id),
      cites: cites,
      citedBy: citedBy,
      totalCitations: cites.length,
      totalCitedBy: citedBy.length,
      hIndex: calculateHIndex(citedBy.length, cites.length),
    });
  } catch (err) {
    console.error("Error fetching citation network:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Helper function to calculate h-index approximation
 */
const calculateHIndex = (citedByCount, citesCount) => {
  // Simplified h-index calculation
  // In reality, you'd need citation counts per citing article
  return Math.min(citedByCount, Math.ceil(Math.sqrt(citedByCount)));
};

/**
 * Get mutual citations (articles that cite each other)
 */
const getMutualCitations = async (req, res) => {
  try {
    const [mutual] = await pool.query(
      `
      SELECT 
        c1.CitingArticleID AS Article1ID,
        ra1.Title AS Article1Title,
        c1.CitedArticleID AS Article2ID,
        ra2.Title AS Article2Title,
        c1.CitationID AS Citation1ID,
        c2.CitationID AS Citation2ID
      FROM Citation c1
      JOIN Citation c2 ON c1.CitingArticleID = c2.CitedArticleID 
                       AND c1.CitedArticleID = c2.CitingArticleID
      JOIN ResearchArticle ra1 ON c1.CitingArticleID = ra1.ArticleID
      JOIN ResearchArticle ra2 ON c1.CitedArticleID = ra2.ArticleID
      WHERE c1.CitingArticleID < c2.CitingArticleID
      ORDER BY ra1.SubmissionDate DESC
      `,
    );
    res.json(mutual);
  } catch (err) {
    console.error("Error fetching mutual citations:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Batch create citations
 */
const batchCreateCitations = async (req, res) => {
  const { citations } = req.body; // Array of {citingArticleId, citedArticleId}

  if (!Array.isArray(citations) || citations.length === 0) {
    return res.status(400).json({
      error: "citations must be a non-empty array",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const results = [];
    const errors = [];

    for (let i = 0; i < citations.length; i++) {
      const { citingArticleId, citedArticleId } = citations[i];

      try {
        // Validate
        if (citingArticleId === citedArticleId) {
          errors.push({
            index: i,
            citingArticleId,
            citedArticleId,
            error: "An article cannot cite itself",
          });
          continue;
        }

        // Check if already exists
        const [existing] = await conn.query(
          "SELECT CitationID FROM Citation WHERE CitingArticleID = ? AND CitedArticleID = ?",
          [citingArticleId, citedArticleId],
        );

        if (existing.length > 0) {
          errors.push({
            index: i,
            citingArticleId,
            citedArticleId,
            error: "Citation already exists",
            citationId: existing[0].CitationID,
          });
          continue;
        }

        // Insert citation - CHECK constraint will prevent self-citation
        const [result] = await conn.query(
          "INSERT INTO Citation (CitingArticleID, CitedArticleID) VALUES (?, ?)",
          [citingArticleId, citedArticleId],
        );

        results.push({
          index: i,
          citingArticleId,
          citedArticleId,
          citationId: result.insertId,
          success: true,
        });
      } catch (insertErr) {
        // Handle constraint violations for individual citations
        if (insertErr.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
          errors.push({
            index: i,
            citingArticleId,
            citedArticleId,
            error: "Self-citation prevented by constraint",
          });
        } else {
          errors.push({
            index: i,
            citingArticleId,
            citedArticleId,
            error: insertErr.message,
          });
        }
      }
    }

    await conn.commit();

    res.status(201).json({
      message: `Processed ${citations.length} citations`,
      successful: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    await conn.rollback();
    console.error("Error in batch citation creation:", err);
    res.status(500).json({
      error: "Batch citation creation failed",
      message: err.message,
    });
  } finally {
    conn.release();
  }
};

module.exports = {
  getCitationsByArticle,
  getCitedByArticle,
  createCitation,
  deleteCitation,
  getCitationStats,
  getCitationNetwork,
  getMutualCitations,
  batchCreateCitations,
};
