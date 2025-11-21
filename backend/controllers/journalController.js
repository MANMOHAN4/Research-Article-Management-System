const pool = require("../db/config");

const getAllJournals = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM Journal ORDER BY Name");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getJournalById = async (req, res) => {
  try {
    const [journal] = await pool.query(
      "SELECT * FROM Journal WHERE JournalID = ?",
      [req.params.id]
    );

    if (journal.length === 0) {
      return res.status(404).json({ error: "Journal not found" });
    }

    const [articles] = await pool.query(
      "SELECT * FROM ResearchArticle WHERE JournalID = ?",
      [req.params.id]
    );
    res.json({ ...journal[0], articles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createJournal = async (req, res) => {
  const { name, publisher, issn, impactFactor } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO Journal (Name, Publisher, ISSN, ImpactFactor) VALUES (?, ?, ?, ?)",
      [name, publisher, issn, impactFactor]
    );

    const [journal] = await pool.query(
      "SELECT * FROM Journal WHERE JournalID = ?",
      [result.insertId]
    );
    res.status(201).json(journal[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateJournal = async (req, res) => {
  const { name, publisher, issn, impactFactor } = req.body;

  try {
    const [result] = await pool.query(
      "UPDATE Journal SET Name = ?, Publisher = ?, ISSN = ?, ImpactFactor = ? WHERE JournalID = ?",
      [name, publisher, issn, impactFactor, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Journal not found" });
    }

    const [journal] = await pool.query(
      "SELECT * FROM Journal WHERE JournalID = ?",
      [req.params.id]
    );
    res.json(journal[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteJournal = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM Journal WHERE JournalID = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Journal not found" });
    }

    res.json({ message: "Journal deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllJournals,
  getJournalById,
  createJournal,
  updateJournal,
  deleteJournal,
};
