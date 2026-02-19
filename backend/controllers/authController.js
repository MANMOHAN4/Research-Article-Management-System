const pool = require("../db/config");

/**
 * User login
 * WARNING: Uses plain-text password comparison (not recommended for production)
 * In production, use bcrypt for password hashing and comparison
 */
const login = async (req, res) => {
  const { username, password } = req.body;

  // Validation
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
      return res.status(401).json({
        error: "Invalid username or password",
      });
    }

    const user = users[0];

    // Plain-text comparison (in production, use bcrypt.compare)
    // const bcrypt = require('bcrypt');
    // const isValid = await bcrypt.compare(password, user.PasswordHash);
    if (password !== user.PasswordHash) {
      return res.status(401).json({
        error: "Invalid username or password",
      });
    }

    // Check if user has Author/Reviewer records
    const [author] = await pool.query(
      "SELECT AuthorID FROM Author WHERE UserID = ?",
      [user.UserID],
    );

    const [reviewer] = await pool.query(
      "SELECT ReviewerID FROM Reviewer WHERE UserID = ?",
      [user.UserID],
    );

    // Return user info (exclude password hash)
    res.json({
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
    res.status(500).json({
      error: "Login failed",
      message: err.message,
    });
  }
};

/**
 * User signup using stored procedure (ensures data integrity)
 * WARNING: Stores plain-text password (not recommended for production)
 * In production, hash password before calling procedure
 */
const signup = async (req, res) => {
  const { username, password, email, affiliation, orcid, role } = req.body;

  // Validation
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

  // Validate role if provided
  const validRoles = ["Author", "Reviewer", "Admin"];
  const userRole = role || "Author";

  if (!validRoles.includes(userRole)) {
    return res.status(400).json({
      error: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
    });
  }

  try {
    // In production, hash the password:
    // const bcrypt = require('bcrypt');
    // const hashedPassword = await bcrypt.hash(password, 10);

    // Call stored procedure for user creation (ensures uniqueness and validation)
    const [rows] = await pool.query(
      "CALL create_user_if_unique(?, ?, ?, ?, ?, ?)",
      [
        username,
        password, // In production: use hashedPassword
        email,
        affiliation || null,
        orcid || null,
        userRole,
      ],
    );

    const newUser = rows[0]?.[0];

    if (!newUser) {
      return res.status(500).json({
        error: "Registration failed - user data not returned",
      });
    }

    // Create Author/Reviewer record based on role
    let authorId = null;
    let reviewerId = null;

    if (userRole === "Author" || userRole === "Admin") {
      const [authorResult] = await pool.query(
        "INSERT INTO Author (UserID) VALUES (?)",
        [newUser.UserID],
      );
      authorId = authorResult.insertId;
    }

    if (userRole === "Reviewer" || userRole === "Admin") {
      const [reviewerResult] = await pool.query(
        "INSERT INTO Reviewer (UserID) VALUES (?)",
        [newUser.UserID],
      );
      reviewerId = reviewerResult.insertId;
    }

    res.status(201).json({
      userId: newUser.UserID,
      username: newUser.Username,
      email: newUser.Email,
      affiliation: newUser.Affiliation,
      orcid: newUser.ORCID,
      role: newUser.Role,
      authorId: authorId,
      reviewerId: reviewerId,
      message: "User registered successfully",
    });
  } catch (err) {
    console.error("Signup error:", err);

    // Handle custom SIGNAL errors from the stored procedure
    if (err.sqlState === "45000" && err.sqlMessage) {
      return res.status(400).json({
        error: err.sqlMessage,
      });
    }

    // Handle duplicate entry errors
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        error: "Username or email already exists",
      });
    }

    res.status(500).json({
      error: "Registration failed",
      message: err.message,
    });
  }
};

/**
 * Logout (if using sessions)
 * For JWT-based auth, client should delete token
 */
const logout = async (req, res) => {
  // If using sessions:
  // req.session.destroy();

  res.json({
    message: "Logged out successfully",
  });
};

/**
 * Change password (authenticated users only)
 */
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.params.id; // Assume auth middleware sets this

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
    // Verify current password
    const [users] = await pool.query(
      "SELECT PasswordHash FROM UserAccount WHERE UserID = ?",
      [userId],
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Plain-text comparison (in production, use bcrypt.compare)
    if (currentPassword !== users[0].PasswordHash) {
      return res.status(401).json({
        error: "Current password is incorrect",
      });
    }

    // Update to new password (in production, hash first)
    await pool.query(
      "UPDATE UserAccount SET PasswordHash = ? WHERE UserID = ?",
      [newPassword, userId],
    );

    res.json({
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({
      error: "Failed to change password",
      message: err.message,
    });
  }
};

module.exports = {
  login,
  signup,
  logout,
  changePassword,
};
