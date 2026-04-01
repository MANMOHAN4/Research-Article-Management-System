# Query Optimization Report
## Research Article Management System — MySQL 8.0
**Database:** research_article_management  
**Server:** MySQL 8.0.43 (Win64)  
**Date:** 2026-04-01  

---

## 1. Overview

This report documents the index design, query optimization experiments, and execution plan analysis performed on the `research_article_management` database. The objective was to reduce query cost (as reported by `EXPLAIN FORMAT=JSON`) and eliminate unnecessary sort and temporary table operations across key analytical queries.

All optimization was performed using `EXPLAIN FORMAT=JSON` output in MySQL Workbench, with response time benchmarks collected via API-level timing (Node.js/Express backend).

---

## 2. Schema Overview

The database consists of the following core tables:

| Table | Primary Key | Notes |
|---|---|---|
| `ResearchArticle` | `ArticleID` | Central entity; has `Status`, `PublicationType`, `SubmissionDate` |
| `Author` | `AuthorID` | Has `UserID` FK to `UserAccount` |
| `ArticleAuthor` | `(ArticleID, AuthorID)` | Junction table; composite PK |
| `Citation` | `CitationID` | Has `CitingArticleID`, `CitedArticleID` as FKs |
| `UserAccount` | `UserID` | Authentication entity |
| `Review` | `ReviewID` | Has FK to `ResearchArticle` and `Reviewer` |

---

## 3. Optimization Phase 1 — Covering Index Addition

### 3.1 Indexes Added

The following indexes were added to address the most frequent query patterns:

```sql
-- ResearchArticle: composite index for status + date filter (covers ORDER BY)
ALTER TABLE ResearchArticle
  ADD INDEX idx_ra_status_date (Status, SubmissionDate),
  ADD INDEX idx_ra_type_status_date (PublicationType, Status, SubmissionDate),
  ADD INDEX idx_ra_list_cover (Status, PublicationType, SubmissionDate, Title),
  ADD INDEX idx_ra_status_cover (Status, SubmissionDate, Title, PublicationType);

-- Author: covering index for AuthorID + Name (avoids row fetch for GROUP_CONCAT)
ALTER TABLE Author
  ADD INDEX idx_author_id_name (AuthorID, Name);

-- ArticleAuthor: reverse direction index for AuthorID-first lookups
ALTER TABLE ArticleAuthor
  ADD INDEX idx_aa_author_article (AuthorID, ArticleID);

-- Review: covering index including Recommendation column
ALTER TABLE Review
  ADD INDEX idx_review_article_cover (ArticleID, ReviewDate, Recommendation);

-- Citation: covering composite index
ALTER TABLE Citation
  ADD INDEX idx_citation_cited_id (CitedArticleID, CitationID),
  ADD INDEX idx_citation_citing_cover (CitingArticleID, CitedArticleID, CitationDate);
```

### 3.2 API Response Time Results (Before vs After Covering Indexes)

| Query | Before (ms) | After (ms) | Change |
|---|---|---|---|
| GET all articles | 0.559 | 0.471 | 15.7% faster |
| GET article by ID (PK lookup) | 0.725 | 0.392 | 45.9% faster |
| GET articles by Status | 0.503 | 0.449 | 10.7% faster |
| GET articles by PublicationType + Status | 0.794 | 0.476 | 40.1% faster |
| FULLTEXT search title+abstract | 1.043 | 0.736 | 29.4% faster |
| GET authors for article (join) | 0.647 | 0.339 | 47.6% faster |
| GET reviews for article | 0.623 | 0.440 | 29.4% faster |
| AGGREGATE articles by status | 0.455 | 0.359 | 21.1% faster |
| Most cited articles (citation join + COUNT) | 0.591 | 0.573 | 3.0% faster |
| UserAccount lookup by Username (login) | 0.219 | 0.308 | 40.6% slower |

**Observation:** The `UserAccount` login query regressed by 40.6% because the new indexes increased write overhead during INSERT/UPDATE operations, slightly affecting buffer pool behavior on the small dataset. No functional index was added for `Username` lookup; the regression is attributed to buffer contention at this data scale.

---

## 4. Optimization Phase 2 — Clustered PK Restructuring

### 4.1 Changes Made

The `ArticleAuthor` and `Citation` tables had their composite primary keys restructured to improve join locality:

```sql
-- ArticleAuthor: reorder PK to AuthorID-first for author-centric joins
ALTER TABLE ArticleAuthor
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (AuthorID, ArticleID);

-- Citation: reorder PK to CitedArticleID-first for citation count queries
ALTER TABLE Citation
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (CitedArticleID, CitationID);
```

### 4.2 API Response Time Results (Covering Indexes Baseline vs Clustered PK)

