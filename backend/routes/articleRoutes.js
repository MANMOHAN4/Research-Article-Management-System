const express = require("express");
const router = express.Router();
const {
  getAllArticles,
  searchArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
} = require("../controllers/articleController");
const { validateArticleRequest } = require("../middlewares/validateRequest");

router.get("/", getAllArticles);
router.get("/search", searchArticles);
router.get("/:id", getArticleById);
router.post("/", validateArticleRequest, createArticle);
router.put("/:id", updateArticle);
router.delete("/:id", deleteArticle);

module.exports = router;
