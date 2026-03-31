const express = require("express");
const router = express.Router();
const {
  getAllAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  deleteAuthor,
  linkAuthorToUser,
} = require("../controllers/authorController");
const { errorHandler } = require("../middlewares/errorHandler");

// GET /api/authors
router.get("/", getAllAuthors);

// GET /api/authors/:id
router.get("/:id", getAuthorById);

// POST /api/authors
router.post("/", createAuthor);

// PUT /api/authors/:id
router.put("/:id", updateAuthor);

// DELETE /api/authors/:id
router.delete("/:id", deleteAuthor);

// PUT /api/authors/:id/link-user
router.put("/:id/link-user", linkAuthorToUser);

router.use(errorHandler);

module.exports = router;
