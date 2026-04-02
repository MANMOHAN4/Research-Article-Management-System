const pool = require("../db/config");

/**
 * requireAdmin middleware
 * Reads userId from request header "x-user-id" and checks Role = 'Admin'
 * in UserAccount. Returns 401 if header missing, 403 if not Admin.
 *
 * Usage: router.delete("/path", requireAdmin, controllerFn);
 */
const requireAdmin = async (req, res, next) => {
  const userId = req.headers["x-user-id"];

  if (!userId) {
    return res.status(401).json({
      error: "Unauthorized: x-user-id header is required",
    });
  }

  try {
    const [rows] = await pool.query(
      "SELECT Role FROM UserAccount WHERE UserID = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Unauthorized: user not found" });
    }

    if (rows[0].Role !== "Admin") {
      return res.status(403).json({
        error: "Forbidden: only Admins can perform this action",
      });
    }

    req.adminUserId = userId;
    next();
  } catch (err) {
    console.error("requireAdmin middleware error:", err);
    res.status(500).json({ error: "Authorization check failed" });
  }
};

module.exports = { requireAdmin };
