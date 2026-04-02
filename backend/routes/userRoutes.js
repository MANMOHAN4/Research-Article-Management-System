const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  updatePassword,
  deleteUser,
  getUserArticles,
  getUserReviews,
} = require("../controllers/userController");
const { errorHandler } = require("../middlewares/errorHandler");
const { requireAdmin } = require("../middlewares/adminMiddleware");

// GET /api/users
router.get("/", getAllUsers);

// GET /api/users/:id
router.get("/:id", getUserById);

// GET /api/users/:id/articles
router.get("/:id/articles", getUserArticles);

// GET /api/users/:id/reviews
router.get("/:id/reviews", getUserReviews);

// PUT /api/users/:id
router.put("/:id", updateUser);

// PUT /api/users/:id/password
router.put("/:id/password", updatePassword);

// DELETE /api/users/:id
router.delete("/:id", requireAdmin, deleteUser);

router.use(errorHandler);

module.exports = router;
