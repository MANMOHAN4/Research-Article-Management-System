const pool = require("../db/config");

/**
 * Get all articles with lossless join reconstruction
 * Joins: ResearchArticle ⋈ Journal ⋈ Conference ⋈ ArticleAuthor ⋈ Author ⋈ UserAccount ⋈ ArticleKeyword ⋈ Keyword
 */
const getAllArticles = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        ra.ArticleID, 
        ra.Title, 
        ra.Abstract, 
        ra.DOI,
        ra.SubmissionDate, 
        ra.Status, 
        ra.PublicationType,
        ra.JournalID, 
        ra.ConferenceID,
        j.Name AS JournalName,
        j.Publisher AS JournalPublisher,
        j.ImpactFactor,
        c.Name AS ConferenceName,
        c.Location AS ConferenceLocation,
        c.StartDate AS ConferenceStartDate,
        c.EndDate AS ConferenceEndDate,
        GROUP_CONCAT(
          DISTINCT COALESCE(u.Username, a.Name) 
          ORDER BY aa.AuthorID 
          SEPARATOR ', '
        ) AS Authors,
        GROUP_CONCAT(
          DISTINCT k.KeywordText 
          ORDER BY k.KeywordText 
          SEPARATOR ', '
        ) AS Keywords
      FROM ResearchArticle ra
      LEFT JOIN Journal j ON ra.JournalID = j.JournalID
      LEFT JOIN Conference c ON ra.ConferenceID = c.ConferenceID
      LEFT JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
      LEFT JOIN Author a ON aa.AuthorID = a.AuthorID
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      LEFT JOIN ArticleKeyword ak ON ra.ArticleID = ak.ArticleID
      LEFT JOIN Keyword k ON ak.KeywordID = k.KeywordID
      GROUP BY ra.ArticleID
      ORDER BY ra.SubmissionDate DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching articles:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Search articles using normalized keyword structure
 */
