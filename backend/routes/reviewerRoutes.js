const express = require("express");
const router = express.Router();
const {
  getAllReviewers,
  getReviewerById,
  createReviewer,
  updateReviewer,
  deleteReviewer,
} = require("../controllers/reviewerController");

router.get("/", getAllReviewers);
router.get("/:id", getReviewerById);
router.post("/", createReviewer);
router.put("/:id", updateReviewer);
router.delete("/:id", deleteReviewer);

module.exports = router;
