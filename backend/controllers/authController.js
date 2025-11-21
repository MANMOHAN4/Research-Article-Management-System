const pool = require("../db/config");

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const [users] = await pool.query(
      "SELECT * FROM UserAccount WHERE Username = ?",
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = users[0];

    // Plain-text comparison as in your current logic
    if (password !== user.PasswordHash) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    res.json({
      userId: user.UserID,
      username: user.Username,
      email: user.Email,
      affiliation: user.Affiliation,
      orcid: user.ORCID,
      role: user.Role,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};

const signup = async (req, res) => {
  const { username, password, email, affiliation, orcid } = req.body;

  try {
    const [rows] = await pool.query(
      "CALL create_user_if_unique(?, ?, ?, ?, ?, ?)",
      [username, password, email, affiliation || null, orcid || null, "Author"]
    );

    const newUser = rows[0]?.[0];

    if (!newUser) {
      return res.status(500).json({ error: "Registration failed" });
    }

    res.status(201).json({
      userId: newUser.UserID,
      username: newUser.Username,
      email: newUser.Email,
      affiliation: newUser.Affiliation,
      orcid: newUser.ORCID,
      role: newUser.Role,
      message: "User registered successfully",
    });
  } catch (err) {
    // Handle custom SIGNAL errors from the procedure
    // Your procedure uses SIGNAL SQLSTATE '45000' with MESSAGE_TEXT like:
    //  - 'Username is required'
    //  - 'PasswordHash is required'
    //  - 'Email is required'
    //  - 'Username already exists'
    //  - 'Email already exists'
    if (err.sqlState === "45000" && err.sqlMessage) {
      return res.status(400).json({ error: err.sqlMessage });
    }

    // Fallback for other DB errors (e.g. constraint issues)
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ error: "Username or email already exists" });
    }

    console.error("Signup error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
};

module.exports = { login, signup };
