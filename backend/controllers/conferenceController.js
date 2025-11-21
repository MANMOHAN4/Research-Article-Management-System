const pool = require("../db/config");

const getAllConferences = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM Conference ORDER BY StartDate DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createConference = async (req, res) => {
  const { name, location, startDate, endDate } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO Conference (Name, Location, StartDate, EndDate) VALUES (?, ?, ?, ?)",
      [name, location, startDate, endDate]
    );

    const [conf] = await pool.query(
      "SELECT * FROM Conference WHERE ConferenceID = ?",
      [result.insertId]
    );
    res.status(201).json(conf[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateConference = async (req, res) => {
  const { name, location, startDate, endDate } = req.body;

  try {
    const [result] = await pool.query(
      "UPDATE Conference SET Name = ?, Location = ?, StartDate = ?, EndDate = ? WHERE ConferenceID = ?",
      [name, location, startDate, endDate, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Conference not found" });
    }

    const [conference] = await pool.query(
      "SELECT * FROM Conference WHERE ConferenceID = ?",
      [req.params.id]
    );
    res.json(conference[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteConference = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM Conference WHERE ConferenceID = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Conference not found" });
    }

    res.json({ message: "Conference deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getAllConferences,
  createConference,
  updateConference,
  deleteConference,
};
