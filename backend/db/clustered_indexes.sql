-- ============================================================
-- CLUSTERED INDEX OPTIMIZATIONS
-- MySQL 8.0.43 | 100% MySQL Workbench compatible
-- NO stored procedures | NO DELIMITER | NO IF EXISTS on DROP
-- 
-- HOW TO RUN:
--   Open this file in MySQL Workbench → Run All (Ctrl+Shift+Enter)
--   Errors on DROP statements are SAFE TO IGNORE if an index was
--   already dropped by a previous run. Everything is idempotent.
-- ============================================================

USE `research_article_management`;

ALTER TABLE `researcharticle`
  ADD INDEX `idx_ra_status_date`
    (`Status`, `SubmissionDate` DESC),
  ADD INDEX `idx_ra_type_status_date`
    (`PublicationType`, `Status`, `SubmissionDate` DESC),
  ADD INDEX `idx_ra_list_cover`
    (`Status`, `SubmissionDate` DESC, `ArticleID`, `PublicationType`);

-- articleauthor: add reverse lookup index
ALTER TABLE `articleauthor`
  ADD INDEX `idx_aa_author_article`
    (`AuthorID`, `ArticleID`);

-- review: covering indexes for article + reviewer queries
ALTER TABLE `review`
  ADD INDEX `idx_review_article_cover`
    (`ArticleID`, `ReviewDate` DESC, `ReviewerID`, `Recommendation`),
  ADD INDEX `idx_review_reviewer_date`
    (`ReviewerID`, `ReviewDate` DESC);

-- citation: covering indexes for both directions
ALTER TABLE `citation`
  ADD INDEX `idx_citation_cited_cover`
    (`CitedArticleID`, `CitationID`, `CitingArticleID`),
  ADD INDEX `idx_citation_citing_cover`
    (`CitingArticleID`, `CitationID`, `CitedArticleID`);

-- author: covering index for UserID join
ALTER TABLE `author`
  ADD INDEX `idx_author_userid_cover`
    (`UserID`, `AuthorID`, `Name`, `Affiliation`);

-- reviewer: covering index for UserID join
ALTER TABLE `reviewer`
  ADD INDEX `idx_reviewer_userid_cover`
    (`UserID`, `ReviewerID`, `Name`, `Affiliation`, `ExpertiseArea`);

-- useraccount: covering index for login query
ALTER TABLE `useraccount`
  ADD INDEX `idx_ua_login_cover`
    (`Username`, `UserID`, `Role`, `PasswordHash`);


-- ============================================================
-- STEP 3: VERIFY — should show all new indexes
-- ============================================================

SELECT
  TABLE_NAME  AS `Table`,
  INDEX_NAME  AS `Index`,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX SEPARATOR ', ') AS `Columns`,
  IF(NON_UNIQUE = 0, 'UNIQUE', 'INDEX') AS `Type`
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'researcharticle', 'articleauthor', 'review',
    'citation', 'author', 'reviewer', 'useraccount'
  )
  AND INDEX_NAME != 'PRIMARY'
GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;
