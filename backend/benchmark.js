// ============================================================
// BENCHMARK SCRIPT — Run BEFORE and AFTER clustered indexes
// Usage:
//   node benchmark.js before   → saves results/before.json
//   node benchmark.js after    → saves results/after.json
//   node benchmark.js compare  → prints comparison report
// ============================================================

require("dotenv").config();
const mysql = require("mysql2/promise");
const fs    = require("fs");
const path  = require("path");

const RESULTS_DIR = path.join(__dirname, "results");
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR);

// ── DB connection (plain pool, bypasses performanceMonitor) ─────────────────
async function getConn() {
  return mysql.createPool({
    host:     process.env.DB_HOST     || "localhost",
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME     || "research_article_management",
    waitForConnections: true,
    connectionLimit: 5,
  });
}

// ── Time a single query N times, return stats ────────────────────────────────
async function bench(pool, label, sql, params = [], runs = 50) {
  // Warm up (2 runs, not counted)
  for (let i = 0; i < 2; i++) await pool.execute(sql, params);

  const times = [];
  for (let i = 0; i < runs; i++) {
    const t = process.hrtime.bigint();
    await pool.execute(sql, params);
    times.push(Number(process.hrtime.bigint() - t) / 1_000_000);
  }

  times.sort((a, b) => a - b);
  const avg    = times.reduce((s, x) => s + x, 0) / times.length;
  const median = times[Math.floor(times.length / 2)];
  const p95    = times[Math.floor(times.length * 0.95)];
  const min    = times[0];
  const max    = times[times.length - 1];

  return { label, avg: +avg.toFixed(3), median: +median.toFixed(3),
           p95: +p95.toFixed(3), min: +min.toFixed(3), max: +max.toFixed(3), runs };
}

// ── EXPLAIN — captures index usage ──────────────────────────────────────────
async function explain(pool, label, sql, params = []) {
  const [rows] = await pool.execute(`EXPLAIN ${sql}`, params);
  return {
    label,
    type:     rows[0]?.type,
    key:      rows[0]?.key  || "(none)",
    key_len:  rows[0]?.key_len,
    rows_est: rows[0]?.rows,
    extra:    rows[0]?.Extra,
  };
}

// ── Benchmark suite — all major queries in the system ────────────────────────
async function runSuite(pool) {
  const results  = [];
  const explains = [];
  const RUNS     = 100;

  const suite = [
    // ── 1. Fetch all articles (list view) ──────────────────────────────────
    {
      label: "GET all articles",
      sql: `SELECT ra.ArticleID, ra.Title, ra.Status, ra.SubmissionDate,
                   ra.PublicationType, j.Name AS JournalName
            FROM ResearchArticle ra
            LEFT JOIN Journal j ON ra.JournalID = j.JournalID
            ORDER BY ra.SubmissionDate DESC
            LIMIT 50`,
      params: [],
    },
    // ── 2. Fetch single article by PK (most common) ────────────────────────
    {
      label: "GET article by ID (PK lookup)",
      sql: `SELECT ra.*, j.Name AS JournalName, j.ImpactFactor,
                   c.Name AS ConferenceName, c.Location
            FROM ResearchArticle ra
            LEFT JOIN Journal j ON ra.JournalID = j.JournalID
            LEFT JOIN Conference c ON ra.ConferenceID = c.ConferenceID
            WHERE ra.ArticleID = ?`,
      params: [1],
    },
    // ── 3. Filter articles by Status ───────────────────────────────────────
    {
      label: "GET articles by Status",
      sql: `SELECT ArticleID, Title, Status, SubmissionDate
            FROM ResearchArticle
            WHERE Status = ?
            ORDER BY SubmissionDate DESC`,
      params: ["Submitted"],
    },
    // ── 4. Filter articles by PublicationType + Status ─────────────────────
    {
      label: "GET articles by PublicationType + Status (composite)",
      sql: `SELECT ArticleID, Title, Status, SubmissionDate
            FROM ResearchArticle
            WHERE PublicationType = ? AND Status = ?
            ORDER BY SubmissionDate DESC`,
      params: ["Journal", "Accepted"],
    },
    // ── 5. FULLTEXT search on title + abstract ─────────────────────────────
    {
      label: "FULLTEXT search title+abstract",
      sql: `SELECT ArticleID, Title, Status,
                   MATCH(Title, Abstract) AGAINST(? IN NATURAL LANGUAGE MODE) AS score
            FROM ResearchArticle
            WHERE MATCH(Title, Abstract) AGAINST(? IN NATURAL LANGUAGE MODE)
            ORDER BY score DESC
            LIMIT 20`,
      params: ["machine learning", "machine learning"],
    },
    // ── 6. Get authors for an article (join) ───────────────────────────────
    {
      label: "GET authors for article (join)",
      sql: `SELECT a.AuthorID, COALESCE(u.Username, a.Name) AS Name,
                   COALESCE(u.Affiliation, a.Affiliation) AS Affiliation
            FROM Author a
            JOIN ArticleAuthor aa ON a.AuthorID = aa.AuthorID
            LEFT JOIN UserAccount u ON a.UserID = u.UserID
            WHERE aa.ArticleID = ?`,
      params: [1],
    },
    // ── 7. Get reviews for article ─────────────────────────────────────────
    {
      label: "GET reviews for article",
      sql: `SELECT r.ReviewID, r.Recommendation, r.ReviewDate,
                   COALESCE(u.Username, rev.Name) AS ReviewerName
            FROM Review r
            JOIN Reviewer rev ON r.ReviewerID = rev.ReviewerID
            LEFT JOIN UserAccount u ON rev.UserID = u.UserID
            WHERE r.ArticleID = ?
            ORDER BY r.ReviewDate DESC`,
      params: [1],
    },
    // ── 8. Stats — article count by status ────────────────────────────────
    {
      label: "AGGREGATE articles by status",
      sql: `SELECT Status, COUNT(*) AS Count
            FROM ResearchArticle
            GROUP BY Status
            ORDER BY Count DESC`,
      params: [],
    },
    // ── 9. Most cited articles ─────────────────────────────────────────────
    {
      label: "Most cited articles (citation join + COUNT)",
      sql: `SELECT ra.ArticleID, ra.Title, COUNT(c.CitationID) AS CitationCount
            FROM ResearchArticle ra
            LEFT JOIN Citation c ON ra.ArticleID = c.CitedArticleID
            GROUP BY ra.ArticleID
            ORDER BY CitationCount DESC
            LIMIT 10`,
      params: [],
    },
    // ── 10. User lookup by username (login) ────────────────────────────────
    {
      label: "UserAccount lookup by Username (login)",
      sql: `SELECT UserID, Username, PasswordHash, Role
            FROM UserAccount
            WHERE Username = ?`,
      params: ["admin"],
    },
  ];

  console.log(`\nRunning ${suite.length} queries × ${RUNS} runs each...\n`);

  for (const q of suite) {
    process.stdout.write(`  ⏱  ${q.label}...`);
    const r = await bench(pool, q.label, q.sql, q.params, RUNS);
    const e = await explain(pool, q.label, q.sql, q.params);
    results.push(r);
    explains.push(e);
    console.log(` avg=${r.avg}ms  p95=${r.p95}ms  key=${e.key}`);
  }

  return { results, explains, timestamp: new Date().toISOString() };
}

