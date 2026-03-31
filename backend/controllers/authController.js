const pool = require("../db/config");

/**
 * User login
 * WARNING: Uses plain-text password comparison (not recommended for production)
 */
const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      error: "Username and password are required",
    });
  }

  try {
    const [users] = await pool.query(
      "SELECT * FROM UserAccount WHERE Username = ?",
      [username],
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = users[0];

    // Plain-text comparison — in production use bcrypt.compare
    if (password !== user.PasswordHash) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Fetch Author and Reviewer profile IDs if they exist
    const [author] = await pool.query(
      "SELECT AuthorID FROM Author WHERE UserID = ?",
      [user.UserID],
    );

    const [reviewer] = await pool.query(
      "SELECT ReviewerID FROM Reviewer WHERE UserID = ?",
      [user.UserID],
    );

    return res.json({
      userId: user.UserID,
      username: user.Username,
      email: user.Email,
      affiliation: user.Affiliation,
      orcid: user.ORCID,
      role: user.Role,
      hasAuthorProfile: author.length > 0,
      hasReviewerProfile: reviewer.length > 0,
      authorId: author.length > 0 ? author[0].AuthorID : null,
      reviewerId: reviewer.length > 0 ? reviewer[0].ReviewerID : null,
      message: "Login successful",
    });
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ error: "Login failed", message: err.message });
  }
};

/**
 * User signup
 * Uses stored procedure `create_user_if_unique` for uniqueness enforcement.
 * Also creates Author / Reviewer profile rows based on role.
 *
 * FIX: Author.Name and Reviewer.Name are NOT NULL in schema — we pass
 * newUser.Username as the initial Name value. Because these rows are linked
 * via UserID, all frontend queries use COALESCE(u.Username, a.Name) so the
 * displayed name always comes from UserAccount going forward.
 */
const signup = async (req, res) => {
  const { username, password, email, affiliation, orcid, role } = req.body;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!username || !password || !email) {
    return res.status(400).json({
      error: "Username, password, and email are required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: "Password must be at least 6 characters",
    });
  }

  const validRoles = ["Author", "Reviewer", "Admin"];
  const userRole = role || "Author";

  if (!validRoles.includes(userRole)) {
    return res.status(400).json({
      error: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
    });
  }

  try {
    // ── Call stored procedure ─────────────────────────────────────────────────
    // In production, hash the password first:
    // const bcrypt = require('bcrypt');
    // const hashedPassword = await bcrypt.hash(password, 10);
    const [rows] = await pool.query(
      "CALL create_user_if_unique(?, ?, ?, ?, ?, ?)",
      [
        username,
        password, // production: use hashedPassword
        email,
        affiliation || null,
        orcid || null,
        userRole,
      ],
    );

    const newUser = rows[0]?.[0];

    if (!newUser) {
      return res.status(500).json({
        error: "Registration failed — user data not returned from procedure",
      });
    }

    // ── Create Author / Reviewer profile rows ─────────────────────────────────
    // Author.Name and Reviewer.Name are NOT NULL in the schema.
    // We store the username as the initial Name so the INSERT doesn't violate
    // the constraint. The actual displayed name resolves via lossless join:
    //   COALESCE(u.Username, a.Name) — so UserAccount is always the source.
    let authorId = null;
    let reviewerId = null;

    if (userRole === "Author" || userRole === "Admin") {
      const [authorResult] = await pool.query(
        "INSERT INTO Author (Name, UserID) VALUES (?, ?)",
        [newUser.Username, newUser.UserID],
      );
      authorId = authorResult.insertId;
    }

    if (userRole === "Reviewer" || userRole === "Admin") {
      const [reviewerResult] = await pool.query(
        "INSERT INTO Reviewer (Name, UserID) VALUES (?, ?)",
        [newUser.Username, newUser.UserID],
      );
      reviewerId = reviewerResult.insertId;
    }

    return res.status(201).json({
      userId: newUser.UserID,
      username: newUser.Username,
      email: newUser.Email,
      affiliation: newUser.Affiliation,
      orcid: newUser.ORCID,
      role: newUser.Role,
      authorId,
      reviewerId,
      message: "User registered successfully",
    });
  } catch (err) {
    console.error("Signup error:", err);

    // SIGNAL from stored procedure (duplicate username / email)
    if (err.sqlState === "45000" && err.sqlMessage) {
      return res.status(400).json({ error: err.sqlMessage });
    }

    // MySQL unique constraint fallback
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ error: "Username or email already exists" });
    }

    return res.status(500).json({
      error: "Registration failed",
      message: err.message,
    });
  }
};

/**
 * Logout
 * No server-side session used — client clears its own stored auth state.
 */
const logout = async (req, res) => {
  return res.json({ message: "Logged out successfully" });
};

/**
 * Change password (authenticated users only)
 */
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.params.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      error: "Current password and new password are required",
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      error: "New password must be at least 6 characters",
    });
  }

  try {
    const [users] = await pool.query(
      "SELECT PasswordHash FROM UserAccount WHERE UserID = ?",
      [userId],
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Plain-text comparison — in production use bcrypt.compare
    if (currentPassword !== users[0].PasswordHash) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // In production, hash newPassword before storing
    await pool.query(
      "UPDATE UserAccount SET PasswordHash = ? WHERE UserID = ?",
      [newPassword, userId],
    );

    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({
      error: "Failed to change password",
      message: err.message,
    });
  }
};

module.exports = { login, signup, logout, changePassword };
