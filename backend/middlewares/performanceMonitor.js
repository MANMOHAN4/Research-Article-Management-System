// ============================================================
// PERFORMANCE MONITORING MIDDLEWARE (FIXED VERSION)
// ============================================================
// FIXES:
//   1. logAllQueries now defaults to true — logs all queries, not just slow ones
//   2. Removed CALL log_query_performance() — procedure doesn't exist in schema
//   3. Direct INSERTs into PerformanceQueryLog, PerformanceSlowQueries,
//      PerformanceTableStats, PerformanceHourlyMetrics, PerformanceHealthSnapshots
//   4. All DB writes are fire-and-forget (.catch()) — app never crashes on logging errors
// ============================================================

const pool = require("../db/config");

class PerformanceMonitor {
  constructor(options = {}) {
    this.enabled             = options.enabled !== false;
    this.slowQueryThreshold  = options.slowQueryThreshold || 500; // lowered to 500ms
    this.logAllQueries       = options.logAllQueries !== false;   // FIX: default TRUE
    this.sampleRate          = options.sampleRate || 1.0;
    this.excludePatterns     = options.excludePatterns || [
      "PerformanceQueryLog",
      "PerformanceSlowQueries",
      "PerformanceAlerts",
      "PerformanceHourlyMetrics",
      "PerformanceHealthSnapshots",
      "PerformanceTableStats",
      "SHOW",
      "EXPLAIN",
    ];

    // Start hourly aggregation job (runs every 60 minutes)
    if (this.enabled) {
      this._startHourlyAggregation();
    }
  }

