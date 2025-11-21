const pool = require("../db/config");

const getAllReviews = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, rev.Name AS ReviewerName, rev.Affiliation,
             ra.Title AS ArticleTitle
      FROM Review r
      JOIN Reviewer rev ON r.ReviewerID = rev.ReviewerID
      LEFT JOIN ResearchArticle ra ON r.ArticleID = ra.ArticleID
      ORDER BY r.ReviewDate DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getReviewsByArticle = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT r.*, rev.Name AS ReviewerName, rev.Affiliation, rev.ExpertiseArea
      FROM Review r
      JOIN Reviewer rev ON r.ReviewerID = rev.ReviewerID
      WHERE r.ArticleID = ?
      ORDER BY r.ReviewDate DESC
      `,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createReview = async (req, res) => {
  const {
    articleId,
    reviewerName,
    affiliation,
    expertiseArea,
    reviewDate,
    comments,
    recommendation,
  } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existingReviewer] = await conn.query(
      "SELECT ReviewerID FROM Reviewer WHERE LOWER(Name) = LOWER(?)",
      [reviewerName.trim()]
    );

    let reviewerId;
    if (existingReviewer.length > 0) {
      reviewerId = existingReviewer[0].ReviewerID;
      if (affiliation || expertiseArea) {
        await conn.query(
          "UPDATE Reviewer SET Affiliation = COALESCE(?, Affiliation), ExpertiseArea = COALESCE(?, ExpertiseArea) WHERE ReviewerID = ?",
          [
            affiliation?.trim() || null,
            expertiseArea?.trim() || null,
            reviewerId,
          ]
        );
      }
    } else {
      const [reviewerResult] = await conn.query(
        "INSERT INTO Reviewer (Name, Affiliation, ExpertiseArea) VALUES (?, ?, ?)",
        [
          reviewerName.trim(),
          affiliation?.trim() || null,
          expertiseArea?.trim() || null,
        ]
      );
      reviewerId = reviewerResult.insertId;
    }

    const [reviewResult] = await conn.query(
      "INSERT INTO Review (ArticleID, ReviewerID, ReviewDate, Comments, Recommendation) VALUES (?, ?, ?, ?, ?)",
      [
        articleId,
        reviewerId,
        reviewDate,
        comments?.trim() || null,
        recommendation,
      ]
    );

    await conn.commit();

    const [review] = await conn.query(
      `
      SELECT r.*, rev.Name AS ReviewerName, rev.Affiliation, rev.ExpertiseArea
      FROM Review r
      JOIN Reviewer rev ON r.ReviewerID = rev.ReviewerID
      WHERE r.ReviewID = ?
      `,
      [reviewResult.insertId]
    );

    res
      .status(201)
      .json({ message: "Review added successfully", review: review[0] });
  } catch (err) {
    await conn.rollback();
    console.error("Error adding review:", err);
    res
      .status(500)
      .json({ error: "Failed to add review", message: err.message });
  } finally {
    conn.release();
  }
};

const updateReview = async (req, res) => {
  const { reviewDate, comments, recommendation } = req.body;

  try {
    const [result] = await pool.query(
      "UPDATE Review SET ReviewDate = ?, Comments = ?, Recommendation = ? WHERE ReviewID = ?",
      [reviewDate, comments, recommendation, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Review not found" });
    }

    const [review] = await pool.query(
      `
      SELECT r.*, rev.Name AS ReviewerName, rev.Affiliation
      FROM Review r
      JOIN Reviewer rev ON r.ReviewerID = rev.ReviewerID
      WHERE r.ReviewID = ?
      `,
      [req.params.id]
    );
    res.json(review[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM Review WHERE ReviewID = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Review not found" });
    }

    res.json({ message: "Review deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllReviews,
  getReviewsByArticle,
  createReview,
  updateReview,
  deleteReview,
};
