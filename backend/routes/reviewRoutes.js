const express = require("express");
const router = express.Router();
const {
  getAllReviews,
  getReviewsByArticle,
  createReview,
  updateReview,
  deleteReview,
  getReviewStatsByArticle,
  getReviewsByReviewer,
} = require("../controllers/reviewController");
const { errorHandler } = require("../middlewares/errorHandler");
const { validateReviewRequest } = require("../middlewares/validateRequest");

// GET /api/reviews
router.get("/", getAllReviews);

// GET /api/reviews/article/:id
router.get("/article/:id", getReviewsByArticle);

// GET /api/reviews/article/:id/stats
router.get("/article/:id/stats", getReviewStatsByArticle);

// GET /api/reviews/reviewer/:id
router.get("/reviewer/:id", getReviewsByReviewer);

// POST /api/reviews
router.post("/", validateReviewRequest, createReview);

// PUT /api/reviews/:id
router.put("/:id", updateReview);

// DELETE /api/reviews/:id
router.delete("/:id", deleteReview);

router.use(errorHandler);

module.exports = router;