const searchArticles = async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: "Search query is required" });
  }

  try {
    const searchTerm = `%${q}%`;
    const [rows] = await pool.query(
      `
      SELECT DISTINCT
        ra.ArticleID, 
        ra.Title, 
        ra.Abstract, 
        ra.DOI,
        ra.SubmissionDate, 
        ra.Status,
        ra.PublicationType,
        j.Name AS JournalName,
        c.Name AS ConferenceName,
        GROUP_CONCAT(
          DISTINCT COALESCE(u.Username, a.Name) 
          ORDER BY a.Name 
          SEPARATOR ', '
        ) AS Authors,
        GROUP_CONCAT(
          DISTINCT k.KeywordText 
          ORDER BY k.KeywordText 
          SEPARATOR ', '
        ) AS Keywords
      FROM ResearchArticle ra
      LEFT JOIN Journal j ON ra.JournalID = j.JournalID
      LEFT JOIN Conference c ON ra.ConferenceID = c.ConferenceID
      LEFT JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
      LEFT JOIN Author a ON aa.AuthorID = a.AuthorID
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      LEFT JOIN ArticleKeyword ak ON ra.ArticleID = ak.ArticleID
      LEFT JOIN Keyword k ON ak.KeywordID = k.KeywordID
      WHERE ra.Title LIKE ? 
         OR ra.Abstract LIKE ? 
         OR COALESCE(u.Username, a.Name) LIKE ? 
         OR k.KeywordText LIKE ?
         OR j.Name LIKE ?
         OR c.Name LIKE ?
      GROUP BY ra.ArticleID
      ORDER BY ra.SubmissionDate DESC
      `,
      [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
    );
    res.json(rows);
  } catch (err) {
    console.error("Error searching articles:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get article by ID with full lossless join reconstruction
 */
const getArticleById = async (req, res) => {
  try {
    // Get article with journal/conference info
    const [articles] = await pool.query(
      `
      SELECT
        ra.*,
        j.Name AS JournalName, 
        j.Publisher, 
        j.ImpactFactor,
        j.ISSN,
        c.Name AS ConferenceName, 
        c.Location, 
        c.StartDate, 
        c.EndDate,
        article_age_days(ra.ArticleID) AS ArticleAgeDays
      FROM ResearchArticle ra
      LEFT JOIN Journal j ON ra.JournalID = j.JournalID
      LEFT JOIN Conference c ON ra.ConferenceID = c.ConferenceID
      WHERE ra.ArticleID = ?
      `,
      [req.params.id],
    );

    if (articles.length === 0) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Get authors with lossless join (Author ⋈ UserAccount)
    const [authors] = await pool.query(
      `
      SELECT 
        a.AuthorID,
        COALESCE(u.Username, a.Name) as Name,
        COALESCE(u.Email, 'N/A') as Email,
        COALESCE(u.Affiliation, a.Affiliation) as Affiliation,
        COALESCE(u.ORCID, a.ORCID) as ORCID,
        a.UserID,
        CASE WHEN a.UserID IS NOT NULL THEN 'Registered' ELSE 'Guest' END as UserType
      FROM Author a
      JOIN ArticleAuthor aa ON a.AuthorID = aa.AuthorID
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      WHERE aa.ArticleID = ?
      ORDER BY a.Name
      `,
      [req.params.id],
    );

    // Get keywords with lossless join (ArticleKeyword ⋈ Keyword)
    const [keywords] = await pool.query(
      `
      SELECT k.KeywordID, k.KeywordText
      FROM Keyword k
      JOIN ArticleKeyword ak ON k.KeywordID = ak.KeywordID
      WHERE ak.ArticleID = ?
      ORDER BY k.KeywordText
      `,
      [req.params.id],
    );

    // Get reviews with lossless join (Review ⋈ Reviewer ⋈ UserAccount)
    const [reviews] = await pool.query(
      `
      SELECT 
        r.*,
        COALESCE(u.Username, rev.Name) AS ReviewerName,
        COALESCE(u.Affiliation, rev.Affiliation) AS ReviewerAffiliation,
        rev.ExpertiseArea
      FROM Review r
      JOIN Reviewer rev ON r.ReviewerID = rev.ReviewerID
      LEFT JOIN UserAccount u ON rev.UserID = u.UserID
      WHERE r.ArticleID = ?
      ORDER BY r.ReviewDate DESC
      `,
      [req.params.id],
    );

    res.json({
      ...articles[0],
      authors,
      keywords,
      reviews,
    });
  } catch (err) {
    console.error("Error fetching article:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create article with normalized keywords
 */
const createArticle = async (req, res) => {
  const {
    title,
    abstract,
    doi,
    keywords, // Now expects array: ["keyword1", "keyword2"]
    submissionDate,
    status,
    publicationType,
    journalId,
    conferenceId,
    authors, // Array of author objects
  } = req.body;

  // Validation
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  if (!authors || authors.length === 0) {
    return res.status(400).json({ error: "At least one author is required" });
  }

  // Validate publication type consistency
  if (publicationType === "Journal" && !journalId) {
    return res.status(400).json({
      error: "Journal articles must have a JournalID",
    });
  }

  if (publicationType === "Conference" && !conferenceId) {
    return res.status(400).json({
      error: "Conference articles must have a ConferenceID",
    });
  }

  if (publicationType === "Journal" && conferenceId) {
    return res.status(400).json({
      error: "Journal articles cannot have a ConferenceID",
    });
  }

  if (publicationType === "Conference" && journalId) {
    return res.status(400).json({
      error: "Conference articles cannot have a JournalID",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Insert article
    const [result] = await conn.query(
      `
      INSERT INTO ResearchArticle 
      (Title, Abstract, DOI, SubmissionDate, Status, PublicationType, JournalID, ConferenceID)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        abstract || null,
        doi || null,
        submissionDate || new Date().toISOString().split("T")[0],
        status || "Submitted",
        publicationType || "Unpublished",
        journalId || null,
        conferenceId || null,
      ],
    );

    const articleId = result.insertId;

    // Handle keywords (normalized)
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      for (const keywordText of keywords) {
        const trimmedKeyword = keywordText.trim();
        if (!trimmedKeyword) continue;

        // Insert keyword if it doesn't exist (UNIQUE constraint prevents duplicates)
        await conn.query(
          "INSERT IGNORE INTO Keyword (KeywordText) VALUES (?)",
          [trimmedKeyword],
        );

        // Get keyword ID
        const [keywordResult] = await conn.query(
          "SELECT KeywordID FROM Keyword WHERE KeywordText = ?",
          [trimmedKeyword],
        );

        if (keywordResult.length > 0) {
          // Link article to keyword
          await conn.query(
            "INSERT IGNORE INTO ArticleKeyword (ArticleID, KeywordID) VALUES (?, ?)",
            [articleId, keywordResult[0].KeywordID],
          );
        }
      }
    }

    // Handle authors
    for (const author of authors) {
      let authorId;

      if (author.userId) {
        // Registered author - check if Author record exists
        const [existingAuthor] = await conn.query(
          "SELECT AuthorID FROM Author WHERE UserID = ?",
          [author.userId],
        );

        if (existingAuthor.length > 0) {
          authorId = existingAuthor[0].AuthorID;
        } else {
          // Create Author record linked to UserAccount
          const [authorResult] = await conn.query(
            "INSERT INTO Author (UserID) VALUES (?)",
            [author.userId],
          );
          authorId = authorResult.insertId;
        }
      } else {
        // Guest author - check by name
        const [existingAuthor] = await conn.query(
          "SELECT AuthorID FROM Author WHERE LOWER(Name) = LOWER(?) AND UserID IS NULL",
          [author.name.trim()],
        );

        if (existingAuthor.length > 0) {
          authorId = existingAuthor[0].AuthorID;
          // Optionally update affiliation/ORCID if provided
          if (author.affiliation || author.orcid) {
            await conn.query(
              "UPDATE Author SET Affiliation = COALESCE(?, Affiliation), ORCID = COALESCE(?, ORCID) WHERE AuthorID = ?",
              [
                author.affiliation?.trim() || null,
                author.orcid?.trim() || null,
                authorId,
              ],
            );
          }
        } else {
          // Create new guest author
          const [authorResult] = await conn.query(
            "INSERT INTO Author (Name, Affiliation, ORCID) VALUES (?, ?, ?)",
            [
              author.name.trim(),
              author.affiliation?.trim() || null,
              author.orcid?.trim() || null,
            ],
          );
          authorId = authorResult.insertId;
        }
      }

      // Link author to article
      await conn.query(
        "INSERT INTO ArticleAuthor (ArticleID, AuthorID) VALUES (?, ?)",
        [articleId, authorId],
      );
    }

    await conn.commit();

    // Return the created article with full details
    const [article] = await conn.query(
      `
      SELECT 
        ra.*,
        GROUP_CONCAT(
          DISTINCT COALESCE(u.Username, a.Name) 
          ORDER BY a.Name 
          SEPARATOR ', '
        ) as Authors,
        GROUP_CONCAT(
          DISTINCT k.KeywordText 
          ORDER BY k.KeywordText 
          SEPARATOR ', '
        ) as Keywords
      FROM ResearchArticle ra
      LEFT JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
      LEFT JOIN Author a ON aa.AuthorID = a.AuthorID
      LEFT JOIN UserAccount u ON a.UserID = u.UserID
      LEFT JOIN ArticleKeyword ak ON ra.ArticleID = ak.ArticleID
      LEFT JOIN Keyword k ON ak.KeywordID = k.KeywordID
      WHERE ra.ArticleID = ?
      GROUP BY ra.ArticleID
      `,
      [articleId],
    );

    res.status(201).json({
      message: "Article created successfully",
      article: article[0],
    });
  } catch (err) {
    await conn.rollback();
    console.error("Error creating article:", err);
    res.status(500).json({
      error: "Failed to create article",
      message: err.message,
    });
  } finally {
    conn.release();
  }
};

/**
 * Update article
 */
const updateArticle = async (req, res) => {
  const {
    title,
    abstract,
    doi,
    keywords,
    submissionDate,
    status,
    publicationType,
    journalId,
    conferenceId,
  } = req.body;

  // Validate publication type consistency
  if (publicationType === "Journal" && !journalId) {
    return res.status(400).json({
      error: "Journal articles must have a JournalID",
    });
  }

  if (publicationType === "Conference" && !conferenceId) {
    return res.status(400).json({
      error: "Conference articles must have a ConferenceID",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Update article
    const [result] = await conn.query(
      `
      UPDATE ResearchArticle
      SET Title = ?, Abstract = ?, DOI = ?,
          SubmissionDate = ?, Status = ?, PublicationType = ?,
          JournalID = ?, ConferenceID = ?
      WHERE ArticleID = ?
      `,
      [
        title,
        abstract || null,
        doi || null,
        submissionDate,
        status,
        publicationType || "Unpublished",
        journalId || null,
        conferenceId || null,
        req.params.id,
      ],
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Article not found" });
    }

    // Update keywords if provided
    if (keywords && Array.isArray(keywords)) {
      // Remove old keywords
      await conn.query("DELETE FROM ArticleKeyword WHERE ArticleID = ?", [
        req.params.id,
      ]);

      // Add new keywords
      for (const keywordText of keywords) {
        const trimmedKeyword = keywordText.trim();
        if (!trimmedKeyword) continue;

        await conn.query(
          "INSERT IGNORE INTO Keyword (KeywordText) VALUES (?)",
          [trimmedKeyword],
        );

        const [keywordResult] = await conn.query(
          "SELECT KeywordID FROM Keyword WHERE KeywordText = ?",
          [trimmedKeyword],
        );

        if (keywordResult.length > 0) {
          await conn.query(
            "INSERT IGNORE INTO ArticleKeyword (ArticleID, KeywordID) VALUES (?, ?)",
            [req.params.id, keywordResult[0].KeywordID],
          );
        }
      }
    }

    await conn.commit();

    // Return updated article
    const [article] = await conn.query(
      `
      SELECT 
        ra.*,
        GROUP_CONCAT(
          DISTINCT k.KeywordText 
          ORDER BY k.KeywordText 
          SEPARATOR ', '
        ) as Keywords
      FROM ResearchArticle ra
      LEFT JOIN ArticleKeyword ak ON ra.ArticleID = ak.ArticleID
      LEFT JOIN Keyword k ON ak.KeywordID = k.KeywordID
      WHERE ra.ArticleID = ?
      GROUP BY ra.ArticleID
      `,
      [req.params.id],
    );

    res.json({
      message: "Article updated successfully",
      article: article[0],
    });
  } catch (err) {
    await conn.rollback();
    console.error("Error updating article:", err);
    res.status(500).json({
      error: "Failed to update article",
      message: err.message,
    });
  } finally {
    conn.release();
  }
};

/**
 * Delete article (CASCADE will handle ArticleAuthor, ArticleKeyword, etc.)
 */
const deleteArticle = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM ResearchArticle WHERE ArticleID = ?",
      [req.params.id],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Article not found" });
    }

    res.json({
      message: "Article deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting article:", err);
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
