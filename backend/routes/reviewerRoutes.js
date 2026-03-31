const express = require("express");
const router = express.Router();
const {
  getAllReviewers,
  getReviewerById,
  createReviewer,
  updateReviewer,
  deleteReviewer,
  linkReviewerToUser,
} = require("../controllers/reviewerController");
const { errorHandler } = require("../middlewares/errorHandler");

// GET /api/reviewers
router.get("/", getAllReviewers);

// GET /api/reviewers/:id
router.get("/:id", getReviewerById);

// POST /api/reviewers
router.post("/", createReviewer);

// PUT /api/reviewers/:id
router.put("/:id", updateReviewer);

// DELETE /api/reviewers/:id
router.delete("/:id", deleteReviewer);

// PUT /api/reviewers/:id/link-user
router.put("/:id/link-user", linkReviewerToUser);

router.use(errorHandler);

module.exports = router;
