// ============================================================
// PERFORMANCE ROUTES
// ============================================================
// All performance monitoring endpoints
// Mounted at: /api/admin/performance
// ============================================================

const express = require("express");
const router = express.Router();
const pool = require("../db/config");
const { performanceMonitor } = require("../middlewares/performanceMonitor");
const { errorHandler } = require("../middlewares/errorHandler"); // ✅ ADD THIS

// ============================================================
// GET /api/admin/performance/summary
// ============================================================
router.get("/summary", async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const summary = await performanceMonitor.getPerformanceSummary(hours);

    if (!summary) {
      return res
        .status(500)
        .json({ error: "Failed to get performance summary" });
    }

    res.json({
      period: `Last ${hours} hours`,
      ...summary,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error getting performance summary:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/admin/performance/slow-queries
// ============================================================
router.get("/slow-queries", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const slowQueries = await performanceMonitor.getSlowQueries(limit);

    res.json({
      count: slowQueries.length,
      queries: slowQueries,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error getting slow queries:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/admin/performance/health
// ============================================================
router.get("/health", async (req, res) => {
  try {
    const health = await performanceMonitor.getHealthScore();

    if (!health) {
      return res.status(500).json({ error: "Failed to get health score" });
    }

    const score = health.HealthScore || 0;
    let status;
    if (score >= 90) status = "Excellent";
    else if (score >= 70) status = "Good";
    else if (score >= 50) status = "Fair";
    else status = "Poor";

    res.json({
      ...health,
      status,
      recommendation:
        score < 70
          ? "Consider optimizing slow queries"
          : "System performing well",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error getting health score:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/admin/performance/database-stats
// ============================================================
router.get("/database-stats", async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        TABLE_NAME,
        TABLE_ROWS,
        ROUND(DATA_LENGTH / 1024 / 1024, 2) AS DataSizeMB,
        ROUND(INDEX_LENGTH / 1024 / 1024, 2) AS IndexSizeMB,
        ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS TotalSizeMB
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = 'research_article_management'
        AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
    `);

    res.json({
      tables: stats,
      totalTables: stats.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error getting database stats:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/admin/performance/test-slow-query
// ✅ CHANGE: Guard with NODE_ENV to prevent production pollution
// ============================================================
router.get("/test-slow-query", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      error: "This endpoint is disabled in production",
    });
  }

  try {
    console.log("Testing slow query...");
    const [result] = await pool.query(`
      SELECT SLEEP(2) AS SlowTest, 'This was a slow query' AS Message
    `);

    res.json({
      message: "Slow query executed (2 seconds)",
      result: result[0],
      note: "Check PerformanceSlowQueries table or /slow-queries endpoint",
    });
  } catch (err) {
    console.error("Error in test:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/admin/performance/dashboard
// ============================================================
router.get("/dashboard", async (req, res) => {
  try {
    const [dashboard] = await pool.query(
      `SELECT * FROM v_performance_dashboard`,
    );

    res.json({
      dashboard: dashboard[0] || null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error getting dashboard:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/admin/performance/alerts
// ============================================================
router.get("/alerts", async (req, res) => {
  try {
    const [alerts] = await pool.query(`
      SELECT 
        AlertID,
        AlertType,
        Severity,
        AlertMessage,
        MetricValue,
        ThresholdValue,
        CreatedAt
      FROM PerformanceAlerts
      WHERE IsResolved = FALSE
      ORDER BY Severity DESC, CreatedAt DESC
      LIMIT 20
    `);

    res.json({
      count: alerts.length,
      alerts,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error getting alerts:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ ADD: Consistent with all other route files
router.use(errorHandler);

module.exports = router;
