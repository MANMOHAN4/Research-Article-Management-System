const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db/config");
const { performanceMonitor } = require("./middlewares/performanceMonitor");

// Wrap DB pool
performanceMonitor.wrapPool(pool);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Performance API tracking
app.use(performanceMonitor.expressMiddleware());

// Routes
app.use("/api/articles", require("./routes/articleRoutes"));
app.use("/api/authors", require("./routes/authorRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/citations", require("./routes/citationRoutes"));
app.use("/api/conferences", require("./routes/conferenceRoutes"));
app.use("/api/journals", require("./routes/journalRoutes"));
app.use("/api/reviewers", require("./routes/reviewerRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/stats", require("./routes/statsRoutes"));
app.use("/api/users", require("./routes/userRoutes"));

// ✅ Performance routes
app.use("/api/admin/performance", require("./routes/performanceRoutes"));

// Health
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    monitoring: "enabled",
    timestamp: new Date().toISOString(),
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
