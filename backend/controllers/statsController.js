const pool = require("../db/config");

const getStats = async (req, res) => {
  try {
    const [articles] = await pool.query(
      "SELECT COUNT(*) as count FROM ResearchArticle"
    );
    const [authors] = await pool.query("SELECT COUNT(*) as count FROM Author");
    const [journals] = await pool.query(
      "SELECT COUNT(*) as count FROM Journal"
    );
    const [conferences] = await pool.query(
      "SELECT COUNT(*) as count FROM Conference"
    );
    const [reviews] = await pool.query("SELECT COUNT(*) as count FROM Review");
    const [reviewers] = await pool.query(
      "SELECT COUNT(*) as count FROM Reviewer"
    );

    res.json({
      articles: articles[0].count,
      authors: authors[0].count,
      journals: journals[0].count,
      conferences: conferences[0].count,
      reviews: reviews[0].count,
      reviewers: reviewers[0].count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getHealth = (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    uptime: process.uptime(),
  });
};

module.exports = { getStats, getHealth };
