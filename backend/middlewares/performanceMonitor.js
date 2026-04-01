// ============================================================
// PERFORMANCE MONITORING MIDDLEWARE (FIXED - this context bug resolved)
// ============================================================

const pool = require("../db/config");

class PerformanceMonitor {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.slowQueryThreshold = options.slowQueryThreshold || 500;
    this.logAllQueries = options.logAllQueries !== false; // default TRUE
    this.sampleRate = options.sampleRate || 1.0;
    this.excludePatterns = options.excludePatterns || [
      "PerformanceQueryLog",
      "PerformanceSlowQueries",
      "PerformanceAlerts",
      "PerformanceHourlyMetrics",
      "PerformanceHealthSnapshots",
      "PerformanceTableStats",
      "SHOW",
      "EXPLAIN",
    ];

    // FIX: Bind all methods to this instance at construction time
    // This prevents "self._shouldExclude is not a function" when called
    // from inside db.query = async function(...) where `this` is lost
    this._shouldExclude = this._shouldExclude.bind(this);
    this._extractQueryType = this._extractQueryType.bind(this);
    this._extractTableName = this._extractTableName.bind(this);
    this._logQuery = this._logQuery.bind(this);
    this._startHourlyAggregation = this._startHourlyAggregation.bind(this);

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

      const startTime = Date.now();
      const originalEnd = res.end;

