const pool = require("../db/config");

/**
 * Get all users
 * This is the single source of truth for user data (lossless join principle)
 */
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        UserID, 
        Username, 
        Email, 
        Role, 
        Affiliation, 
        ORCID 
      FROM UserAccount
      ORDER BY Username`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get user by ID
 */
const getUserById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
        UserID, 
        Username, 
        Email, 
        Role, 
        Affiliation, 
        ORCID 
      FROM UserAccount 
      WHERE UserID = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const [author] = await pool.query(
      "SELECT AuthorID FROM Author WHERE UserID = ?",
      [req.params.id]
    );

    const [reviewer] = await pool.query(
      "SELECT ReviewerID, ExpertiseArea FROM Reviewer WHERE UserID = ?",
      [req.params.id]
    );

    res.json({
      ...rows[0],
      authorId: author.length > 0 ? author[0].AuthorID : null,
      reviewerId: reviewer.length > 0 ? reviewer[0].ReviewerID : null,
      expertiseArea: reviewer.length > 0 ? reviewer[0].ExpertiseArea : null,
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update user profile
 * This updates the single source of truth — changes propagate via lossless joins
 */
const updateUser = async (req, res) => {
  const { email, affiliation, orcid } = req.body;

  try {
    if (email) {
      const [existing] = await pool.query(
        "SELECT UserID FROM UserAccount WHERE Email = ? AND UserID != ?",
        [email, req.params.id]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    const [result] = await pool.query(
      `UPDATE UserAccount 
       SET Email = ?, 
           Affiliation = ?, 
           ORCID = ? 
       WHERE UserID = ?`,
      [email, affiliation || null, orcid || null, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const [user] = await pool.query(
      `SELECT 
        UserID, 
        Username, 
        Email, 
        Role, 
        Affiliation, 
        ORCID 
      FROM UserAccount 
      WHERE UserID = ?`,
      [req.params.id]
    );

    res.json({
      message:
        "User updated successfully. Changes will reflect in all related Author/Reviewer records via lossless join.",
      user: user[0],
    });
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update user password
 * WARNING: Stores plain-text password (not recommended for production)
 */
const updatePassword = async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({
      error: "Password must be at least 6 characters",
    });
  }

  try {
    const [result] = await pool.query(
      "UPDATE UserAccount SET PasswordHash = ? WHERE UserID = ?",
      [password, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error updating password:", err);
    res.status(500).json({
      error: "Failed to update password",
      message: err.message,
    });
  }
};

/**
 * Delete user — Admin only (enforced by requireAdmin middleware in router)
 * CASCADE will handle Author/Reviewer/ArticleAuthor deletions
 */
const deleteUser = async (req, res) => {
  // Prevent admin from deleting themselves
  if (String(req.params.id) === String(req.adminUserId)) {
    return res.status(400).json({
      error: "Admins cannot delete their own account",
    });
  }

  try {
    const [result] = await pool.query(
      "DELETE FROM UserAccount WHERE UserID = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message:
        "User deleted successfully. Related Author/Reviewer records also removed (CASCADE).",
      deletedBy: req.adminUserId,
    });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get user's articles (if they are an author)
 */
const getUserArticles = async (req, res) => {
  try {
    const [articles] = await pool.query(
      `
      SELECT 
        ra.*,
        j.Name as JournalName,
        c.Name as ConferenceName
      FROM Author a
      JOIN ArticleAuthor aa ON a.AuthorID = aa.AuthorID
      JOIN ResearchArticle ra ON aa.ArticleID = ra.ArticleID
      LEFT JOIN Journal j ON ra.JournalID = j.JournalID
      LEFT JOIN Conference c ON ra.ConferenceID = c.ConferenceID
      WHERE a.UserID = ?
      ORDER BY ra.SubmissionDate DESC
      `,
      [req.params.id]
    );

    res.json(articles);
  } catch (err) {
    console.error("Error fetching user articles:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get user's reviews (if they are a reviewer)
 */
const getUserReviews = async (req, res) => {
  try {
    const [reviews] = await pool.query(
      `
      SELECT 
        r.*,
        ra.Title AS ArticleTitle,
        ra.DOI AS ArticleDOI,
        ra.Status AS ArticleStatus
      FROM Reviewer rev
      JOIN Review r ON rev.ReviewerID = r.ReviewerID
      JOIN ResearchArticle ra ON r.ArticleID = ra.ArticleID
      WHERE rev.UserID = ?
      ORDER BY r.ReviewDate DESC
      `,
      [req.params.id]
    );

    res.json(reviews);
  } catch (err) {
    console.error("Error fetching user reviews:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  updatePassword,
  deleteUser,
  getUserArticles,
  getUserReviews,
};
