const express = require("express");
const router = express.Router();
const {
  getCitationsByArticle,
  getCitedByArticle,
  createCitation,
  deleteCitation,
  getCitationStats,
  getCitationNetwork,
  getMutualCitations,
  batchCreateCitations,
} = require("../controllers/citationController");
const { errorHandler } = require("../middlewares/errorHandler");

// GET /api/citations/stats
router.get("/stats", getCitationStats);

// GET /api/citations/mutual
router.get("/mutual", getMutualCitations);

// GET /api/citations/article/:id          — articles this article cites
router.get("/article/:id", getCitationsByArticle);

// GET /api/citations/cited-by/:id         — articles that cite this article
router.get("/cited-by/:id", getCitedByArticle);

// GET /api/citations/network/:id
router.get("/network/:id", getCitationNetwork);

// POST /api/citations
router.post("/", createCitation);

// POST /api/citations/batch
router.post("/batch", batchCreateCitations);

// DELETE /api/citations/:id
router.delete("/:id", deleteCitation);

router.use(errorHandler);

module.exports = router;
