const express = require("express");
const router = express.Router();
const {
  login,
  signup,
  logout,
  changePassword,
} = require("../controllers/authController");
const { errorHandler } = require("../middlewares/errorHandler");
const {
  validateLoginRequest,
  validateSignupRequest,
} = require("../middlewares/validateRequest");

// POST /api/auth/login
router.post("/login", validateLoginRequest, login);

// POST /api/auth/signup
router.post("/signup", validateSignupRequest, signup);

// POST /api/auth/logout
router.post("/logout", logout);

// PUT /api/auth/change-password/:id
router.put("/change-password/:id", changePassword);

router.use(errorHandler);

module.exports = router;