  // ============================================================
  // EXPRESS MIDDLEWARE (API PERFORMANCE)
  // ============================================================
  expressMiddleware() {
    return (req, res, next) => {
      if (!this.enabled) return next();

      const startTime  = Date.now();
      const originalEnd = res.end;

      res.end = (...args) => {
        const duration = Date.now() - startTime;
        console.log(`[API] ${req.method} ${req.path} - ${duration}ms`);

        // Log slow API calls as alerts
        if (duration > 500) {
          pool.query(
            `INSERT INTO PerformanceAlerts
              (AlertType, Severity, AlertMessage, MetricValue, ThresholdValue)
             VALUES (?, ?, ?, ?, ?)`,
            [
              "API",
              duration > 2000 ? "CRITICAL" : "WARNING",
              `Slow API: ${req.method} ${req.path}`,
              duration,
              500,
            ]
          ).catch(err => console.error("[Perf] Alert insert error:", err.message));
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
      if (!self.enabled) return originalQuery(...args);

      // Sampling
      if (Math.random() > self.sampleRate) return originalQuery(...args);

      const queryText = typeof args[0] === "string"
        ? args[0]
        : args[0]?.sql || "";

      // Skip internal monitoring queries
      if (self._shouldExclude(queryText)) return originalQuery(...args);

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
        // Fire-and-forget — never await, never crash the app
        self._logQuery(queryText, duration, result, error, originalQuery);
      }
    };

    return db;
  }

  // ============================================================
  // LOG QUERY (direct INSERT — no stored procedure)
  // ============================================================
  _logQuery(queryText, duration, result, error, originalQuery) {
    // FIX: always log if logAllQueries is true OR if the query is slow
    if (!this.logAllQueries && duration < this.slowQueryThreshold) return;

    const queryType  = this._extractQueryType(queryText);
    const tableName  = this._extractTableName(queryText);
    const truncated  = queryText.trim().substring(0, 1000);

    const rowsAffected = result && result[0]
      ? Array.isArray(result[0])
        ? result[0].length
        : result[0].affectedRows || 0
      : 0;

    // 1️⃣ Always insert into PerformanceQueryLog
    originalQuery(
      `INSERT INTO PerformanceQueryLog
         (QueryText, QueryType, TableName, ExecutionTimeMs, RowsAffected)
       VALUES (?, ?, ?, ?, ?)`,
      [truncated, queryType, tableName, duration, rowsAffected]
    ).catch(err => console.error("[Perf] QueryLog insert error:", err.message));

    // 2️⃣ If slow: upsert into PerformanceSlowQueries
    if (duration > this.slowQueryThreshold) {
      console.warn(`[SLOW QUERY] ${duration.toFixed(2)}ms | table: ${tableName || "unknown"}`);

      originalQuery(
        `INSERT INTO PerformanceSlowQueries
           (QueryText, TableName, ExecutionTimeMs, OccurrenceCount, LastSeenAt)
         VALUES (?, ?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE
           ExecutionTimeMs = GREATEST(ExecutionTimeMs, VALUES(ExecutionTimeMs)),
           OccurrenceCount = OccurrenceCount + 1,
           LastSeenAt      = NOW()`,
        [truncated.substring(0, 255), tableName, duration]
      ).catch(err => console.error("[Perf] SlowQuery upsert error:", err.message));
    }

    // 3️⃣ Update PerformanceTableStats per-table counters
    if (tableName) {
      originalQuery(
        `INSERT INTO PerformanceTableStats
           (TableName, TotalQueries, AvgQueryTimeMs, RowCount)
         VALUES (?, 1, ?, ?)
         ON DUPLICATE KEY UPDATE
           TotalQueries  = TotalQueries + 1,
           AvgQueryTimeMs = ((AvgQueryTimeMs * (TotalQueries - 1)) + VALUES(AvgQueryTimeMs)) / TotalQueries,
           RowCount      = CASE
             WHEN VALUES(RowCount) > 0 THEN VALUES(RowCount)
             ELSE RowCount
           END`,
        [tableName, duration, rowsAffected]
      ).catch(err => console.error("[Perf] TableStats upsert error:", err.message));
    }
  }

  // ============================================================
  // HOURLY AGGREGATION JOB
  // Aggregates PerformanceQueryLog → PerformanceHourlyMetrics
  // and records a new PerformanceHealthSnapshot every 60 minutes
  // ============================================================
  _startHourlyAggregation() {
    const run = async () => {
      try {
        // Aggregate last hour into PerformanceHourlyMetrics
        await pool.query(`
          INSERT INTO PerformanceHourlyMetrics
            (MetricHour, TotalQueries, AvgExecutionTimeMs, MaxExecutionTimeMs,
             MinExecutionTimeMs, SlowQueryCount, ErrorCount,
             SelectQueryCount, InsertQueryCount, UpdateQueryCount, DeleteQueryCount)
          SELECT
            DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 HOUR), '%Y-%m-%d %H:00:00') AS MetricHour,
            COUNT(*)                                                              AS TotalQueries,
            ROUND(AVG(ExecutionTimeMs), 2)                                        AS AvgExecMs,
            MAX(ExecutionTimeMs)                                                  AS MaxExecMs,
            MIN(ExecutionTimeMs)                                                  AS MinExecMs,
            SUM(ExecutionTimeMs > 500)                                            AS SlowCount,
            0                                                                     AS ErrorCount,
            SUM(QueryType = 'SELECT')                                             AS SelectCount,
            SUM(QueryType = 'INSERT')                                             AS InsertCount,
            SUM(QueryType = 'UPDATE')                                             AS UpdateCount,
            SUM(QueryType = 'DELETE')                                             AS DeleteCount
          FROM PerformanceQueryLog
          WHERE CreatedAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            AND CreatedAt <  NOW()
          ON DUPLICATE KEY UPDATE
            TotalQueries       = VALUES(TotalQueries),
            AvgExecutionTimeMs = VALUES(AvgExecutionTimeMs),
            MaxExecutionTimeMs = VALUES(MaxExecutionTimeMs),
            MinExecutionTimeMs = VALUES(MinExecutionTimeMs),
            SlowQueryCount     = VALUES(SlowQueryCount),
            SelectQueryCount   = VALUES(SelectQueryCount),
            InsertQueryCount   = VALUES(InsertQueryCount),
            UpdateQueryCount   = VALUES(UpdateQueryCount),
            DeleteQueryCount   = VALUES(DeleteQueryCount)
        `);

        // Compute a simple health score (0-100) and snapshot it
        const [[summary]] = await pool.query(`
          SELECT
            COUNT(*)                                  AS total,
            SUM(ExecutionTimeMs > 500)                AS slow,
            ROUND(AVG(ExecutionTimeMs), 2)            AS avg_ms
          FROM PerformanceQueryLog
          WHERE CreatedAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `);

        if (summary.total > 0) {
          const slowRatio   = (summary.slow || 0) / summary.total;
          const speedScore  = Math.max(0, 100 - (summary.avg_ms / 10)); // penalty per 10ms avg
          const slowPenalty = slowRatio * 50;
          const healthScore = Math.min(100, Math.max(0, speedScore - slowPenalty));

          await pool.query(
            `INSERT INTO PerformanceHealthSnapshots (HealthScore) VALUES (?)`,
            [Math.round(healthScore)]
          );

          console.log(
            `[Perf] Hourly snapshot — queries: ${summary.total}, ` +
            `avg: ${summary.avg_ms}ms, health: ${Math.round(healthScore)}/100`
          );
        }
      } catch (err) {
        console.error("[Perf] Hourly aggregation error:", err.message);
      }
    };

    // Run once 1 minute after startup, then every 60 minutes
    setTimeout(run, 60_000);
    setInterval(run, 60 * 60_000);
  }

  // ============================================================
  // DASHBOARD HELPERS
  // ============================================================
  async getPerformanceSummary(hours = 24) {
    try {
      const [[res]] = await pool.query(
        `SELECT
           COUNT(*)                                       AS TotalQueries,
           ROUND(AVG(ExecutionTimeMs), 2)                 AS AvgTimeMs,
           MAX(ExecutionTimeMs)                           AS MaxTimeMs,
           SUM(ExecutionTimeMs > 500)                     AS SlowQueries
         FROM PerformanceQueryLog
         WHERE CreatedAt > DATE_SUB(NOW(), INTERVAL ? HOUR)`,
        [hours]
      );
      return res;
    } catch (err) {
      console.error("[Perf] Summary error:", err.message);
      return null;
    }
  }

  async getSlowQueries(limit = 10) {
    try {
      const [res] = await pool.query(
        `SELECT QueryText, TableName, ExecutionTimeMs, OccurrenceCount, LastSeenAt
         FROM PerformanceSlowQueries
         WHERE IsOptimized = FALSE
         ORDER BY ExecutionTimeMs DESC
         LIMIT ?`,
        [limit]
      );
      return res;
    } catch (err) {
      console.error("[Perf] Slow query error:", err.message);
      return [];
    }
  }

  async getHealthScore() {
    try {
      const [[res]] = await pool.query(`SELECT * FROM v_performance_dashboard`);
      return res;
    } catch (err) {
      console.error("[Perf] Health error:", err.message);
      return null;
    }
  }
}

// ============================================================
// EXPORT INSTANCE
// ============================================================
const performanceMonitor = new PerformanceMonitor({
  enabled:            true,
  slowQueryThreshold: 500,    // flag queries > 500ms as slow
  logAllQueries:      true,   // FIX: log every query, not just slow ones
  sampleRate:         1.0,
});

module.exports = { performanceMonitor, PerformanceMonitor };
