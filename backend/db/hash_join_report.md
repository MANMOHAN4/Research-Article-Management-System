# Hash Join Execution Plan Report
## Research Article Management System — MySQL 8.0.43
**Database:** research_article_management  
**Server:** MySQL 8.0.43 (Win64)  
**Date:** 2026-04-01  

---

## 1. Objective

This report documents the process of demonstrating MySQL 8.0's hash join algorithm
as an alternative to the default nested loop join. The goal was to produce an execution
plan containing `Inner hash join` nodes using `EXPLAIN FORMAT=TREE`, and to analyze
the conditions under which MySQL's cost model activates hash join over nested loop.

---

## 2. Background — Hash Join in MySQL 8.0

MySQL 8.0.18 introduced hash join as a replacement for Block Nested Loop (BNL) joins
when no usable index exists on the join key. Hash join operates in two phases:

- **Build phase:** The smaller table is scanned and loaded into an in-memory hash table
  keyed on the join attribute.
- **Probe phase:** The larger table is scanned row by row; each row's join key is hashed
  and looked up against the in-memory hash table.

This gives a time complexity of O(N + M) per join pair, compared to O(N x M) for
nested loop. Hash join becomes cost-effective when row counts are large enough that
the hash table build cost is lower than repeated loop iterations.

**Important:** True parallel query execution does not exist in native MySQL 8.0.
Hash join is the closest analog — it processes joins in set-based batches rather than
row-by-row iteration, and is the correct mechanism to demonstrate parallelism-style
execution in a standard MySQL environment.

---

## 3. Session Configuration

The following session-level switches were applied to force hash join activation:

```sql
USE research_article_management;

SET SESSION optimizer_switch = 'block_nested_loop=off';
SET SESSION join_buffer_size = 128;
```

| Setting | Value | Reason |
|---|---|---|
| `block_nested_loop` | `off` | Disables BNL, allowing hash join to compete |
| `join_buffer_size` | `128` bytes | Reduces BNL buffer, shifts cost model toward hash join |

These settings are session-scoped and were reset after the experiment:

```sql
SET SESSION optimizer_switch = 'block_nested_loop=on';
SET SESSION join_buffer_size = 262144;
```

---

## 4. Query Used

```sql
EXPLAIN FORMAT=TREE
SELECT a.Name,
       ra.Title,
       COUNT(c.CitationID) AS CitationsGiven
FROM ResearchArticle ra
JOIN Citation      c  IGNORE INDEX (PRIMARY, idx_citation_citing_cited,
                                    idx_citation_citing_id, idx_citation_cited_id,
                                    idx_citation_citing_cover, idx_citation_id)
     ON ra.ArticleID = c.CitingArticleID
JOIN ArticleAuthor aa IGNORE INDEX (PRIMARY, idx_articleauthor_author,
                                    idx_aa_author_article)
     ON ra.ArticleID = aa.ArticleID
JOIN Author        a  IGNORE INDEX (PRIMARY, idx_author_id_name,
                                    idx_author_name)
     ON aa.AuthorID = a.AuthorID
GROUP BY a.Name, ra.Title
ORDER BY CitationsGiven DESC;
```

`IGNORE INDEX` clauses were applied to `Citation`, `ArticleAuthor`, and `Author` to
eliminate direct index paths on join keys, making hash join viable for those join pairs.

---

## 5. Execution Plan Output (EXPLAIN FORMAT=TREE)

```
-> Sort: CitationsGiven DESC
    -> Table scan on <temporary>
        -> Aggregate using temporary table
            -> Inner hash join (a.AuthorID = aa.AuthorID)  (cost=104 rows=20.6)
                -> Index scan on a using idx_author_userid_cover  (cost=2.41 rows=8)
                -> Hash
                    -> Inner hash join (aa.ArticleID = c.CitingArticleID)  (cost=46.7 rows=18)
                        -> Table scan on aa  (cost=2.41 rows=18)
                        -> Hash
                            -> Nested loop inner join  (cost=4.75 rows=10)
                                -> Table scan on c  (cost=1.25 rows=10)
                                -> Single-row index lookup on ra using PRIMARY
                                   (ArticleID=c.CitingArticleID)  (cost=0.26 rows=1)
```

---

## 6. Annotated Execution Plan

The plan executes bottom-up. Each node is described below:

### 6.1 Innermost Join — Citation JOIN ResearchArticle (Nested Loop)

```
-> Nested loop inner join  (cost=4.75 rows=10)
    -> Table scan on c          -- full scan: 10 Citation rows, no index
    -> Single-row PK lookup on ra using PRIMARY
                                -- 1 ResearchArticle row per Citation row
```

**Algorithm:** Nested loop (not hash join)  
**Reason:** Only 10 rows in `Citation`. The hash table build cost exceeds the cost of
10 simple PK lookups. The optimizer correctly keeps nested loop for this pair.  
**Output:** 10 joined rows of (Citation, ResearchArticle)

---

### 6.2 First Hash Join — (Citation, ResearchArticle) JOIN ArticleAuthor

```
-> Inner hash join (aa.ArticleID = c.CitingArticleID)  (cost=46.7 rows=18)
    -> Table scan on aa         -- PROBE phase: full scan of 18 ArticleAuthor rows
    -> Hash                     -- BUILD phase: hash table from step 6.1 result
```

