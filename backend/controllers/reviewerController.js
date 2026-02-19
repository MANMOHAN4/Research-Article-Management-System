const pool = require("../db/config");

/**
 * Get all reviewers with lossless join: Reviewer ⋈ UserAccount
 * For registered reviewers, Name/Affiliation comes from UserAccount
 * For guest reviewers, data comes from Reviewer table
 */
const getAllReviewers = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        r.ReviewerID,
        COALESCE(u.Username, r.Name) as Name,
        COALESCE(u.Email, 'N/A') as Email,
        COALESCE(u.Affiliation, r.Affiliation) as Affiliation,
        r.ExpertiseArea,
        r.UserID,
        CASE 
          WHEN r.UserID IS NOT NULL THEN 'Registered' 
          ELSE 'Guest' 
        END as UserType,
        COUNT(rev.ReviewID) as ReviewCount
      FROM Reviewer r
      LEFT JOIN UserAccount u ON r.UserID = u.UserID
      LEFT JOIN Review rev ON r.ReviewerID = rev.ReviewerID
      GROUP BY r.ReviewerID
      ORDER BY Name
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching reviewers:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get reviewer by ID with lossless join reconstruction
 */
const getReviewerById = async (req, res) => {
  try {
    // Get reviewer with user information via lossless join
    const [reviewer] = await pool.query(
      `
      SELECT 
        r.ReviewerID,
        COALESCE(u.Username, r.Name) as Name,
        COALESCE(u.Email, 'N/A') as Email,
        COALESCE(u.Affiliation, r.Affiliation) as Affiliation,
        r.ExpertiseArea,
        r.UserID,
        u.Role,
        CASE 
          WHEN r.UserID IS NOT NULL THEN 'Registered' 
          ELSE 'Guest' 
        END as UserType
      FROM Reviewer r
      LEFT JOIN UserAccount u ON r.UserID = u.UserID
      WHERE r.ReviewerID = ?
      `,
      [req.params.id],
    );

    if (reviewer.length === 0) {
      return res.status(404).json({ error: "Reviewer not found" });
    }

    // Get reviews by this reviewer
    const [reviews] = await pool.query(
      `
      SELECT 
        rev.*,
        ra.Title AS ArticleTitle,
        ra.Status AS ArticleStatus
      FROM Review rev
      LEFT JOIN ResearchArticle ra ON rev.ArticleID = ra.ArticleID
      WHERE rev.ReviewerID = ?
      ORDER BY rev.ReviewDate DESC
      `,
      [req.params.id],
    );

    res.json({ ...reviewer[0], reviews });
  } catch (err) {
    console.error("Error fetching reviewer:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create reviewer
 * For registered users: Only store UserID and ExpertiseArea
 * For guest reviewers: Store Name, Affiliation, ExpertiseArea locally
 */
const createReviewer = async (req, res) => {
  const { name, affiliation, expertiseArea, userId } = req.body;

  // Validation: Either userId or name is required
  if (!userId && !name) {
    return res.status(400).json({
      error:
        "Either userId (for registered user) or name (for guest reviewer) is required",
    });
  }

  // If userId provided, verify it exists
  if (userId) {
    try {
      const [user] = await pool.query(
        "SELECT UserID FROM UserAccount WHERE UserID = ?",
        [userId],
      );

      if (user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if reviewer already exists for this user
      const [existing] = await pool.query(
        "SELECT ReviewerID FROM Reviewer WHERE UserID = ?",
        [userId],
      );

      if (existing.length > 0) {
        return res.status(400).json({
          error: "Reviewer record already exists for this user",
          reviewerId: existing[0].ReviewerID,
        });
      }
    } catch (err) {
      console.error("Error validating user:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  try {
    // For registered users: only store UserID and ExpertiseArea (NULL for Name/Affiliation)
    // For guest reviewers: store name/affiliation/expertiseArea (NULL for UserID)
    const [result] = await pool.query(
      "INSERT INTO Reviewer (Name, Affiliation, ExpertiseArea, UserID) VALUES (?, ?, ?, ?)",
      [
        userId ? null : name,
        userId ? null : affiliation || null,
        expertiseArea || null,
        userId || null,
      ],
    );

    // Retrieve the created reviewer with joined data (lossless join)
    const [reviewer] = await pool.query(
      `
      SELECT 
        r.ReviewerID,
        COALESCE(u.Username, r.Name) as Name,
        COALESCE(u.Email, 'N/A') as Email,
        COALESCE(u.Affiliation, r.Affiliation) as Affiliation,
        r.ExpertiseArea,
        r.UserID,
        CASE 
          WHEN r.UserID IS NOT NULL THEN 'Registered' 
          ELSE 'Guest' 
        END as UserType
      FROM Reviewer r
      LEFT JOIN UserAccount u ON r.UserID = u.UserID
      WHERE r.ReviewerID = ?
      `,
      [result.insertId],
    );

    res.status(201).json({
      message: "Reviewer created successfully",
      reviewer: reviewer[0],
    });
  } catch (err) {
    console.error("Error creating reviewer:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        error: "Reviewer already exists with this UserID",
      });
    }

    res.status(500).json({ error: err.message });
  }
};

/**
 * Update reviewer
 * For registered reviewers (with UserID): Only allow ExpertiseArea update
 * For guest reviewers (without UserID): Allow update of all local fields
 */
const updateReviewer = async (req, res) => {
  const { name, affiliation, expertiseArea } = req.body;

  try {
    // Check if reviewer exists and whether it's linked to a user
    const [existing] = await pool.query(
      "SELECT UserID FROM Reviewer WHERE ReviewerID = ?",
      [req.params.id],
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Reviewer not found" });
    }

    let result;

    // If reviewer is linked to a UserAccount
    if (existing[0].UserID) {
      // Only allow updating ExpertiseArea
      // Name and Affiliation come from UserAccount via lossless join
      result = await pool.query(
        "UPDATE Reviewer SET ExpertiseArea = ? WHERE ReviewerID = ?",
        [expertiseArea || null, req.params.id],
      );

      // Return with message about restricted updates
      const [reviewer] = await pool.query(
        `
        SELECT 
          r.ReviewerID,
          u.Username as Name,
          u.Email,
          u.Affiliation,
          r.ExpertiseArea,
          r.UserID,
          'Registered' as UserType
        FROM Reviewer r
        JOIN UserAccount u ON r.UserID = u.UserID
        WHERE r.ReviewerID = ?
        `,
        [req.params.id],
      );

      return res.json({
        message:
          "Reviewer expertise updated. Name and affiliation come from UserAccount.",
        note: "To update Name or Affiliation, please update the UserAccount directly.",
        reviewer: reviewer[0],
      });
    }

    // Update guest reviewer - all fields allowed
    result = await pool.query(
      "UPDATE Reviewer SET Name = ?, Affiliation = ?, ExpertiseArea = ? WHERE ReviewerID = ?",
      [name, affiliation || null, expertiseArea || null, req.params.id],
    );

    // Return updated reviewer
    const [reviewer] = await pool.query(
      `
      SELECT 
        r.ReviewerID,
        r.Name,
        r.Affiliation,
        r.ExpertiseArea,
        r.UserID,
        'Guest' as UserType
      FROM Reviewer r
      WHERE r.ReviewerID = ?
      `,
      [req.params.id],
    );

    res.json({
      message: "Guest reviewer updated successfully",
      reviewer: reviewer[0],
    });
  } catch (err) {
    console.error("Error updating reviewer:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete reviewer
 * CASCADE will handle Review relationships
 */
const deleteReviewer = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM Reviewer WHERE ReviewerID = ?",
      [req.params.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Reviewer not found" });
    }

    res.json({
      message: "Reviewer deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting reviewer:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Link existing reviewer to a user account
 * Converts guest reviewer to registered reviewer
 */
const linkReviewerToUser = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    // Verify user exists
    const [user] = await pool.query(
      "SELECT UserID FROM UserAccount WHERE UserID = ?",
      [userId],
    );

    if (user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if another reviewer is already linked to this user
    const [existingLink] = await pool.query(
      "SELECT ReviewerID FROM Reviewer WHERE UserID = ?",
      [userId],
    );

    if (existingLink.length > 0) {
      return res.status(400).json({
        error: "This user is already linked to another reviewer",
        existingReviewerId: existingLink[0].ReviewerID,
      });
    }

    // Get current ExpertiseArea before updating
    const [current] = await pool.query(
      "SELECT ExpertiseArea FROM Reviewer WHERE ReviewerID = ?",
      [req.params.id],
    );

    // Link reviewer to user and clear local Name/Affiliation
    // (data will come from UserAccount via lossless join)
    // Keep ExpertiseArea as it's specific to reviewer role
    await pool.query(
      "UPDATE Reviewer SET UserID = ?, Name = NULL, Affiliation = NULL WHERE ReviewerID = ?",
      [userId, req.params.id],
    );

    // Return updated reviewer with joined data
    const [reviewer] = await pool.query(
      `
      SELECT 
        r.ReviewerID,
        u.Username as Name,
        u.Email,
        u.Affiliation,
        r.ExpertiseArea,
        r.UserID,
        'Registered' as UserType
      FROM Reviewer r
      JOIN UserAccount u ON r.UserID = u.UserID
      WHERE r.ReviewerID = ?
      `,
      [req.params.id],
    );

    res.json({
      message: "Reviewer successfully linked to user account",
      reviewer: reviewer[0],
    });
  } catch (err) {
    console.error("Error linking reviewer to user:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        error: "This user is already linked to a reviewer",
      });
    }

    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllReviewers,
  getReviewerById,
  createReviewer,
  updateReviewer,
  deleteReviewer,
  linkReviewerToUser,
};
