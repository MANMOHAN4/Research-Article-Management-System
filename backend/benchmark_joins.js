// ============================================================
// BENCHMARK — CLUSTERED INDEX ON JOINS
// Usage:
//   node benchmark_joins.js before   → results/before_clustered.json
//   node benchmark_joins.js after    → results/after_clustered.json
//   node benchmark_joins.js compare  → results/comparison_clustered.json
//
// BEFORE running "before": rename results/after.json to
// results/before_clustered.json (your post-covering-index state)
// ============================================================

require("dotenv").config();
const mysql = require("mysql2/promise");
const fs    = require("fs");
const path  = require("path");

const RESULTS_DIR = path.join(__dirname, "results");
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR);

async function getPool() {
  return mysql.createPool({
    host:     process.env.DB_HOST     || "localhost",
    user:     process.env.DB_USER     || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME     || "research_article_management",
    waitForConnections: true,
    connectionLimit: 5,
  });
}

async function bench(pool, label, sql, params = [], runs = 100) {
  // 2 warm-up runs (not counted)
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

  return {
    label,
    avg:    +avg.toFixed(3),
    median: +median.toFixed(3),
    p95:    +p95.toFixed(3),
    min:    +times[0].toFixed(3),
    max:    +times[times.length - 1].toFixed(3),
    runs
  };
}

