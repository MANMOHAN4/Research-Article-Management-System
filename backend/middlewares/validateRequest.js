const validateLoginRequest = (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }
  next();
};

const validateSignupRequest = (req, res, next) => {
  const { username, password, email } = req.body;
  if (!username || !password || !email) {
    return res
      .status(400)
      .json({ error: "Username, password, and email are required" });
  }
  next();
};

const validateArticleRequest = (req, res, next) => {
  const { title, authors } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (!authors || authors.length === 0) {
    return res.status(400).json({ error: "At least one author is required" });
  }
  next();
};

const validateReviewRequest = (req, res, next) => {
  const { articleId, reviewerName, reviewDate, recommendation } = req.body;
  if (!articleId || !reviewerName || !reviewDate || !recommendation) {
    return res.status(400).json({
      error:
        "ArticleID, Reviewer Name, Review Date, and Recommendation are required",
    });
  }
  next();
};

module.exports = {
  validateLoginRequest,
  validateSignupRequest,
  validateArticleRequest,
  validateReviewRequest,
};
