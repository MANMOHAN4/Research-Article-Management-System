const express = require("express");
const router = express.Router();
const {
  getAllReviews,
  getReviewsByArticle,
  createReview,
  updateReview,
  deleteReview,
} = require("../controllers/reviewController");
const { validateReviewRequest } = require("../middlewares/validateRequest");

router.get("/", getAllReviews);
router.post("/", validateReviewRequest, createReview);
router.put("/:id", updateReview);
router.delete("/:id", deleteReview);

module.exports = router;
