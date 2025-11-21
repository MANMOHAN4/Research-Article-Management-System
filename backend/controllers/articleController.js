const pool = require("../db/config");

const getAllArticles = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        ra.ArticleID, ra.Title, ra.Abstract, ra.DOI, ra.Keywords,
        ra.SubmissionDate, ra.Status, ra.JournalID, ra.ConferenceID,
        j.Name AS JournalName, c.Name AS ConferenceName,
        GROUP_CONCAT(DISTINCT a.Name ORDER BY a.Name SEPARATOR ', ') AS Authors
      FROM ResearchArticle ra
      LEFT JOIN Journal j ON ra.JournalID = j.JournalID
      LEFT JOIN Conference c ON ra.ConferenceID = c.ConferenceID
      LEFT JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
      LEFT JOIN Author a ON aa.AuthorID = a.AuthorID
      GROUP BY ra.ArticleID
      ORDER BY ra.SubmissionDate DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const searchArticles = async (req, res) => {
  const { q } = req.query;
  try {
    const searchTerm = `%${q}%`;
    const [rows] = await pool.query(
      `
      SELECT
        ra.ArticleID, ra.Title, ra.Abstract, ra.DOI, ra.Keywords,
        ra.SubmissionDate, ra.Status,
        j.Name,
        GROUP_CONCAT(DISTINCT a.Name SEPARATOR ', ') AS Authors
      FROM ResearchArticle ra
      LEFT JOIN Journal j ON ra.JournalID = j.JournalID
      LEFT JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
      LEFT JOIN Author a ON aa.AuthorID = a.AuthorID
      WHERE ra.Title LIKE ? OR ra.Keywords LIKE ? OR ra.Abstract LIKE ? OR a.Name LIKE ? OR j.Name LIKE ?
      GROUP BY ra.ArticleID
      `,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getArticleById = async (req, res) => {
  try {
    const [articles] = await pool.query(
      `
      SELECT
        ra.*,
        j.Name AS JournalName, j.Publisher, j.ImpactFactor,
        c.Name AS ConferenceName, c.Location, c.StartDate, c.EndDate,
        -- use the MySQL function you defined
        article_age_days(ra.ArticleID) AS ArticleAgeDays
      FROM ResearchArticle ra
      LEFT JOIN Journal j ON ra.JournalID = j.JournalID
      LEFT JOIN Conference c ON ra.ConferenceID = c.ConferenceID
      WHERE ra.ArticleID = ?
      `,
      [req.params.id]
    );

    if (articles.length === 0) {
      return res.status(404).json({ error: "Article not found" });
    }

    const [authors] = await pool.query(
      `
      SELECT a.AuthorID, a.Name, a.Affiliation, a.ORCID
      FROM Author a
      JOIN ArticleAuthor aa ON a.AuthorID = aa.AuthorID
      WHERE aa.ArticleID = ?
      `,
      [req.params.id]
    );

    const [reviews] = await pool.query(
      `
      SELECT r.*, rev.Name AS ReviewerName
      FROM Review r
      JOIN Reviewer rev ON r.ReviewerID = rev.ReviewerID
      WHERE r.ArticleID = ?
      `,
      [req.params.id]
    );

    // include ArticleAgeDays field along with authors and reviews
    res.json({ ...articles[0], authors, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createArticle = async (req, res) => {
  const {
    title,
    abstract,
    doi,
    keywords,
    submissionDate,
    status,
    journalId,
    conferenceId,
    authors,
  } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `
      INSERT INTO ResearchArticle (Title, Abstract, DOI, Keywords, SubmissionDate, Status, JournalID, ConferenceID)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        abstract,
        doi,
        keywords,
        submissionDate || new Date(),
        status || "Submitted",
        journalId || null,
        conferenceId || null,
      ]
    );

    const articleId = result.insertId;

    for (const author of authors) {
      const [existingAuthor] = await conn.query(
        "SELECT AuthorID FROM Author WHERE LOWER(Name) = LOWER(?)",
        [author.name.trim()]
      );

      let authorId;
      if (existingAuthor.length > 0) {
        authorId = existingAuthor[0].AuthorID;
      } else {
        const [authorResult] = await conn.query(
          "INSERT INTO Author (Name, Affiliation, ORCID) VALUES (?, ?, ?)",
          [
            author.name.trim(),
            author.affiliation?.trim() || null,
            author.orcid?.trim() || null,
          ]
        );
        authorId = authorResult.insertId;
      }

      await conn.query(
        "INSERT INTO ArticleAuthor (ArticleID, AuthorID) VALUES (?, ?)",
        [articleId, authorId]
      );
    }

    await conn.commit();

    const [article] = await conn.query(
      "SELECT * FROM ResearchArticle WHERE ArticleID = ?",
      [articleId]
    );
    res.status(201).json(article[0]);
  } catch (err) {
    await conn.rollback();
    console.error("Error creating article:", err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
};

const updateArticle = async (req, res) => {
  const {
    title,
    abstract,
    doi,
    keywords,
    submissionDate,
    status,
    journalId,
    conferenceId,
  } = req.body;

  try {
    const [result] = await pool.query(
      `
      UPDATE ResearchArticle
      SET Title = ?, Abstract = ?, DOI = ?, Keywords = ?,
          SubmissionDate = ?, Status = ?, JournalID = ?, ConferenceID = ?
      WHERE ArticleID = ?
      `,
      [
        title,
        abstract,
        doi,
        keywords,
        submissionDate,
        status,
        journalId || null,
        conferenceId || null,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Article not found" });
    }

    const [article] = await pool.query(
      "SELECT * FROM ResearchArticle WHERE ArticleID = ?",
      [req.params.id]
    );
    res.json(article[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteArticle = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM ResearchArticle WHERE ArticleID = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.json({ message: "Article deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllArticles,
  searchArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
};
