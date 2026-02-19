const pool = require("../db/config");

/**
 * Get all authors with lossless join: Author ⋈ UserAccount
 * For registered authors, data comes from UserAccount
 * For guest authors, data comes from Author table
 */
const getAllAuthors = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        a.AuthorID,
        COALESCE(u.Username, a.Name) as Name,
        COALESCE(u.Email, 'N/A') as Email,
        COALESCE(u.Affiliation, a.Affiliation) as Affiliation,
        COALESCE(u.ORCID, a.ORCID) as ORCID,
        a.UserID,
        CASE 
          WHEN a.UserID IS NOT NULL THEN 'Registered' 
          ELSE 'Guest' 
        END as UserType,
        COUNT(aa.ArticleID) as ArticleCount
      FROM Author a
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      LEFT JOIN ArticleAuthor aa ON a.AuthorID = aa.AuthorID
      GROUP BY a.AuthorID
      ORDER BY Name
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching authors:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get author by ID with lossless join reconstruction
 */
const getAuthorById = async (req, res) => {
  try {
    // Get author with user information via lossless join
    const [author] = await pool.query(
      `
      SELECT 
        a.AuthorID,
        COALESCE(u.Username, a.Name) as Name,
        COALESCE(u.Email, 'N/A') as Email,
        COALESCE(u.Affiliation, a.Affiliation) as Affiliation,
        COALESCE(u.ORCID, a.ORCID) as ORCID,
        a.UserID,
        u.Role,
        CASE 
          WHEN a.UserID IS NOT NULL THEN 'Registered' 
          ELSE 'Guest' 
        END as UserType
      FROM Author a
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      WHERE a.AuthorID = ?
      `,
      [req.params.id],
    );

    if (author.length === 0) {
      return res.status(404).json({ error: "Author not found" });
    }

    // Get articles by this author
    const [articles] = await pool.query(
      `
      SELECT 
        ra.*,
        j.Name as JournalName,
        c.Name as ConferenceName
      FROM ResearchArticle ra
      JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
      LEFT JOIN Journal j ON ra.JournalID = j.JournalID
      LEFT JOIN Conference c ON ra.ConferenceID = c.ConferenceID
      WHERE aa.AuthorID = ?
      ORDER BY ra.SubmissionDate DESC
      `,
      [req.params.id],
    );

    res.json({ ...author[0], articles });
  } catch (err) {
    console.error("Error fetching author:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create author
 * For registered users: Only store UserID (data comes from UserAccount via join)
 * For guest authors: Store Name, Affiliation, ORCID locally
 */
const createAuthor = async (req, res) => {
  const { name, affiliation, orcid, userId } = req.body;

  // Validation: Either userId or name is required
  if (!userId && !name) {
    return res.status(400).json({
      error:
        "Either userId (for registered user) or name (for guest author) is required",
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

      // Check if author already exists for this user
      const [existing] = await pool.query(
        "SELECT AuthorID FROM Author WHERE UserID = ?",
        [userId],
      );

      if (existing.length > 0) {
        return res.status(400).json({
          error: "Author record already exists for this user",
          authorId: existing[0].AuthorID,
        });
      }
    } catch (err) {
      console.error("Error validating user:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  try {
    // For registered users: only store UserID (NULL for local fields)
    // For guest authors: store name/affiliation/orcid (NULL for UserID)
    const [result] = await pool.query(
      "INSERT INTO Author (Name, Affiliation, ORCID, UserID) VALUES (?, ?, ?, ?)",
      [
        userId ? null : name,
        userId ? null : affiliation || null,
        userId ? null : orcid || null,
        userId || null,
      ],
    );

    // Retrieve the created author with joined data (lossless join)
    const [author] = await pool.query(
      `
      SELECT 
        a.AuthorID,
        COALESCE(u.Username, a.Name) as Name,
        COALESCE(u.Email, 'N/A') as Email,
        COALESCE(u.Affiliation, a.Affiliation) as Affiliation,
        COALESCE(u.ORCID, a.ORCID) as ORCID,
        a.UserID,
        CASE 
          WHEN a.UserID IS NOT NULL THEN 'Registered' 
          ELSE 'Guest' 
        END as UserType
      FROM Author a
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      WHERE a.AuthorID = ?
      `,
      [result.insertId],
    );

    res.status(201).json({
      message: "Author created successfully",
      author: author[0],
    });
  } catch (err) {
    console.error("Error creating author:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        error: "Author already exists with this UserID",
      });
    }

    res.status(500).json({ error: err.message });
  }
};

/**
 * Update author
 * For registered authors (with UserID): Prevent update, direct to UserAccount
 * For guest authors (without UserID): Allow update of local fields
 */
const updateAuthor = async (req, res) => {
  const { name, affiliation, orcid } = req.body;

  try {
    // Check if author exists and whether it's linked to a user
    const [existing] = await pool.query(
      "SELECT UserID FROM Author WHERE AuthorID = ?",
      [req.params.id],
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: "Author not found" });
    }

    // If author is linked to a UserAccount, don't allow updates here
    if (existing[0].UserID) {
      return res.status(400).json({
        error:
          "Cannot update registered author data here. Please update the UserAccount instead.",
        userId: existing[0].UserID,
        message:
          "Registered authors' data comes from UserAccount via lossless join",
      });
    }

    // Update guest author only
    const [result] = await pool.query(
      "UPDATE Author SET Name = ?, Affiliation = ?, ORCID = ? WHERE AuthorID = ?",
      [name, affiliation || null, orcid || null, req.params.id],
    );

    // Return updated author
    const [author] = await pool.query(
      `
      SELECT 
        a.AuthorID,
        a.Name,
        a.Affiliation,
        a.ORCID,
        a.UserID,
        'Guest' as UserType
      FROM Author a
      WHERE a.AuthorID = ?
      `,
      [req.params.id],
    );

    res.json({
      message: "Guest author updated successfully",
      author: author[0],
    });
  } catch (err) {
    console.error("Error updating author:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete author
 * CASCADE will handle ArticleAuthor relationships
 */
const deleteAuthor = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM Author WHERE AuthorID = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Author not found" });
    }

    res.json({
      message: "Author deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting author:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Link existing author to a user account
 * Converts guest author to registered author
 */
const linkAuthorToUser = async (req, res) => {
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

    // Check if another author is already linked to this user
    const [existingLink] = await pool.query(
      "SELECT AuthorID FROM Author WHERE UserID = ?",
      [userId],
    );

    if (existingLink.length > 0) {
      return res.status(400).json({
        error: "This user is already linked to another author",
        existingAuthorId: existingLink[0].AuthorID,
      });
    }

    // Link author to user and clear local fields (data will come from UserAccount)
    await pool.query(
      "UPDATE Author SET UserID = ?, Name = NULL, Affiliation = NULL, ORCID = NULL WHERE AuthorID = ?",
      [userId, req.params.id],
    );

    // Return updated author with joined data
    const [author] = await pool.query(
      `
      SELECT 
        a.AuthorID,
        u.Username as Name,
        u.Email,
        u.Affiliation,
        u.ORCID,
        a.UserID,
        'Registered' as UserType
      FROM Author a
      JOIN UserAccount u ON a.UserID = u.UserID
      WHERE a.AuthorID = ?
      `,
      [req.params.id],
    );

    res.json({
      message: "Author successfully linked to user account",
      author: author[0],
    });
  } catch (err) {
    console.error("Error linking author to user:", err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        error: "This user is already linked to an author",
      });
    }

    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  linkAuthorToUser,
};
