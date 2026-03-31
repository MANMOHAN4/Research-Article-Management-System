// ============================================================
// PERFORMANCE MONITORING MIDDLEWARE (FINAL VERSION)
// ============================================================

const pool = require("../db/config");

class PerformanceMonitor {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.slowQueryThreshold = options.slowQueryThreshold || 1000; // ms
    this.logAllQueries = options.logAllQueries || false;
    this.sampleRate = options.sampleRate || 1.0;
    this.excludePatterns = options.excludePatterns || [
      "PerformanceQueryLog",
      "PerformanceSlowQueries",
      "PerformanceAlerts",
      "SHOW",
      "EXPLAIN",
    ];
  }

  // ============================================================
  // EXPRESS MIDDLEWARE (API PERFORMANCE)
  // ============================================================
  expressMiddleware() {
    return (req, res, next) => {
      if (!this.enabled) return next();

      const startTime = Date.now();
      const originalEnd = res.end;

      res.end = (...args) => {
        const duration = Date.now() - startTime;

        // Log API performance
        console.log(`[API] ${req.method} ${req.path} - ${duration}ms`);

        // Log slow API calls
        if (duration > 500) {
          pool
            .query(
              `INSERT INTO PerformanceAlerts 
            (AlertType, Severity, AlertMessage, MetricValue, ThresholdValue)
            VALUES (?, ?, ?, ?, ?)`,
              [
                "API",
                duration > 2000 ? "CRITICAL" : "WARNING",
                `${req.method} ${req.path}`,
                duration,
                500,
              ],
            )
            .catch((err) =>
              console.error("Error logging API alert:", err.message),
            );
        }

        originalEnd.apply(res, args);
      };

      next();
    };
  }

  // ============================================================
  // DATABASE QUERY WRAPPER
  // ============================================================
  wrapPool(db) {
    const self = this;
    const originalQuery = db.query.bind(db);

    db.query = async function (...args) {
      if (!self.enabled) {
        return originalQuery(...args);
      }

      // Sampling
      if (Math.random() > self.sampleRate) {
        return originalQuery(...args);
      }

      const queryText =
        typeof args[0] === "string" ? args[0] : args[0]?.sql || "";

      // Skip internal queries
      if (self._shouldExclude(queryText)) {
        return originalQuery(...args);
      }

      const start = process.hrtime.bigint();
      let result;
      let error = null;

      try {
        result = await originalQuery(...args);
        return result;
      } catch (err) {
        error = err;
        throw err;
      } finally {
        const duration = Number(process.hrtime.bigint() - start) / 1_000_000;

        self._logQuery(queryText, duration, result, error);
      }
    };

    return db;
  }

  // ============================================================
  // LOG QUERY PERFORMANCE
  // ============================================================
  async _logQuery(queryText, duration, result, error) {
    try {
      if (!this.logAllQueries && duration < this.slowQueryThreshold) {
        return;
      }

      const queryType = this._extractQueryType(queryText);
      const tableName = this._extractTableName(queryText);

      const rowsAffected =
        result && result[0]
          ? Array.isArray(result[0])
            ? result[0].length
            : result[0].affectedRows || 0
          : 0;

      await pool.query(`CALL log_query_performance(?, ?, ?, ?, ?, ?)`, [
        queryText.substring(0, 1000), // avoid huge logs
        queryType,
        tableName,
        duration,
        rowsAffected,
        null,
      ]);

      // Console warning
      if (duration > this.slowQueryThreshold) {
        console.warn(
          `[SLOW QUERY] ${duration.toFixed(2)}ms | ${tableName || "unknown"}`,
        );
      }
    } catch (err) {
      console.error("Logging error:", err.message);
    }
  }

  // ============================================================
  // HELPERS
  // ============================================================

  _shouldExclude(query) {
    return this.excludePatterns.some((pattern) =>
      query.toLowerCase().includes(pattern.toLowerCase()),
    );
  }

  _extractQueryType(query) {
    const q = query.trim().toUpperCase();

    if (q.startsWith("SELECT")) return "SELECT";
    if (q.startsWith("INSERT")) return "INSERT";
    if (q.startsWith("UPDATE")) return "UPDATE";
    if (q.startsWith("DELETE")) return "DELETE";
    if (q.startsWith("CALL")) return "CALL";

    return "OTHER";
  }

  _extractTableName(query) {
    const patterns = [
      /FROM\s+`?(\w+)`?/i,
      /INTO\s+`?(\w+)`?/i,
      /UPDATE\s+`?(\w+)`?/i,
      /DELETE\s+FROM\s+`?(\w+)`?/i,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) return match[1];
    }

    return null;
  }

  // ============================================================
  // DASHBOARD HELPERS
  // ============================================================

  async getPerformanceSummary(hours = 24) {
    try {
      const [res] = await pool.query(
        `
        SELECT 
          COUNT(*) AS TotalQueries,
          ROUND(AVG(ExecutionTimeMs),2) AS AvgTimeMs,
          MAX(ExecutionTimeMs) AS MaxTimeMs,
          SUM(CASE WHEN ExecutionTimeMs > 1000 THEN 1 ELSE 0 END) AS SlowQueries
        FROM PerformanceQueryLog
        WHERE CreatedAt > DATE_SUB(NOW(), INTERVAL ? HOUR)
      `,
        [hours],
      );

      return res[0];
    } catch (err) {
      console.error("Summary error:", err.message);
      return null;
    }
  }

  async getSlowQueries(limit = 10) {
    try {
      const [res] = await pool.query(
        `
        SELECT 
          QueryText,
          TableName,
          ExecutionTimeMs,
          OccurrenceCount,
          LastSeenAt
        FROM PerformanceSlowQueries
        WHERE IsOptimized = FALSE
        ORDER BY ExecutionTimeMs DESC
        LIMIT ?
      `,
        [limit],
      );

      return res;
    } catch (err) {
      console.error("Slow query error:", err.message);
      return [];
    }
  }

  async getHealthScore() {
    try {
      const [res] = await pool.query(`SELECT * FROM v_performance_dashboard`);
      return res[0];
    } catch (err) {
      console.error("Health error:", err.message);
      return null;
    }
  }
}

// ============================================================
// EXPORT INSTANCE
// ============================================================

const performanceMonitor = new PerformanceMonitor({
  enabled: true, // keep true for demo
  slowQueryThreshold: 1000,
  logAllQueries: false,
  sampleRate: 1.0,
});

module.exports = { performanceMonitor, PerformanceMonitor };
