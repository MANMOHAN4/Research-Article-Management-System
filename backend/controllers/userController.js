const pool = require("../db/config");

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT UserID, Username, Email, Role, Affiliation, ORCID FROM UserAccount"
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT UserID, Username, Email, Role, Affiliation, ORCID FROM UserAccount WHERE UserID = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update user (profile info only)
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
      "UPDATE UserAccount SET Email = ?, Affiliation = ?, ORCID = ? WHERE UserID = ?",
      [email, affiliation || null, orcid || null, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const [user] = await pool.query(
      "SELECT UserID, Username, Email, Role, Affiliation, ORCID FROM UserAccount WHERE UserID = ?",
      [req.params.id]
    );

    res.json(user[0]);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: err.message });
  }
};

// Update user password (admin only) - NO HASHING
const updatePassword = async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({
      error: "Password must be at least 6 characters",
    });
  }

  try {
    // Store password directly without hashing
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

// Delete user
const deleteUser = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM UserAccount WHERE UserID = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  updatePassword,
  deleteUser,
};