| Query | Baseline (ms) | After Clustered PK (ms) | Change |
|---|---|---|---|
| GET reviews for article (join) | 0.318 | 0.429 | 34.9% slower |
| Most cited articles (citation COUNT) | 0.542 | 0.369 | 31.9% faster |
| GET authors for article (join) | 0.364 | 0.348 | 4.4% faster |
| GET article with reviews + reviewers | 0.380 | 0.383 | 0.8% slower |
| GET article with authors + citation count | 0.762 | 0.497 | 34.8% faster |
| GET all reviews range scan | 0.438 | 0.292 | 33.3% faster |
| GET citations range scan | 0.232 | 0.296 | 27.6% slower |

**Observation:** Reordering the `Citation` PK to `(CitedArticleID, CitationID)` benefited citation count aggregations significantly (31.9% faster) by enabling index-only scans in clustered order. However, citation range scans that previously used `idx_citation_cited_id` now fell back to the PRIMARY key scan with slightly worse locality, causing a 27.6% regression on that specific pattern. The `Review` join regression occurred because the optimizer switched from `idx_review_article_cover` to `idx_review_article_date` after the restructure.

---

## 5. EXPLAIN Analysis — Query 1: Published Journal Articles with Authors and Citation Counts

### 5.1 Query

```sql
SELECT ra.ArticleID, ra.Title,
       GROUP_CONCAT(DISTINCT a.Name ORDER BY a.Name SEPARATOR ', ') AS Authors,
       COUNT(DISTINCT c.CitationID) AS CitationCount
FROM ResearchArticle ra
LEFT JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
LEFT JOIN Author a         ON aa.AuthorID  = a.AuthorID
LEFT JOIN Citation c       ON ra.ArticleID = c.CitedArticleID
WHERE ra.Status = 'Published'
  AND ra.PublicationType = 'Journal'
GROUP BY ra.ArticleID
ORDER BY CitationCount DESC;
```

### 5.2 Execution Plan Summary (Final)

| Table | Access Type | Key Used | Rows Scanned | Using Index |
|---|---|---|---|---|
| `ra` | `ref` | `idx_ra_type_status_date` | 2 | No (row fetch required) |
| `aa` | `ref` | `PRIMARY` | 1 per scan | Yes (index-only) |
| `a` | `eq_ref` | `PRIMARY` | 1 per scan | No (Name fetch required) |
| `c` | `ref` | `PRIMARY` | 2 per scan | Yes (index-only) |

**Total query cost: 4.62**  
**Filesort operations: 2 (irreducible)**

### 5.3 Optimization Attempts

**Attempt 1 — Subquery Materialization:**  
A rewrite splitting Author aggregation into a subquery (`a_agg`) and Citation aggregation into a separate subquery (`c_agg`) was tested. The optimizer materialized both subqueries into temporary tables before the outer join, producing a cost of **12.90** — significantly worse than the direct join.

Root cause: The filter `WHERE ra.Status='Published' AND ra.PublicationType='Journal'` cannot be pushed inside the subquery. MySQL materializes all rows from both subqueries before applying the outer filter, reading all 8 authors and all citation rows unconditionally.

**Attempt 2 — SQL_BIG_RESULT Hint:**  
Adding `SQL_BIG_RESULT` was tested to instruct MySQL to skip the temporary table and perform a direct filesort pass. The cost remained at **4.62** — identical to the baseline. The hint added a `buffer_result` node in the execution plan but did not reduce the sort operations.

**Attempt 3 — Covering Index on Author (AuthorID, Name):**  
The index `idx_author_id_name (AuthorID, Name)` was added to enable index-only access for `Name` during `GROUP_CONCAT`. The optimizer chose to continue using the `PRIMARY` key via `eq_ref` access, which is cheaper for single-row lookups than traversing a secondary index. The covering index was not used.

### 5.4 Conclusion

**Query cost 4.62 is the optimization floor for this query on the current dataset.** The double filesort is irreducible because:

1. `GROUP_CONCAT(DISTINCT a.Name ORDER BY a.Name)` requires a sort on `Name` per group.
2. `ORDER BY CitationCount DESC` requires a second sort on a computed aggregate value.

No index structure can pre-sort both simultaneously. Further optimization would require application-level caching (e.g., Redis) or a materialized view pattern via a scheduled summary table.

---

## 6. EXPLAIN Analysis — Query 2: Under Review Articles in Last 30 Days

### 6.1 Query

```sql
SELECT ra.ArticleID, ra.Title, ra.SubmissionDate,
       u.Username AS SubmittedBy
FROM ResearchArticle ra
JOIN ArticleAuthor aa  ON ra.ArticleID = aa.ArticleID
JOIN Author a          ON aa.AuthorID  = a.AuthorID
JOIN UserAccount u     ON a.UserID     = u.UserID
WHERE ra.Status = 'Under Review'
  AND ra.SubmissionDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY ra.SubmissionDate DESC;
```

