const pool = require("../db/config");

const getAllAuthors = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM Author ORDER BY Name");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAuthorById = async (req, res) => {
  try {
    const [author] = await pool.query(
      "SELECT * FROM Author WHERE AuthorID = ?",
      [req.params.id]
    );

    if (author.length === 0) {
      return res.status(404).json({ error: "Author not found" });
    }

    const [articles] = await pool.query(
      `
      SELECT ra.*
      FROM ResearchArticle ra
      JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
      WHERE aa.AuthorID = ?
      `,
      [req.params.id]
    );

    res.json({ ...author[0], articles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createAuthor = async (req, res) => {
  const { name, affiliation, orcid, userId } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO Author (Name, Affiliation, ORCID, UserID) VALUES (?, ?, ?, ?)",
      [name, affiliation, orcid, userId || null]
    );

    const [author] = await pool.query(
      "SELECT * FROM Author WHERE AuthorID = ?",
      [result.insertId]
    );
    res.status(201).json(author[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateAuthor = async (req, res) => {
  const { name, affiliation, orcid } = req.body;

  try {
    const [result] = await pool.query(
      "UPDATE Author SET Name = ?, Affiliation = ?, ORCID = ? WHERE AuthorID = ?",
      [name, affiliation, orcid, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Author not found" });
    }

    const [author] = await pool.query(
      "SELECT * FROM Author WHERE AuthorID = ?",
      [req.params.id]
    );
    res.json(author[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteAuthor = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM Author WHERE AuthorID = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Author not found" });
    }

    res.json({ message: "Author deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllAuthors,
  getAuthorById,
  createAuthor,
  updateAuthor,
  deleteAuthor,
};
