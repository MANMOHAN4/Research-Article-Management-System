const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db/config");
const { performanceMonitor } = require("./middlewares/performanceMonitor");

performanceMonitor.wrapPool(pool);

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5173"
)
  .split(",")
  .map((o) => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // Postman / curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
};

app.use(cors(corsOptions));

// ✅ Express 5 compatible preflight wildcard
app.options("/{*path}", cors(corsOptions));

// ── Body parser ───────────────────────────────────────────────────────────────
app.use(express.json());

// ── Performance tracking ──────────────────────────────────────────────────────
app.use(performanceMonitor.expressMiddleware());

// ── API Routes ────────────────────────────────────────────────────────────────
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

// ── Performance admin routes ──────────────────────────────────────────────────
app.use("/api/admin/performance", require("./routes/performanceRoutes"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    monitoring: "enabled",
    timestamp: new Date().toISOString(),
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.message?.startsWith("CORS:")) {
    return res.status(403).json({ error: err.message });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
});

module.exports = app;