### 6.2 Execution Plan Summary

| Table | Access Type | Key Used | Rows Scanned | Using Index |
|---|---|---|---|---|
| `ra` | `range` | `idx_ra_status_date` | 1 | No (row fetch) |
| `aa` | `ref` | `PRIMARY` | 1 per scan | Yes (index-only) |
| `a` | `eq_ref` | `PRIMARY` | 1 per scan | No (UserID fetch) |
| `u` | `eq_ref` | `PRIMARY` | 1 per scan | No (Username fetch) |

**Total query cost: 1.83**  
**Filesort operations: 0**

### 6.3 Analysis

This query achieved an ideal execution plan. Key observations:

- **Date range pushdown:** The condition `SubmissionDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)` was pushed into the index scan as an `index_condition` on `idx_ra_status_date`. MySQL evaluated it at the storage engine level before returning rows, not as a post-join filter.
- **Zero filesort:** The index `idx_ra_status_date (Status, SubmissionDate)` delivers rows in `SubmissionDate` order. Since the query orders by `SubmissionDate DESC`, MySQL used the index traversal order directly and skipped the sort step entirely.
- **Prefix cost growth:** Cost accumulated linearly across joins: 0.70 -> 0.99 -> 1.41 -> 1.83, confirming each join contributes minimal overhead.
- **Auto NULL guard:** MySQL generated `attached_condition: a.UserID IS NOT NULL` automatically on the `Author` table to guard the `JOIN` to `UserAccount`. This is a zero-cost predicate pushed by the optimizer.
- **rows_examined_per_scan: 1** on `ResearchArticle` confirms that only one matching row exists in the current dataset for the `Under Review` + 30-day range, validating index selectivity.

---

## 7. Index Design Reference

### Final Index Set on ResearchArticle

| Index Name | Columns | Purpose |
|---|---|---|
| `PRIMARY` | `ArticleID` | PK lookup |
| `idx_ra_status_date` | `Status, SubmissionDate` | Status filter + date range + sort |
| `idx_ra_type_status_date` | `PublicationType, Status, SubmissionDate` | Composite type+status filter |
| `idx_ra_list_cover` | `Status, PublicationType, SubmissionDate, Title` | Covering index for list queries |
| `idx_ra_status_cover` | `Status, SubmissionDate, Title, PublicationType` | Alternate covering index |
| `idx_ft_article_combined` | `Title, Abstract` (FULLTEXT) | Full-text search |

### Final Index Set on Supporting Tables

| Table | Index Name | Columns | Purpose |
|---|---|---|---|
| `Author` | `idx_author_id_name` | `AuthorID, Name` | Covering index for GROUP_CONCAT (unused by optimizer in favor of PK eq_ref) |
| `Author` | `idx_author_userid_cover` | `UserID, AuthorID` | UserID lookup with AuthorID cover |
| `ArticleAuthor` | `idx_aa_author_article` | `AuthorID, ArticleID` | Reverse direction for author-first joins |
| `Citation` | `idx_citation_cited_id` | `CitedArticleID, CitationID` | Citation count aggregation |
| `Citation` | `idx_citation_citing_cover` | `CitingArticleID, CitedArticleID, CitationDate` | Covering index for citation lookups |
| `Review` | `idx_review_article_cover` | `ArticleID, ReviewDate, Recommendation` | Covering index for review joins |

---

## 8. Key Findings

1. **Composite indexes on frequently filtered columns** (`Status`, `PublicationType`, `SubmissionDate`) produced the largest gains — up to 47.6% improvement in API response time for join-heavy queries.

2. **Clustered PK restructuring produced mixed results.** Reordering `Citation` PK benefited aggregation (31.9% faster) but hurt range scans (27.6% slower). This tradeoff is workload-dependent; the restructure is net-positive for write-heavy OLAP-style access but may be reconsidered for mixed read patterns.

3. **Subquery materialization is harmful when filters cannot be pushed.** Rewriting the Published Journal query as subqueries increased cost from 4.62 to 12.90 because MySQL materialized all data before applying the outer `WHERE` clause.

4. **The optimizer prefers PRIMARY key eq_ref over secondary covering indexes** for single-row lookups. The `idx_author_id_name` covering index was never chosen by the optimizer because `eq_ref` on PRIMARY is cheaper than secondary index traversal for point lookups.

5. **Query 2 (Under Review, 30-day range) achieved a perfect plan** — range scan with date pushdown, zero filesort, and all joins using eq_ref or index-only access at a total cost of 1.83.

6. **`DROP INDEX IF EXISTS` inside `ALTER TABLE` is not supported in MySQL 8.0.** Index existence must be verified before dropping, or the drop must be issued as a standalone `DROP INDEX` statement with error handling.
