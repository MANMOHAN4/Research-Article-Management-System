const express = require("express");
const router = express.Router();
const {
  getAllArticles,
  searchArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
} = require("../controllers/articleController.js");
const { errorHandler } = require("../middlewares/errorHandler");
const { validateArticleRequest } = require("../middlewares/validateRequest");

// GET /api/articles
router.get("/", getAllArticles);

// GET /api/articles/search?q=...
router.get("/search", searchArticles);

// GET /api/articles/:id
router.get("/:id", getArticleById);

// POST /api/articles
router.post("/", validateArticleRequest, createArticle);

// PUT /api/articles/:id
router.put("/:id", validateArticleRequest, updateArticle);

// DELETE /api/articles/:id
router.delete("/:id", deleteArticle);

router.use(errorHandler);

module.exports = router;
