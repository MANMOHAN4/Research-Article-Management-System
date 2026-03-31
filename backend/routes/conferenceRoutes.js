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

// GET /api/conferences
router.get("/", getAllConferences);

// GET /api/conferences/:id
router.get("/:id", getConferenceById);

// POST /api/conferences
router.post("/", createConference);

// PUT /api/conferences/:id
router.put("/:id", updateConference);

// DELETE /api/conferences/:id
router.delete("/:id", deleteConference);

router.use(errorHandler);

module.exports = router;
