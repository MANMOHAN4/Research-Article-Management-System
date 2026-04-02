const express = require("express");
const router = express.Router();
const {
  getAllJournals,
  getJournalById,
  createJournal,
  updateJournal,
  deleteJournal,
} = require("../controllers/journalController");
const { errorHandler } = require("../middlewares/errorHandler");
const { requireAdmin } = require("../middlewares/adminMiddleware");

// GET /api/journals
router.get("/", getAllJournals);

// GET /api/journals/:id
router.get("/:id", getJournalById);

// POST /api/journals
router.post("/", createJournal);

// PUT /api/journals/:id
router.put("/:id", updateJournal);

// DELETE /api/journals/:id
router.delete("/:id", requireAdmin, deleteJournal);

router.use(errorHandler);

module.exports = router;
