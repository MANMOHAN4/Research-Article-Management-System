const express = require("express");
const router = express.Router();
const { login, signup } = require("../controllers/authController");
const {
  validateLoginRequest,
  validateSignupRequest,
} = require("../middlewares/validateRequest");

router.post("/login", validateLoginRequest, login);
router.post("/signup", validateSignupRequest, signup);

module.exports = router;
