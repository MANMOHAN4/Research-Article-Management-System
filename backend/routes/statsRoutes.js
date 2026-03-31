const express = require("express");
const router = express.Router();
const {
  getStats,
  getArticleStats,
  getAuthorStats,
  getReviewerStats,
  getKeywordStats,
  getJournalStats,
  getConferenceStats,
  getHealth,
} = require("../controllers/statsController");
const { errorHandler } = require("../middlewares/errorHandler");

// GET /api/stats
router.get("/", getStats);

// GET /api/stats/health
router.get("/health", getHealth);

// GET /api/stats/articles
router.get("/articles", getArticleStats);

// GET /api/stats/authors
router.get("/authors", getAuthorStats);

// GET /api/stats/reviewers
router.get("/reviewers", getReviewerStats);

// GET /api/stats/keywords
router.get("/keywords", getKeywordStats);

// GET /api/stats/journals
router.get("/journals", getJournalStats);

// GET /api/stats/conferences
router.get("/conferences", getConferenceStats);

router.use(errorHandler);

module.exports = router;