**Algorithm:** Hash join  
**Build phase:** The 10-row result from step 6.1 is hashed on `ArticleID` into memory.  
**Probe phase:** All 18 `ArticleAuthor` rows are scanned; each row's `ArticleID` is
hashed and probed against the in-memory hash table.  
**No index used:** `IGNORE INDEX` forced full table scan on `ArticleAuthor`.  
**Output:** 18 joined rows of (Citation, ResearchArticle, ArticleAuthor)

---

### 6.3 Second Hash Join — Previous Result JOIN Author

```
-> Inner hash join (a.AuthorID = aa.AuthorID)  (cost=104 rows=20.6)
    -> Index scan on a using idx_author_userid_cover  -- PROBE phase: 8 Author rows
    -> Hash                                           -- BUILD phase: hash from step 6.2
```

**Algorithm:** Hash join  
**Build phase:** The 18-row result from step 6.2 is hashed on `AuthorID` into memory.  
**Probe phase:** All 8 `Author` rows are scanned via `idx_author_userid_cover` (a
covering index MySQL retained since it was not in the IGNORE INDEX list); each row's
`AuthorID` is probed against the hash table.  
**Output:** 20.6 estimated joined rows of (Citation, ResearchArticle, ArticleAuthor, Author)

---

### 6.4 Aggregation and Sort

```
-> Aggregate using temporary table    -- GROUP BY (a.Name, ra.Title) with COUNT
-> Table scan on <temporary>          -- read aggregated result
-> Sort: CitationsGiven DESC          -- ORDER BY on computed COUNT value
```

The `GROUP BY` materializes into a temporary table, then a filesort delivers the
final `ORDER BY CitationsGiven DESC` output. This is irreducible since `CitationsGiven`
is a computed aggregate value that no index can pre-sort.

---

## 7. Step-by-Step Execution Summary

| Step | Operation | Algorithm | Estimated Cost | Estimated Rows |
|---|---|---|---|---|
| 1 | Full scan on Citation (no index) | Table scan | 1.25 | 10 |
| 2 | PK lookup on ResearchArticle per Citation row | Nested loop | 4.75 | 10 |
| 3 | Build hash table from (Citation + ResearchArticle) | BUILD phase | — | 10 |
| 4 | Full scan on ArticleAuthor, probe hash table | HASH JOIN 1 | 46.7 | 18 |
| 5 | Build hash table from step 4 result | BUILD phase | — | 18 |
| 6 | Covering index scan on Author, probe hash table | HASH JOIN 2 | 104.0 | 20.6 |
| 7 | GROUP BY materialization into temporary table | Aggregate | — | 11 |
| 8 | ORDER BY CitationsGiven DESC | Filesort | — | 11 |

---

## 8. Hash Join vs Nested Loop Comparison

| Property | Nested Loop | Hash Join |
|---|---|---|
| Time complexity | O(N x M) per join pair | O(N + M) per join pair |
| Index requirement | Highly benefits from index on join key | No index required |
| Memory usage | Minimal — processes one row at a time | join_buffer_size for hash table |
| Optimal dataset size | Small tables with selective indexes | Large tables without indexes |
| MySQL activation condition | Default when indexes exist | block_nested_loop=off required |
| Parallelism characteristic | Sequential row-by-row iteration | Set-based batch processing |

---

## 9. Why Hash Join Did Not Activate Initially

Three separate attempts were required before hash join appeared in the plan:

| Attempt | Configuration | Result | Root Cause |
|---|---|---|---|
| 1 | Default settings | Nested loop (cost=15.4) | All join keys had direct PK/index paths |
| 2 | `block_nested_loop=off` in separate tab | Nested loop unchanged | Workbench opened a new connection per tab — SET did not persist |
| 3 | `block_nested_loop=off` + IGNORE INDEX | Nested loop (cost=44.1) | Dataset too small — hash build cost > loop cost at 10 rows |
| 4 | All above + `join_buffer_size=128` | **Hash join confirmed** | Reduced buffer shifted cost model to prefer hash join |

The critical insight is that MySQL's hash join activation is **cost-based, not rule-based**.
Even with all indexes removed, the optimizer will choose nested loop if the estimated
hash table build cost exceeds the loop iteration cost. At fewer than approximately
100 rows per table, nested loop is almost always cheaper on standard hardware.

---

## 10. Key Findings

1. **Hash join in MySQL 8.0 is cost-driven.** It does not activate simply because
   indexes are absent. The optimizer compares hash build cost against loop iteration
   cost and selects the cheaper strategy per join pair.

2. **The innermost join (10 rows) remained as nested loop** even after hash join
   was forced for the outer joins. This demonstrates that MySQL applies hash join
   selectively per join pair, not globally across the entire query.

3. **`EXPLAIN FORMAT=TREE` is the only format that exposes hash join nodes.**
   `EXPLAIN FORMAT=JSON` represents all joins as `nested_loop` regardless of the
   actual algorithm used. This is a known MySQL 8.0 behavior (Bug #97280).

4. **`IGNORE INDEX` at the table level is more reliable than optimizer hints**
   (`NO_INDEX`, `BNL`) for forcing algorithm changes, because it is applied before
   the optimizer begins plan generation rather than as a post-planning override.

5. **`join_buffer_size` is the decisive lever.** Setting it to 128 bytes made the
   BNL/hash join path viable by preventing the optimizer from allocating a large
   enough buffer for efficient BNL, tipping the cost model toward hash join.
