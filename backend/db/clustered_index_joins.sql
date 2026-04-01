-- ============================================================
-- CLUSTERED INDEX ON JOIN TABLES
-- MySQL 8.0.43 | MySQL Workbench compatible
-- 
-- WHAT THIS DOES:
--   Re-orders the Physical PRIMARY KEY (clustered index) on
--   join-heavy tables so rows for the same parent are stored
--   ADJACENT ON DISK — turning random I/O joins into
--   sequential reads.
--
-- TABLES CHANGED:
--   review   → PK becomes (ArticleID, ReviewID)
--   citation → PK becomes (CitedArticleID, CitationID)
--
-- articleauthor already has PK (ArticleID, AuthorID) ✅ optimal
--
-- HOW TO RUN:
--   MySQL Workbench → open file → Ctrl+Shift+Enter (Run All)
--   Ignore any yellow warnings (0 rows affected)
-- ============================================================

USE `research_article_management`;

-- Disable FK checks so we can restructure PKs safely
SET FOREIGN_KEY_CHECKS = 0;

-- ══════════════════════════════════════════════════════════════
-- TABLE: review
-- Current PK : (ReviewID)           → rows ordered by ReviewID
-- New PK     : (ArticleID, ReviewID) → rows ordered by ArticleID
--              All reviews for the same article are now
--              physically adjacent on disk.
-- JOIN query : WHERE aa.ArticleID = ?
--              → sequential read instead of scattered random I/O
-- ══════════════════════════════════════════════════════════════

-- 1a. Drop the existing AUTO_INCREMENT PK
--     (AUTO_INCREMENT must be removed before dropping PK)
ALTER TABLE `review`
  MODIFY COLUMN `ReviewID` INT NOT NULL;

ALTER TABLE `review`
  DROP PRIMARY KEY;

-- 1b. Add new composite clustered PK — ArticleID first (join key)
ALTER TABLE `review`
  ADD PRIMARY KEY (`ArticleID`, `ReviewID`);

-- 1c. Restore AUTO_INCREMENT on ReviewID
--     MySQL requires the AUTO_INCREMENT column to be a KEY,
--     so we add a separate index on ReviewID for this
ALTER TABLE `review`
  MODIFY COLUMN `ReviewID` INT NOT NULL AUTO_INCREMENT,
  ADD INDEX `idx_review_id` (`ReviewID`);

-- 1d. The covering index we added earlier now overlaps with PK.
--     Drop it — PK already clusters by ArticleID.
DROP INDEX `idx_review_article_cover` ON `review`;

-- Verify review PK
SELECT 'review PK' AS info,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ', ') AS pk_columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'review'
  AND INDEX_NAME   = 'PRIMARY';

-- ══════════════════════════════════════════════════════════════
-- TABLE: citation
-- Current PK : (CitationID)
-- New PK     : (CitedArticleID, CitationID)
--              All citations pointing TO the same article are
--              physically adjacent — makes COUNT(*) per
--              cited article a sequential scan, not random I/O
-- JOIN query : GROUP BY ra.ArticleID, COUNT(c.CitationID)
-- ══════════════════════════════════════════════════════════════

-- 2a. Drop AUTO_INCREMENT, then drop PK
ALTER TABLE `citation`
  MODIFY COLUMN `CitationID` INT NOT NULL;

ALTER TABLE `citation`
  DROP PRIMARY KEY;

-- 2b. New composite clustered PK
ALTER TABLE `citation`
  ADD PRIMARY KEY (`CitedArticleID`, `CitationID`);

-- 2c. Restore AUTO_INCREMENT with a supporting index
ALTER TABLE `citation`
  MODIFY COLUMN `CitationID` INT NOT NULL AUTO_INCREMENT,
  ADD INDEX `idx_citation_id` (`CitationID`);

-- 2d. The covering index idx_citation_cited_cover is now
--     redundant since PK clusters by CitedArticleID
DROP INDEX `idx_citation_cited_cover` ON `citation`;

-- Verify citation PK
SELECT 'citation PK' AS info,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ', ') AS pk_columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'citation'
  AND INDEX_NAME   = 'PRIMARY';

-- ══════════════════════════════════════════════════════════════
-- Re-enable FK checks
-- ══════════════════════════════════════════════════════════════
SET FOREIGN_KEY_CHECKS = 1;

-- ══════════════════════════════════════════════════════════════
-- FINAL VERIFY — all PKs and indexes
-- ══════════════════════════════════════════════════════════════
SELECT
  TABLE_NAME  AS `Table`,
  INDEX_NAME  AS `Index`,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ', ') AS `Columns`,
  IF(NON_UNIQUE = 0, 'UNIQUE / PK', 'INDEX') AS `Type`
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('review', 'citation', 'articleauthor')
GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;
