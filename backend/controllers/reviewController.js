const pool = require("../db/config");

/**
 * Get all reviews with lossless join: Review ⋈ Reviewer ⋈ UserAccount ⋈ ResearchArticle
 */
const getAllReviews = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.*,
        COALESCE(u.Username, rev.Name) AS ReviewerName,
        COALESCE(u.Email, 'N/A') AS ReviewerEmail,
        COALESCE(u.Affiliation, rev.Affiliation) AS ReviewerAffiliation,
        rev.ExpertiseArea,
        ra.Title AS ArticleTitle,
        ra.Status AS ArticleStatus,
        ra.DOI AS ArticleDOI
      FROM Review r
      JOIN Reviewer rev ON r.ReviewerID = rev.ReviewerID
      LEFT JOIN UserAccount u ON rev.UserID = u.UserID
      LEFT JOIN ResearchArticle ra ON r.ArticleID = ra.ArticleID
      ORDER BY r.ReviewDate DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get reviews by article ID
 */
const getReviewsByArticle = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT 
        r.*,
        COALESCE(u.Username, rev.Name) AS ReviewerName,
        COALESCE(u.Email, 'N/A') AS ReviewerEmail,
        COALESCE(u.Affiliation, rev.Affiliation) AS ReviewerAffiliation,
        rev.ExpertiseArea,
        CASE 
          WHEN rev.UserID IS NOT NULL THEN 'Registered' 
          ELSE 'Guest' 
        END as ReviewerType
      FROM Review r
      JOIN Reviewer rev ON r.ReviewerID = rev.ReviewerID
      LEFT JOIN UserAccount u ON rev.UserID = u.UserID
      WHERE r.ArticleID = ?
      ORDER BY r.ReviewDate DESC
      `,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching reviews by article:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create review with normalized reviewer handling
 * Supports both registered users and guest reviewers
 */
const createReview = async (req, res) => {
  const {
    articleId,
    reviewerId, // NEW: Preferred - use existing reviewer
    userId, // NEW: Alternative - link to user account
    reviewerName, // For guest reviewers
    affiliation, // For guest reviewers
    expertiseArea,
    reviewDate,
    comments,
    recommendation,
  } = req.body;

  // Validation
  if (!articleId) {
    return res.status(400).json({ error: "articleId is required" });
  }

  if (!recommendation) {
    return res.status(400).json({ error: "recommendation is required" });
  }

  const validRecommendations = [
    "Accept",
    "Minor Revision",
    "Major Revision",
    "Reject",
  ];
  if (!validRecommendations.includes(recommendation)) {
    return res.status(400).json({
      error: `Invalid recommendation. Must be one of: ${validRecommendations.join(", ")}`,
    });
  }

  // At least one of: reviewerId, userId, or reviewerName must be provided
  if (!reviewerId && !userId && !reviewerName) {
    return res.status(400).json({
      error: "Must provide reviewerId, userId, or reviewerName",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Verify article exists
    const [article] = await conn.query(
      "SELECT ArticleID FROM ResearchArticle WHERE ArticleID = ?",
      [articleId],
    );

    if (article.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Article not found" });
    }

    let finalReviewerId;

    // Case 1: ReviewerID provided - use it directly
    if (reviewerId) {
      const [reviewer] = await conn.query(
        "SELECT ReviewerID FROM Reviewer WHERE ReviewerID = ?",
        [reviewerId],
      );

      if (reviewer.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: "Reviewer not found" });
      }

      finalReviewerId = reviewerId;

      // Update expertise if provided
      if (expertiseArea) {
        await conn.query(
          "UPDATE Reviewer SET ExpertiseArea = ? WHERE ReviewerID = ?",
          [expertiseArea, reviewerId],
        );
      }
    }
    // Case 2: UserID provided - find or create reviewer for this user
    else if (userId) {
      // Verify user exists
      const [user] = await conn.query(
        "SELECT UserID FROM UserAccount WHERE UserID = ?",
        [userId],
      );

      if (user.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: "User not found" });
      }

      // Check if reviewer exists for this user
      const [existingReviewer] = await conn.query(
        "SELECT ReviewerID FROM Reviewer WHERE UserID = ?",
        [userId],
      );

      if (existingReviewer.length > 0) {
        finalReviewerId = existingReviewer[0].ReviewerID;

        // Update expertise if provided
        if (expertiseArea) {
          await conn.query(
            "UPDATE Reviewer SET ExpertiseArea = ? WHERE ReviewerID = ?",
            [expertiseArea, finalReviewerId],
          );
        }
      } else {
        // Create new reviewer linked to user
        const [reviewerResult] = await conn.query(
          "INSERT INTO Reviewer (ExpertiseArea, UserID) VALUES (?, ?)",
          [expertiseArea || null, userId],
        );
        finalReviewerId = reviewerResult.insertId;
      }
    }
    // Case 3: Guest reviewer by name
    else {
      // Check if guest reviewer with this name exists
      const [existingReviewer] = await conn.query(
        "SELECT ReviewerID FROM Reviewer WHERE LOWER(Name) = LOWER(?) AND UserID IS NULL",
        [reviewerName.trim()],
      );

      if (existingReviewer.length > 0) {
        finalReviewerId = existingReviewer[0].ReviewerID;

        // Update affiliation/expertise if provided
        if (affiliation || expertiseArea) {
          await conn.query(
            "UPDATE Reviewer SET Affiliation = COALESCE(?, Affiliation), ExpertiseArea = COALESCE(?, ExpertiseArea) WHERE ReviewerID = ?",
            [
              affiliation?.trim() || null,
              expertiseArea?.trim() || null,
              finalReviewerId,
            ],
          );
        }
      } else {
        // Create new guest reviewer
        const [reviewerResult] = await conn.query(
          "INSERT INTO Reviewer (Name, Affiliation, ExpertiseArea) VALUES (?, ?, ?)",
          [
            reviewerName.trim(),
            affiliation?.trim() || null,
            expertiseArea?.trim() || null,
          ],
        );
        finalReviewerId = reviewerResult.insertId;
      }
    }

    // Check for duplicate review (trigger will also catch this, but better to check first)
    const [existingReview] = await conn.query(
      "SELECT ReviewID FROM Review WHERE ArticleID = ? AND ReviewerID = ?",
      [articleId, finalReviewerId],
    );

    if (existingReview.length > 0) {
      await conn.rollback();
      return res.status(400).json({
        error: "This reviewer has already reviewed this article",
        existingReviewId: existingReview[0].ReviewID,
      });
    }

    // Create the review
    const [reviewResult] = await conn.query(
      "INSERT INTO Review (ArticleID, ReviewerID, ReviewDate, Comments, Recommendation) VALUES (?, ?, ?, ?, ?)",
      [
        articleId,
        finalReviewerId,
        reviewDate || new Date().toISOString().split("T")[0],
        comments?.trim() || null,
        recommendation,
      ],
    );

    await conn.commit();

    // Return review with complete joined data (lossless join)
    const [review] = await conn.query(
      `
      SELECT 
        r.*,
        COALESCE(u.Username, rev.Name) AS ReviewerName,
        COALESCE(u.Email, 'N/A') AS ReviewerEmail,
        COALESCE(u.Affiliation, rev.Affiliation) AS ReviewerAffiliation,
        rev.ExpertiseArea,
        ra.Title AS ArticleTitle,
        CASE 
          WHEN rev.UserID IS NOT NULL THEN 'Registered' 
          ELSE 'Guest' 
        END as ReviewerType
      FROM Review r
      JOIN Reviewer rev ON r.ReviewerID = rev.ReviewerID
      LEFT JOIN UserAccount u ON rev.UserID = u.UserID
      LEFT JOIN ResearchArticle ra ON r.ArticleID = ra.ArticleID
      WHERE r.ReviewID = ?
      `,
      [reviewResult.insertId],
    );

    res.status(201).json({
      message: "Review added successfully",
      review: review[0],
    });
  } catch (err) {
    await conn.rollback();
    console.error("Error adding review:", err);

    // Handle trigger error for duplicate review
    if (
      err.sqlState === "45000" &&
      err.sqlMessage.includes("Duplicate review")
    ) {
      return res.status(400).json({
        error: err.sqlMessage,
      });
    }

    res.status(500).json({
      error: "Failed to add review",
      message: err.message,
    });
  } finally {
    conn.release();
  }
};

/**
 * Update review
 */
const updateReview = async (req, res) => {
  const { reviewDate, comments, recommendation } = req.body;

  // Validate recommendation if provided
  if (recommendation) {
    const validRecommendations = [
      "Accept",
      "Minor Revision",
      "Major Revision",
      "Reject",
    ];
    if (!validRecommendations.includes(recommendation)) {
      return res.status(400).json({
        error: `Invalid recommendation. Must be one of: ${validRecommendations.join(", ")}`,
      });
    }
  }

  try {
    const [result] = await pool.query(
      "UPDATE Review SET ReviewDate = ?, Comments = ?, Recommendation = ? WHERE ReviewID = ?",
      [reviewDate, comments, recommendation, req.params.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Review not found" });
    }

    // Return updated review with joined data
    const [review] = await pool.query(
      `
      SELECT 
        r.*,
        COALESCE(u.Username, rev.Name) AS ReviewerName,
        COALESCE(u.Affiliation, rev.Affiliation) AS ReviewerAffiliation,
        rev.ExpertiseArea,
        ra.Title AS ArticleTitle
      FROM Review r
      JOIN Reviewer rev ON r.ReviewerID = rev.ReviewerID
      LEFT JOIN UserAccount u ON rev.UserID = u.UserID
      LEFT JOIN ResearchArticle ra ON r.ArticleID = ra.ArticleID
      WHERE r.ReviewID = ?
      `,
      [req.params.id],
    );

    res.json({
      message: "Review updated successfully",
      review: review[0],
    });
  } catch (err) {
    console.error("Error updating review:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete review
 */
const deleteReview = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM Review WHERE ReviewID = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Review not found" });
    }

    res.json({
      message: "Review deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting review:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get review statistics by article
 */
const getReviewStatsByArticle = async (req, res) => {
  try {
    const [stats] = await pool.query(
      `
      SELECT 
        ra.ArticleID,
        ra.Title,
        ra.Status,
        COUNT(r.ReviewID) as TotalReviews,
        SUM(CASE WHEN r.Recommendation = 'Accept' THEN 1 ELSE 0 END) as AcceptCount,
        SUM(CASE WHEN r.Recommendation = 'Minor Revision' THEN 1 ELSE 0 END) as MinorRevisionCount,
        SUM(CASE WHEN r.Recommendation = 'Major Revision' THEN 1 ELSE 0 END) as MajorRevisionCount,
        SUM(CASE WHEN r.Recommendation = 'Reject' THEN 1 ELSE 0 END) as RejectCount,
        MAX(r.ReviewDate) as LatestReviewDate,
        MIN(r.ReviewDate) as EarliestReviewDate
      FROM ResearchArticle ra
      LEFT JOIN Review r ON ra.ArticleID = r.ArticleID
      WHERE ra.ArticleID = ?
      GROUP BY ra.ArticleID
      `,
      [req.params.id],
    );

    if (stats.length === 0) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.json(stats[0]);
  } catch (err) {
    console.error("Error fetching review stats:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllReviews,
  getReviewsByArticle,
  createReview,
  updateReview,
  deleteReview,
  getReviewStatsByArticle,
};
