const pool = require("../db/config");

const getAllReviewers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, COUNT(rev.ReviewID) as ReviewCount
      FROM Reviewer r
      LEFT JOIN Review rev ON r.ReviewerID = rev.ReviewerID
      GROUP BY r.ReviewerID
      ORDER BY r.Name
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getReviewerById = async (req, res) => {
  try {
    const [reviewer] = await pool.query(
      "SELECT * FROM Reviewer WHERE ReviewerID = ?",
      [req.params.id]
    );

    if (reviewer.length === 0) {
      return res.status(404).json({ error: "Reviewer not found" });
    }

    const [reviews] = await pool.query(
      `
      SELECT r.*, ra.Title AS ArticleTitle
      FROM Review r
      LEFT JOIN ResearchArticle ra ON r.ArticleID = ra.ArticleID
      WHERE r.ReviewerID = ?
      ORDER BY r.ReviewDate DESC
      `,
      [req.params.id]
    );

    res.json({ ...reviewer[0], reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createReviewer = async (req, res) => {
  const { name, affiliation, expertiseArea, userId } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO Reviewer (Name, Affiliation, ExpertiseArea, UserID) VALUES (?, ?, ?, ?)",
      [name, affiliation, expertiseArea, userId || null]
    );

    const [reviewer] = await pool.query(
      "SELECT * FROM Reviewer WHERE ReviewerID = ?",
      [result.insertId]
    );
    res.status(201).json(reviewer[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateReviewer = async (req, res) => {
  const { name, affiliation, expertiseArea } = req.body;

  try {
    const [result] = await pool.query(
      "UPDATE Reviewer SET Name = ?, Affiliation = ?, ExpertiseArea = ? WHERE ReviewerID = ?",
      [name, affiliation, expertiseArea, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Reviewer not found" });
    }

    const [reviewer] = await pool.query(
      "SELECT * FROM Reviewer WHERE ReviewerID = ?",
      [req.params.id]
    );
    res.json(reviewer[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteReviewer = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM Reviewer WHERE ReviewerID = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Reviewer not found" });
    }

    res.json({ message: "Reviewer deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllReviewers,
  getReviewerById,
  createReviewer,
  updateReviewer,
  deleteReviewer,
};
