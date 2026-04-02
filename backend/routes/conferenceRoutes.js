const express = require("express");
const router = express.Router();
const {
  getAllConferences,
  getConferenceById,
  createConference,
  updateConference,
  deleteConference,
} = require("../controllers/conferenceController");
const { errorHandler } = require("../middlewares/errorHandler");
const { requireAdmin } = require("../middlewares/adminMiddleware");

// GET /api/conferences
router.get("/", getAllConferences);

// GET /api/conferences/:id
router.get("/:id", getConferenceById);

// POST /api/conferences
router.post("/", createConference);

// PUT /api/conferences/:id
router.put("/:id", updateConference);

// DELETE /api/conferences/:id
router.delete("/:id", requireAdmin, deleteConference);

router.use(errorHandler);

module.exports = router;