      res.end = (...args) => {
        const duration = Date.now() - startTime;
        console.log(`[API] ${req.method} ${req.path} - ${duration}ms`);

        if (duration > 500) {
          pool
            .query(
              `INSERT INTO PerformanceAlerts
               (AlertType, Severity, AlertMessage, MetricValue, ThresholdValue)
             VALUES (?, ?, ?, ?, ?)`,
              [
                "API",
                duration > 2000 ? "CRITICAL" : "WARNING",
                `Slow API: ${req.method} ${req.path}`,
                duration,
                500,
              ],
            )
            .catch((err) =>
              console.error("[Perf] Alert insert error:", err.message),
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
    // Capture everything needed as local variables — zero reliance on `this` or `self`
    // inside the replacement function, so context loss is impossible
    const enabled = this.enabled;
    const sampleRate = this.sampleRate;
    const shouldExclude = this._shouldExclude; // already bound in constructor
    const logQuery = this._logQuery; // already bound in constructor
    const originalQuery = db.query.bind(db);

    db.query = async function (...args) {
      if (!enabled) return originalQuery(...args);

      if (Math.random() > sampleRate) return originalQuery(...args);

      const queryText =
        typeof args[0] === "string" ? args[0] : args[0]?.sql || "";

      // Use the bound method captured above — no `self` needed
      if (shouldExclude(queryText)) return originalQuery(...args);

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
        // Fire-and-forget — pass originalQuery so _logQuery can write
        // without going through the wrapped version (avoids infinite loop)
        logQuery(queryText, duration, result, error, originalQuery);
      }
    };

    return db;
  }

  // ============================================================
  // LOG QUERY
  // ============================================================
  _logQuery(queryText, duration, result, error, originalQuery) {
    if (!this.logAllQueries && duration < this.slowQueryThreshold) return;

    const queryType = this._extractQueryType(queryText);
    const tableName = this._extractTableName(queryText);
    const truncated = queryText.trim().substring(0, 1000);
    const rowsAffected =
      result && result[0]
        ? Array.isArray(result[0])
          ? result[0].length
          : result[0].affectedRows || 0
        : 0;

    // 1. Log every qualifying query
    originalQuery(
      `INSERT INTO PerformanceQueryLog
         (QueryText, QueryType, TableName, ExecutionTimeMs, RowsAffected)
       VALUES (?, ?, ?, ?, ?)`,
      [truncated, queryType, tableName, duration, rowsAffected],
    ).catch((err) =>
      console.error("[Perf] QueryLog insert error:", err.message),
    );

    // 2. Upsert slow queries
    if (duration > this.slowQueryThreshold) {
      console.warn(
        `[SLOW QUERY] ${duration.toFixed(2)}ms | table: ${tableName || "unknown"}`,
      );

      originalQuery(
        `INSERT INTO PerformanceSlowQueries
           (QueryText, TableName, ExecutionTimeMs, OccurrenceCount, LastSeenAt)
         VALUES (?, ?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE
           ExecutionTimeMs = GREATEST(ExecutionTimeMs, VALUES(ExecutionTimeMs)),
           OccurrenceCount = OccurrenceCount + 1,
           LastSeenAt      = NOW()`,
        [truncated.substring(0, 255), tableName, duration],
      ).catch((err) =>
        console.error("[Perf] SlowQuery upsert error:", err.message),
      );
    }

    // 3. Update per-table stats
    if (tableName) {
      originalQuery(
        `INSERT INTO PerformanceTableStats
           (TableName, TotalQueries, AvgQueryTimeMs, RowCount)
         VALUES (?, 1, ?, ?)
         ON DUPLICATE KEY UPDATE
           TotalQueries   = TotalQueries + 1,
           AvgQueryTimeMs = ((AvgQueryTimeMs * (TotalQueries - 1)) + VALUES(AvgQueryTimeMs)) / TotalQueries,
           RowCount       = CASE
             WHEN VALUES(RowCount) > 0 THEN VALUES(RowCount)
             ELSE RowCount
           END`,
        [tableName, duration, rowsAffected],
      ).catch((err) =>
        console.error("[Perf] TableStats upsert error:", err.message),
      );
    }
  }

  // ============================================================
  // HOURLY AGGREGATION + HEALTH SNAPSHOT
  // ============================================================
  _startHourlyAggregation() {
    const run = async () => {
      try {
        // Aggregate last hour → PerformanceHourlyMetrics
        await pool.query(`
          INSERT INTO PerformanceHourlyMetrics
            (MetricHour, TotalQueries, AvgExecutionTimeMs, MaxExecutionTimeMs,
             MinExecutionTimeMs, SlowQueryCount, ErrorCount,
             SelectQueryCount, InsertQueryCount, UpdateQueryCount, DeleteQueryCount)
          SELECT
            DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 HOUR), '%Y-%m-%d %H:00:00'),
            COUNT(*),
            ROUND(AVG(ExecutionTimeMs), 2),
            MAX(ExecutionTimeMs),
            MIN(ExecutionTimeMs),
            SUM(ExecutionTimeMs > 500),
            0,
            SUM(QueryType = 'SELECT'),
            SUM(QueryType = 'INSERT'),
            SUM(QueryType = 'UPDATE'),
            SUM(QueryType = 'DELETE')
          FROM PerformanceQueryLog
          WHERE CreatedAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            AND CreatedAt  < NOW()
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

        // Compute health score and snapshot it
        const [[summary]] = await pool.query(`
          SELECT
            COUNT(*)                       AS total,
            SUM(ExecutionTimeMs > 500)     AS slow,
            ROUND(AVG(ExecutionTimeMs), 2) AS avg_ms
          FROM PerformanceQueryLog
          WHERE CreatedAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `);

        if (summary && summary.total > 0) {
          const slowRatio = (summary.slow || 0) / summary.total;
          const speedScore = Math.max(0, 100 - summary.avg_ms / 10);
          const slowPenalty = slowRatio * 50;
          const health = Math.min(100, Math.max(0, speedScore - slowPenalty));

          await pool.query(
            `INSERT INTO PerformanceHealthSnapshots (HealthScore) VALUES (?)`,
            [Math.round(health)],
          );

          console.log(
            `[Perf] Snapshot — queries: ${summary.total}, ` +
              `avg: ${summary.avg_ms}ms, health: ${Math.round(health)}/100`,
          );
        }
      } catch (err) {
        console.error("[Perf] Hourly aggregation error:", err.message);
      }
    };

    // Run 1 min after startup, then every 60 min
    setTimeout(run, 60_000);
    setInterval(run, 60 * 60_000);
  }

  // ============================================================
  // HELPERS
  // ============================================================
  _shouldExclude(query) {
    const lower = query.toLowerCase();
    return this.excludePatterns.some((p) => lower.includes(p.toLowerCase()));
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
    for (const p of patterns) {
      const m = query.match(p);
      if (m?.[1]) return m[1];
    }
    return null;
  }

  // ============================================================
  // DASHBOARD HELPERS
  // ============================================================
  async getPerformanceSummary(hours = 24) {
    try {
      const [[res]] = await pool.query(
        `SELECT
           COUNT(*)                        AS TotalQueries,
           ROUND(AVG(ExecutionTimeMs), 2)  AS AvgTimeMs,
           MAX(ExecutionTimeMs)            AS MaxTimeMs,
           SUM(ExecutionTimeMs > 500)      AS SlowQueries
         FROM PerformanceQueryLog
         WHERE CreatedAt > DATE_SUB(NOW(), INTERVAL ? HOUR)`,
        [hours],
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
        [limit],
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
// EXPORT SINGLETON
// ============================================================
const performanceMonitor = new PerformanceMonitor({
  enabled: true,
  slowQueryThreshold: 500,
  logAllQueries: true,
  sampleRate: 1.0,
});

module.exports = { performanceMonitor, PerformanceMonitor };
