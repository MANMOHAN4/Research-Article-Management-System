const express = require("express");
const router = express.Router();
const {
  getCitationsByArticle,
  getCitedByArticle,
  createCitation,
  deleteCitation,
  getCitationStats,
} = require("../controllers/citationController");

router.get("/articles/:id/citations", getCitationsByArticle);
router.get("/articles/:id/cited-by", getCitedByArticle);
router.get("/stats", getCitationStats);
router.post("/", createCitation);
router.delete("/:id", deleteCitation);

module.exports = router;