// ── COMPARE mode ─────────────────────────────────────────────────────────────
function compare() {
  const beforePath = path.join(RESULTS_DIR, "before.json");
  const afterPath  = path.join(RESULTS_DIR, "after.json");

  if (!fs.existsSync(beforePath)) { console.error("❌  results/before.json not found"); process.exit(1); }
  if (!fs.existsSync(afterPath))  { console.error("❌  results/after.json not found");  process.exit(1); }

  const before = JSON.parse(fs.readFileSync(beforePath));
  const after  = JSON.parse(fs.readFileSync(afterPath));

  console.log("\n╔══════════════════════════════════════════════════════════════════════════════╗");
  console.log("║           CLUSTERED INDEX BENCHMARK COMPARISON REPORT                       ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════╝");
  console.log(`  Before: ${before.timestamp}`);
  console.log(`  After:  ${after.timestamp}\n`);

  const WIDTH = 38;
  const fmt = (s) => String(s).padEnd(12);

  console.log(
    "  " + "Query".padEnd(WIDTH) +
    fmt("Before avg") + fmt("After avg") +
    fmt("Δ ms") + "Improvement"
  );
  console.log("  " + "─".repeat(WIDTH + 48));

  const rows = [];
  for (const b of before.results) {
    const a   = after.results.find(r => r.label === b.label);
    if (!a) continue;
    const diff  = +(a.avg - b.avg).toFixed(3);
    const pct   = +(((b.avg - a.avg) / b.avg) * 100).toFixed(1);
    const arrow = diff < 0 ? "✅ faster" : diff > 0 ? "⚠️  slower" : "➡️  same";
    rows.push({ label: b.label, before: b.avg, after: a.avg, diff, pct, arrow });

    const label = b.label.length > WIDTH - 2 ? b.label.substring(0, WIDTH - 5) + "..." : b.label;
    console.log(
      "  " + label.padEnd(WIDTH) +
      fmt(b.avg + "ms") +
      fmt(a.avg + "ms") +
      fmt((diff >= 0 ? "+" : "") + diff + "ms") +
      `${arrow} (${pct}%)`
    );
  }

  console.log("\n  INDEX USAGE CHANGES:");
  console.log("  " + "─".repeat(80));
  console.log(
    "  " + "Query".padEnd(WIDTH) +
    "Before key".padEnd(22) + "After key"
  );
  console.log("  " + "─".repeat(80));
  for (const b of before.explains) {
    const a = after.explains.find(e => e.label === b.label);
    if (!a) continue;
    const changed = b.key !== a.key ? " ◀ CHANGED" : "";
    const label = b.label.length > WIDTH - 2 ? b.label.substring(0, WIDTH - 5) + "..." : b.label;
    console.log(
      "  " + label.padEnd(WIDTH) +
      b.key.padEnd(22) +
      a.key + changed
    );
  }

  // Save comparison as JSON too
  const report = {
    before_timestamp: before.timestamp,
    after_timestamp:  after.timestamp,
    comparisons: rows,
    index_changes: before.explains.map(b => {
      const a = after.explains.find(e => e.label === b.label);
      return { label: b.label, before_key: b.key, after_key: a?.key, changed: b.key !== a?.key };
    }),
  };
  fs.writeFileSync(path.join(RESULTS_DIR, "comparison.json"), JSON.stringify(report, null, 2));
  console.log("\n  📄  Full report saved to results/comparison.json\n");
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const mode = process.argv[2];

  if (mode === "compare") { compare(); return; }
  if (mode !== "before" && mode !== "after") {
    console.error("Usage: node benchmark.js before|after|compare");
    process.exit(1);
  }

  const pool = await getConn();
  console.log(`\n🚀  Running benchmark suite — mode: ${mode.toUpperCase()}`);

  const data = await runSuite(pool);
  const outFile = path.join(RESULTS_DIR, `${mode}.json`);
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2));
  console.log(`\n✅  Results saved to results/${mode}.json`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
