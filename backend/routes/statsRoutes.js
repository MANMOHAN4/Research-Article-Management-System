const express = require("express");
const router = express.Router();
const { getStats, getHealth } = require("../controllers/statsController");

router.get("/stats", getStats);
router.get("/health", getHealth);

module.exports = router;