async function explainQuery(pool, label, sql, params = []) {
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

// ── These are the JOIN-heavy queries most affected by clustered PK ──────────
const suite = [
  // Uses review PK (ArticleID, ReviewID) — was random I/O, now sequential
  {
    label: "GET reviews for article (join)",
    sql: `SELECT r.ReviewID, r.Recommendation, r.ReviewDate,
                 COALESCE(u.Username, rev.Name) AS ReviewerName
          FROM Review r
          JOIN Reviewer rev ON r.ReviewerID = rev.ReviewerID
          LEFT JOIN UserAccount u ON rev.UserID = u.UserID
          WHERE r.ArticleID = ?
          ORDER BY r.ReviewDate DESC`,
    params: [1],
  },
  // Uses citation PK (CitedArticleID, CitationID) — COUNT now sequential scan
  {
    label: "Most cited articles (citation COUNT)",
    sql: `SELECT ra.ArticleID, ra.Title, COUNT(c.CitationID) AS CitationCount
          FROM ResearchArticle ra
          LEFT JOIN Citation c ON ra.ArticleID = c.CitedArticleID
          GROUP BY ra.ArticleID
          ORDER BY CitationCount DESC
          LIMIT 10`,
    params: [],
  },
  // Uses articleauthor PK (ArticleID, AuthorID) — already clustered
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
  // Multi-join: article + review + reviewer
  {
    label: "GET article with reviews + reviewers",
    sql: `SELECT ra.Title, ra.Status,
                 r.ReviewID, r.Recommendation, r.ReviewDate,
                 COALESCE(u.Username, rev.Name) AS ReviewerName
          FROM ResearchArticle ra
          LEFT JOIN Review r    ON ra.ArticleID  = r.ArticleID
          LEFT JOIN Reviewer rev ON r.ReviewerID = rev.ReviewerID
          LEFT JOIN UserAccount u ON rev.UserID  = u.UserID
          WHERE ra.ArticleID = ?`,
    params: [1],
  },
  // Multi-join: article + author + citation count
  {
    label: "GET article with authors + citation count",
    sql: `SELECT ra.ArticleID, ra.Title, ra.Status,
                 GROUP_CONCAT(DISTINCT a.Name SEPARATOR ', ') AS Authors,
                 COUNT(DISTINCT c.CitationID) AS CitationCount
          FROM ResearchArticle ra
          LEFT JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
          LEFT JOIN Author a         ON aa.AuthorID  = a.AuthorID
          LEFT JOIN Citation c       ON ra.ArticleID = c.CitedArticleID
          WHERE ra.ArticleID = ?
          GROUP BY ra.ArticleID`,
    params: [1],
  },
  // Range scan: all reviews across multiple articles
  {
    label: "GET all reviews range scan",
    sql: `SELECT r.ArticleID, r.ReviewID, r.Recommendation
          FROM Review r
          WHERE r.ArticleID BETWEEN ? AND ?
          ORDER BY r.ArticleID, r.ReviewDate DESC`,
    params: [1, 10],
  },
  // Citation range: all citations for a set of articles
  {
    label: "GET citations range scan",
    sql: `SELECT c.CitedArticleID, COUNT(*) AS cnt
          FROM Citation c
          WHERE c.CitedArticleID BETWEEN ? AND ?
          GROUP BY c.CitedArticleID`,
    params: [1, 10],
  },
];

async function runSuite(pool) {
  const results  = [];
  const explains = [];
  console.log(`\nRunning ${suite.length} queries × 100 runs each...\n`);

  for (const q of suite) {
    process.stdout.write(`  ⏱  ${q.label}...`);
    const r = await bench(pool, q.label, q.sql, q.params, 100);
    const e = await explainQuery(pool, q.label, q.sql, q.params);
    results.push(r);
    explains.push(e);
    console.log(` avg=${r.avg}ms  p95=${r.p95}ms  key=${e.key}  type=${e.type}`);
  }

  return { results, explains, timestamp: new Date().toISOString() };
}

function compare() {
  const beforePath = path.join(RESULTS_DIR, "before_clustered.json");
  const afterPath  = path.join(RESULTS_DIR, "after_clustered.json");

  if (!fs.existsSync(beforePath)) {
    console.error("❌  results/before_clustered.json not found");
    console.error("    Rename your results/after.json to results/before_clustered.json first");
    process.exit(1);
  }
  if (!fs.existsSync(afterPath)) {
    console.error("❌  results/after_clustered.json not found");
    console.error("    Run: node benchmark_joins.js after");
    process.exit(1);
  }

  const before = JSON.parse(fs.readFileSync(beforePath));
  const after  = JSON.parse(fs.readFileSync(afterPath));

  console.log("\n╔══════════════════════════════════════════════════════════════════════╗");
  console.log("║        CLUSTERED PK (JOIN) BENCHMARK — COMPARISON REPORT           ║");
  console.log("╚══════════════════════════════════════════════════════════════════════╝");
  console.log(`  Baseline (covering indexes): ${before.timestamp}`);
  console.log(`  After (clustered PK joins):  ${after.timestamp}\n`);

  const W = 42;
  console.log(
    "  " + "Query".padEnd(W) +
    "Before".padEnd(12) + "After".padEnd(12) +
    "Δ ms".padEnd(12) + "Result"
  );
  console.log("  " + "─".repeat(W + 44));

  const rows = [];
  for (const a of after.results) {
    // try to find matching query from before (may be new queries)
    const b = before.results?.find(r => r.label === a.label);
    const bAvg = b ? b.avg : null;
    const diff = bAvg !== null ? +(a.avg - bAvg).toFixed(3) : null;
    const pct  = bAvg ? +(((bAvg - a.avg) / bAvg) * 100).toFixed(1) : null;
    const arrow = diff === null ? "🆕 new query"
                : diff < 0     ? "✅ faster"
                : diff > 0     ? "⚠️  slower"
                :                "➡️  same";

    rows.push({ label: a.label, before: bAvg, after: a.avg, diff, pct, arrow });

    const lbl = a.label.length > W - 2 ? a.label.substring(0, W - 4) + "..." : a.label;
    console.log(
      "  " + lbl.padEnd(W) +
      (bAvg !== null ? (bAvg + "ms").padEnd(12) : "n/a".padEnd(12)) +
      (a.avg + "ms").padEnd(12) +
      (diff !== null ? ((diff >= 0 ? "+" : "") + diff + "ms").padEnd(12) : "n/a".padEnd(12)) +
      `${arrow}${pct !== null ? ` (${pct}%)` : ""}`
    );
  }

  const report = {
    baseline_label: "After covering indexes",
    clustered_label: "After clustered PK on joins",
    before_timestamp: before.timestamp,
    after_timestamp:  after.timestamp,
    comparisons: rows,
    index_changes: after.explains.map(e => {
      const b = before.explains?.find(x => x.label === e.label);
      return {
        label: e.label,
        before_key:  b?.key  || "n/a",
        before_type: b?.type || "n/a",
        after_key:   e.key,
        after_type:  e.type,
        changed: b?.key !== e.key,
      };
    }),
  };

  fs.writeFileSync(
    path.join(RESULTS_DIR, "comparison_clustered.json"),
    JSON.stringify(report, null, 2)
  );
  console.log("\n  📄  Saved to results/comparison_clustered.json\n");
}

async function main() {
  const mode = process.argv[2];

  if (mode === "compare") { compare(); return; }
  if (mode !== "before" && mode !== "after") {
    console.error("Usage: node benchmark_joins.js before|after|compare");
    process.exit(1);
  }

  const pool = await getPool();
  console.log(`\n🚀  Benchmark mode: ${mode.toUpperCase()} (clustered PK joins)`);
  const data = await runSuite(pool);

  const filename = mode === "before" ? "before_clustered.json" : "after_clustered.json";
  fs.writeFileSync(path.join(RESULTS_DIR, filename), JSON.stringify(data, null, 2));
  console.log(`\n✅  Saved to results/${filename}`);
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
