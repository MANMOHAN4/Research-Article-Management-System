const pool = require("../db/config");

/**
 * Get overall system statistics with lossless joins
 */
const getStats = async (req, res) => {
  try {
    const [articles] = await pool.query(
      "SELECT COUNT(*) as count FROM ResearchArticle",
    );

    const [authors] = await pool.query("SELECT COUNT(*) as count FROM Author");

    const [registeredAuthors] = await pool.query(
      "SELECT COUNT(*) as count FROM Author WHERE UserID IS NOT NULL",
    );

    const [guestAuthors] = await pool.query(
      "SELECT COUNT(*) as count FROM Author WHERE UserID IS NULL",
    );

    const [journals] = await pool.query(
      "SELECT COUNT(*) as count FROM Journal",
    );

    const [conferences] = await pool.query(
      "SELECT COUNT(*) as count FROM Conference",
    );

    const [reviews] = await pool.query("SELECT COUNT(*) as count FROM Review");

    const [reviewers] = await pool.query(
      "SELECT COUNT(*) as count FROM Reviewer",
    );

    const [registeredReviewers] = await pool.query(
      "SELECT COUNT(*) as count FROM Reviewer WHERE UserID IS NOT NULL",
    );

    const [guestReviewers] = await pool.query(
      "SELECT COUNT(*) as count FROM Reviewer WHERE UserID IS NULL",
    );

    const [users] = await pool.query(
      "SELECT COUNT(*) as count FROM UserAccount",
    );

    const [keywords] = await pool.query(
      "SELECT COUNT(*) as count FROM Keyword",
    );

    const [citations] = await pool.query(
      "SELECT COUNT(*) as count FROM Citation",
    );

    // Article status breakdown
    const [statusBreakdown] = await pool.query(`
      SELECT Status, COUNT(*) as Count
      FROM ResearchArticle
      GROUP BY Status
    `);

    // Publication type breakdown
    const [publicationTypeBreakdown] = await pool.query(`
      SELECT PublicationType, COUNT(*) as Count
      FROM ResearchArticle
      GROUP BY PublicationType
    `);

    res.json({
      overview: {
        articles: articles[0].count,
        authors: authors[0].count,
        registeredAuthors: registeredAuthors[0].count,
        guestAuthors: guestAuthors[0].count,
        journals: journals[0].count,
        conferences: conferences[0].count,
        reviews: reviews[0].count,
        reviewers: reviewers[0].count,
        registeredReviewers: registeredReviewers[0].count,
        guestReviewers: guestReviewers[0].count,
        users: users[0].count,
        keywords: keywords[0].count,
        citations: citations[0].count,
      },
      articleStatusBreakdown: statusBreakdown,
      publicationTypeBreakdown: publicationTypeBreakdown,
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get detailed article statistics
 */
const getArticleStats = async (req, res) => {
  try {
    // Most cited articles
    const [mostCited] = await pool.query(`
      SELECT 
        ra.ArticleID,
        ra.Title,
        ra.DOI,
        COUNT(c.CitationID) as CitationCount,
        GROUP_CONCAT(
          DISTINCT COALESCE(u.Username, a.Name) 
          ORDER BY a.Name 
          SEPARATOR ', '
        ) AS Authors
      FROM ResearchArticle ra
      LEFT JOIN Citation c ON ra.ArticleID = c.CitedArticleID
      LEFT JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
      LEFT JOIN Author a ON aa.AuthorID = a.AuthorID
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      GROUP BY ra.ArticleID
      HAVING CitationCount > 0
      ORDER BY CitationCount DESC
      LIMIT 10
    `);

    // Most reviewed articles
    const [mostReviewed] = await pool.query(`
      SELECT 
        ra.ArticleID,
        ra.Title,
        ra.Status,
        COUNT(r.ReviewID) as ReviewCount
      FROM ResearchArticle ra
      LEFT JOIN Review r ON ra.ArticleID = r.ArticleID
      GROUP BY ra.ArticleID
      HAVING ReviewCount > 0
      ORDER BY ReviewCount DESC
      LIMIT 10
    `);

    // Articles by publication type
    const [byPublicationType] = await pool.query(`
      SELECT 
        PublicationType,
        COUNT(*) as Count,
        AVG(DATEDIFF(CURDATE(), SubmissionDate)) as AvgAgeDays
      FROM ResearchArticle
      GROUP BY PublicationType
    `);

    res.json({
      mostCited,
      mostReviewed,
      byPublicationType,
    });
  } catch (err) {
    console.error("Error fetching article stats:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get author statistics with lossless join
 */
const getAuthorStats = async (req, res) => {
  try {
    // Most prolific authors
    const [mostProlific] = await pool.query(`
      SELECT 
        a.AuthorID,
        COALESCE(u.Username, a.Name) as Name,
        COALESCE(u.Affiliation, a.Affiliation) as Affiliation,
        COUNT(aa.ArticleID) as ArticleCount,
        CASE 
          WHEN a.UserID IS NOT NULL THEN 'Registered' 
          ELSE 'Guest' 
        END as AuthorType
      FROM Author a
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      LEFT JOIN ArticleAuthor aa ON a.AuthorID = aa.AuthorID
      GROUP BY a.AuthorID
      HAVING ArticleCount > 0
      ORDER BY ArticleCount DESC
      LIMIT 10
    `);

    // Authors by affiliation
    const [byAffiliation] = await pool.query(`
      SELECT 
        COALESCE(u.Affiliation, a.Affiliation, 'Unknown') as Affiliation,
        COUNT(DISTINCT a.AuthorID) as AuthorCount,
        COUNT(DISTINCT aa.ArticleID) as ArticleCount
      FROM Author a
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      LEFT JOIN ArticleAuthor aa ON a.AuthorID = aa.AuthorID
      GROUP BY COALESCE(u.Affiliation, a.Affiliation)
      HAVING AuthorCount > 0
      ORDER BY ArticleCount DESC
      LIMIT 10
    `);

    res.json({
      mostProlific,
      byAffiliation,
    });
  } catch (err) {
    console.error("Error fetching author stats:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get reviewer statistics with lossless join
 */
const getReviewerStats = async (req, res) => {
  try {
    // Most active reviewers
    const [mostActive] = await pool.query(`
      SELECT 
        r.ReviewerID,
        COALESCE(u.Username, r.Name) as Name,
        COALESCE(u.Affiliation, r.Affiliation) as Affiliation,
        r.ExpertiseArea,
        COUNT(rev.ReviewID) as ReviewCount,
        CASE 
          WHEN r.UserID IS NOT NULL THEN 'Registered' 
          ELSE 'Guest' 
        END as ReviewerType
      FROM Reviewer r
      LEFT JOIN UserAccount u ON r.UserID = u.UserID
      LEFT JOIN Review rev ON r.ReviewerID = rev.ReviewerID
      GROUP BY r.ReviewerID
      HAVING ReviewCount > 0
      ORDER BY ReviewCount DESC
      LIMIT 10
    `);

    // Review recommendations breakdown
    const [recommendationBreakdown] = await pool.query(`
      SELECT 
        Recommendation,
        COUNT(*) as Count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Review), 2) as Percentage
      FROM Review
      GROUP BY Recommendation
      ORDER BY Count DESC
    `);

    res.json({
      mostActive,
      recommendationBreakdown,
    });
  } catch (err) {
    console.error("Error fetching reviewer stats:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get keyword statistics (normalized keyword table)
 */
const getKeywordStats = async (req, res) => {
  try {
    // Most used keywords
    const [mostUsed] = await pool.query(`
      SELECT 
        k.KeywordID,
        k.KeywordText,
        COUNT(ak.ArticleID) as ArticleCount
      FROM Keyword k
      LEFT JOIN ArticleKeyword ak ON k.KeywordID = ak.KeywordID
      GROUP BY k.KeywordID
      HAVING ArticleCount > 0
      ORDER BY ArticleCount DESC
      LIMIT 20
    `);

    // Total unique keywords
    const [total] = await pool.query(`
      SELECT COUNT(*) as TotalKeywords
      FROM Keyword
    `);

    res.json({
      mostUsed,
      totalKeywords: total[0].TotalKeywords,
    });
  } catch (err) {
    console.error("Error fetching keyword stats:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get journal statistics
 */
const getJournalStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        j.JournalID,
        j.Name,
        j.Publisher,
        j.ImpactFactor,
        COUNT(ra.ArticleID) as ArticleCount
      FROM Journal j
      LEFT JOIN ResearchArticle ra ON j.JournalID = ra.JournalID
      GROUP BY j.JournalID
      ORDER BY ArticleCount DESC
      LIMIT 10
    `);

    res.json(stats);
  } catch (err) {
    console.error("Error fetching journal stats:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get conference statistics
 */
const getConferenceStats = async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        c.ConferenceID,
        c.Name,
        c.Location,
        c.StartDate,
        COUNT(ra.ArticleID) as ArticleCount
      FROM Conference c
      LEFT JOIN ResearchArticle ra ON c.ConferenceID = ra.ConferenceID
      GROUP BY c.ConferenceID
      ORDER BY ArticleCount DESC
      LIMIT 10
    `);

    res.json(stats);
  } catch (err) {
    console.error("Error fetching conference stats:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Health check endpoint
 */
const getHealth = (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    uptime: process.uptime(),
    database: "research_article_management",
    features: {
      losslessJoinDecomposition: true,
      normalizedKeywords: true,
      publicationTypeEnforcement: true,
      authorReviewerNormalization: true,
    },
  });
};

module.exports = {
  getStats,
  getArticleStats,
  getAuthorStats,
  getReviewerStats,
  getKeywordStats,
  getJournalStats,
  getConferenceStats,
  getHealth,
};
