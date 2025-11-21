const express = require("express");
const router = express.Router();
const {
  getAllConferences,
  getConferenceById,
  createConference,
  updateConference,
  deleteConference,
} = require("../controllers/conferenceController");

router.get("/", getAllConferences);
router.post("/", createConference);
router.put("/:id", updateConference);
router.delete("/:id", deleteConference);

module.exports = router;
