const express = require("express");
const router = express.Router();
const {
  getAllJournals,
  getJournalById,
  createJournal,
  updateJournal,
  deleteJournal,
} = require("../controllers/journalController");

router.get("/", getAllJournals);
router.post("/", createJournal);
router.put("/:id", updateJournal);
router.delete("/:id", deleteJournal);

module.exports = router;
