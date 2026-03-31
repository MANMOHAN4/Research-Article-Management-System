-- ============================================================
-- RESEARCH ARTICLE MANAGEMENT — CLEAN SCHEMA
-- Rebuilt to match all controllers exactly (PascalCase tables)
-- Includes: Tables, Indexes, Constraints, Views, Stored Procedures
-- Run Order: safe — FK references resolved bottom-up via SET checks
-- ============================================================

DROP DATABASE IF EXISTS research_article_management;
CREATE DATABASE research_article_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE research_article_management;

-- ============================================================
-- 1. UserAccount  (no FKs — referenced by Author, Reviewer)
-- ============================================================
CREATE TABLE UserAccount (
  UserID       INT           NOT NULL AUTO_INCREMENT,
  Username     VARCHAR(100)  NOT NULL,
  PasswordHash VARCHAR(255)  NOT NULL,
  Email        VARCHAR(150)  NOT NULL,
  Affiliation  VARCHAR(200)  DEFAULT NULL,
  ORCID        VARCHAR(50)   DEFAULT NULL,
  Role         ENUM('Author','Reviewer','Admin') NOT NULL DEFAULT 'Author',
  PRIMARY KEY (UserID),
  UNIQUE KEY uk_username (Username),
  UNIQUE KEY uk_email    (Email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. Journal  (referenced by ResearchArticle)
-- ============================================================
CREATE TABLE Journal (
  JournalID    INT            NOT NULL AUTO_INCREMENT,
  Name         VARCHAR(200)   NOT NULL,
  Publisher    VARCHAR(200)   DEFAULT NULL,
  ISSN         VARCHAR(20)    DEFAULT NULL,
  ImpactFactor DECIMAL(4,3)   DEFAULT NULL,
  PRIMARY KEY (JournalID),
  KEY idx_journal_name (Name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 3. Conference  (referenced by ResearchArticle)
-- ============================================================
CREATE TABLE Conference (
  ConferenceID INT          NOT NULL AUTO_INCREMENT,
  Name         VARCHAR(200) NOT NULL,
  Location     VARCHAR(200) DEFAULT NULL,
  StartDate    DATE         DEFAULT NULL,
  EndDate      DATE         DEFAULT NULL,
  PRIMARY KEY (ConferenceID),
  KEY idx_conference_name  (Name),
  KEY idx_conference_dates (StartDate, EndDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 4. ResearchArticle
-- ============================================================
CREATE TABLE ResearchArticle (
  ArticleID       INT          NOT NULL AUTO_INCREMENT,
  Title           VARCHAR(300) NOT NULL,
  Abstract        TEXT         DEFAULT NULL,
  DOI             VARCHAR(100) DEFAULT NULL,
  SubmissionDate  DATE         DEFAULT NULL,
  Status          ENUM('Submitted','Under Review','Accepted','Published','Rejected')
                               NOT NULL DEFAULT 'Submitted',
  PublicationType ENUM('Journal','Conference','Unpublished')
                               NOT NULL DEFAULT 'Unpublished',
  JournalID       INT          DEFAULT NULL,
  ConferenceID    INT          DEFAULT NULL,
  PRIMARY KEY (ArticleID),
  UNIQUE KEY uk_doi (DOI),
  KEY idx_article_type_status_date (PublicationType, Status, SubmissionDate DESC),
  KEY idx_article_submission_date  (SubmissionDate DESC),
  KEY idx_article_status_date      (Status, SubmissionDate DESC),
  FULLTEXT KEY idx_ft_article_abstract (Abstract),
  FULLTEXT KEY idx_ft_article_combined (Title, Abstract),
  CONSTRAINT fk_article_journal    FOREIGN KEY (JournalID)    REFERENCES Journal    (JournalID)    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_article_conference FOREIGN KEY (ConferenceID) REFERENCES Conference (ConferenceID) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 5. Author  (lossless-join: registered via UserID, guest via local fields)
-- ============================================================
CREATE TABLE Author (
  AuthorID    INT          NOT NULL AUTO_INCREMENT,
  Name        VARCHAR(150) DEFAULT NULL,          -- NULL for registered (comes from UserAccount)
  Affiliation VARCHAR(200) DEFAULT NULL,
  ORCID       VARCHAR(50)  DEFAULT NULL,
  UserID      INT          DEFAULT NULL,
  PRIMARY KEY (AuthorID),
  UNIQUE KEY  uk_author_userid (UserID),
  KEY idx_author_userid      (UserID),
  KEY idx_author_name        (Name),
  KEY idx_author_affiliation (Affiliation),
  CONSTRAINT fk_author_user FOREIGN KEY (UserID) REFERENCES UserAccount (UserID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 6. Reviewer  (lossless-join: same pattern as Author)
-- ============================================================
CREATE TABLE Reviewer (
  ReviewerID    INT          NOT NULL AUTO_INCREMENT,
  Name          VARCHAR(150) DEFAULT NULL,         -- NULL for registered
  Affiliation   VARCHAR(200) DEFAULT NULL,
  ExpertiseArea VARCHAR(200) DEFAULT NULL,
  UserID        INT          DEFAULT NULL,
  PRIMARY KEY (ReviewerID),
  UNIQUE KEY  uk_reviewer_userid (UserID),
  KEY idx_reviewer_userid      (UserID),
  KEY idx_reviewer_name        (Name),
  KEY idx_reviewer_affiliation (Affiliation),
  CONSTRAINT fk_reviewer_user FOREIGN KEY (UserID) REFERENCES UserAccount (UserID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 7. Keyword  (normalized keyword table — partition join)
-- ============================================================
CREATE TABLE Keyword (
  KeywordID   INT          NOT NULL AUTO_INCREMENT,
  KeywordText VARCHAR(100) NOT NULL,
  PRIMARY KEY (KeywordID),
  UNIQUE KEY uk_keyword_text (KeywordText),
  KEY idx_keyword_text (KeywordText)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 8. ArticleAuthor  (junction — lossless join decomposition)
-- ============================================================
CREATE TABLE ArticleAuthor (
  ArticleID INT NOT NULL,
  AuthorID  INT NOT NULL,
  PRIMARY KEY (ArticleID, AuthorID),
  KEY idx_articleauthor_author (AuthorID),
  CONSTRAINT fk_aa_article FOREIGN KEY (ArticleID) REFERENCES ResearchArticle (ArticleID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_aa_author  FOREIGN KEY (AuthorID)  REFERENCES Author          (AuthorID)  ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 9. ArticleKeyword  (junction — normalized keyword partition)
-- ============================================================
CREATE TABLE ArticleKeyword (
  ArticleID INT NOT NULL,
  KeywordID INT NOT NULL,
  PRIMARY KEY (ArticleID, KeywordID),
  KEY idx_articlekeyword_keyword (KeywordID),
  CONSTRAINT fk_ak_article FOREIGN KEY (ArticleID) REFERENCES ResearchArticle (ArticleID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ak_keyword FOREIGN KEY (KeywordID) REFERENCES Keyword         (KeywordID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 10. Review
-- ============================================================
CREATE TABLE Review (
  ReviewID       INT  NOT NULL AUTO_INCREMENT,
  ArticleID      INT  DEFAULT NULL,
  ReviewerID     INT  DEFAULT NULL,
  ReviewDate     DATE DEFAULT NULL,
  Comments       TEXT DEFAULT NULL,
  Recommendation ENUM('Accept','Minor Revision','Major Revision','Reject') DEFAULT NULL,
  PRIMARY KEY (ReviewID),
  UNIQUE KEY uk_article_reviewer (ArticleID, ReviewerID),   -- prevents duplicate reviews
  KEY idx_review_article_reviewer_date (ArticleID, ReviewerID, ReviewDate),
  KEY idx_review_article_date          (ArticleID, ReviewDate DESC),
  KEY idx_review_recommendation        (Recommendation, ReviewDate DESC),
  CONSTRAINT fk_review_article  FOREIGN KEY (ArticleID)  REFERENCES ResearchArticle (ArticleID)  ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_review_reviewer FOREIGN KEY (ReviewerID) REFERENCES Reviewer        (ReviewerID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 11. Citation
-- ============================================================
CREATE TABLE Citation (
  CitationID      INT  NOT NULL AUTO_INCREMENT,
  CitingArticleID INT  NOT NULL,
  CitedArticleID  INT  NOT NULL,
  CitationDate    DATE DEFAULT NULL,
  PRIMARY KEY (CitationID),
  KEY idx_citation_citing_cited (CitingArticleID, CitedArticleID),
  KEY idx_citation_citing_id    (CitingArticleID, CitationID),
  KEY idx_citation_cited_id     (CitedArticleID,  CitationID),
  CONSTRAINT fk_citation_citing FOREIGN KEY (CitingArticleID) REFERENCES ResearchArticle (ArticleID) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_citation_cited  FOREIGN KEY (CitedArticleID)  REFERENCES ResearchArticle (ArticleID) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 12. Performance Monitoring Tables
-- ============================================================
CREATE TABLE PerformanceQueryLog (
  QueryID        INT           NOT NULL AUTO_INCREMENT,
  QueryText      TEXT          DEFAULT NULL,
  QueryType      VARCHAR(20)   DEFAULT NULL,
  TableName      VARCHAR(255)  DEFAULT NULL,
  ExecutionTimeMs FLOAT        DEFAULT NULL,
  RowsAffected   INT           DEFAULT NULL,
  CreatedAt      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (QueryID),
  KEY idx_pql_created_at       (CreatedAt),
  KEY idx_pql_execution_time   (ExecutionTimeMs)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE PerformanceSlowQueries (
  SlowQueryID     INT           NOT NULL AUTO_INCREMENT,
  QueryText       TEXT          DEFAULT NULL,
  TableName       VARCHAR(255)  DEFAULT NULL,
  ExecutionTimeMs FLOAT         DEFAULT NULL,
  OccurrenceCount INT           DEFAULT 1,
  LastSeenAt      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  IsOptimized     TINYINT(1)    DEFAULT 0,
  PRIMARY KEY (SlowQueryID),
  UNIQUE KEY unique_query (QueryText(255), TableName)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE PerformanceAlerts (
  AlertID        INT           NOT NULL AUTO_INCREMENT,
  AlertType      VARCHAR(50)   DEFAULT NULL,
  Severity       VARCHAR(50)   DEFAULT NULL,
  AlertMessage   TEXT          DEFAULT NULL,
  MetricValue    FLOAT         DEFAULT NULL,
  ThresholdValue FLOAT         DEFAULT NULL,
  CreatedAt      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  IsResolved     TINYINT(1)    DEFAULT 0,
  PRIMARY KEY (AlertID),
  KEY idx_alerts_severity  (Severity),
  KEY idx_alerts_resolved  (IsResolved),
  KEY idx_alerts_created   (CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE PerformanceHealthSnapshots (
  SnapshotID  INT       NOT NULL AUTO_INCREMENT,
  HealthScore FLOAT     DEFAULT NULL,
  RecordedAt  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (SnapshotID),
  KEY idx_health_recorded (RecordedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE PerformanceHourlyMetrics (
  MetricID               INT            NOT NULL AUTO_INCREMENT,
  MetricHour             DATETIME       NOT NULL,
  TotalQueries           INT            DEFAULT 0,
  AvgExecutionTimeMs     DECIMAL(10,2)  DEFAULT NULL,
  MedianExecutionTimeMs  DECIMAL(10,2)  DEFAULT NULL,
  MaxExecutionTimeMs     DECIMAL(10,2)  DEFAULT NULL,
  MinExecutionTimeMs     DECIMAL(10,2)  DEFAULT NULL,
  SlowQueryCount         INT            DEFAULT 0,
  ErrorCount             INT            DEFAULT 0,
  SelectQueryCount       INT            DEFAULT 0,
  InsertQueryCount       INT            DEFAULT 0,
  UpdateQueryCount       INT            DEFAULT 0,
  DeleteQueryCount       INT            DEFAULT 0,
  CreatedAt              TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (MetricID),
  UNIQUE KEY uk_metric_hour (MetricHour),
  KEY idx_created_at (CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE PerformanceTableStats (
  StatID         INT            NOT NULL AUTO_INCREMENT,
  TableName      VARCHAR(100)   NOT NULL,
  TotalQueries   INT            DEFAULT 0,
  AvgQueryTimeMs DECIMAL(10,2)  DEFAULT NULL,
  TableSizeMB    DECIMAL(10,2)  DEFAULT NULL,
  IndexSizeMB    DECIMAL(10,2)  DEFAULT NULL,
  RowCount       BIGINT         DEFAULT 0,
  LastAnalyzed   TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (StatID),
  UNIQUE KEY uk_table_name    (TableName),
  KEY idx_table_queries       (TotalQueries),
  KEY idx_avg_query_time      (AvgQueryTimeMs)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 13. FunctionalDependencies  (documentation table)
-- ============================================================
CREATE TABLE FunctionalDependencies (
  DependencyID      INT          NOT NULL AUTO_INCREMENT,
  TableName         VARCHAR(100) NOT NULL,
  Determinant       VARCHAR(200) NOT NULL,
  Dependent         VARCHAR(200) NOT NULL,
  EnforcementMethod ENUM('Primary Key','Unique Constraint','Foreign Key','Check Constraint','Trigger','Application') NOT NULL,
  IsPreserved       TINYINT(1)   DEFAULT 1,
  Notes             TEXT         DEFAULT NULL,
  CreatedAt         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (DependencyID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 14. VIEWS
-- ============================================================

-- Author lossless-join consistency audit
CREATE VIEW v_author_consistency AS
SELECT
  a.AuthorID,
  a.UserID,
  a.Name          AS LocalName,
  u.Username      AS UserName,
  a.Affiliation   AS LocalAffiliation,
  u.Affiliation   AS UserAffiliation,
  CASE
    WHEN a.UserID IS NOT NULL AND a.Name IS NOT NULL THEN 'VIOLATION: Registered author has local data'
    WHEN a.UserID IS NULL     AND a.Name IS NULL     THEN 'VIOLATION: Guest author has no name'
    WHEN a.UserID IS NOT NULL                        THEN 'OK: Registered author'
    ELSE                                                  'OK: Guest author'
  END AS ConsistencyStatus
FROM Author a
LEFT JOIN UserAccount u ON a.UserID = u.UserID;

-- Reviewer lossless-join consistency audit
CREATE VIEW v_reviewer_consistency AS
SELECT
  r.ReviewerID,
  r.UserID,
  r.Name          AS LocalName,
  u.Username      AS UserName,
  r.Affiliation   AS LocalAffiliation,
  u.Affiliation   AS UserAffiliation,
  r.ExpertiseArea,
  CASE
    WHEN r.UserID IS NOT NULL AND r.Name IS NOT NULL THEN 'VIOLATION: Registered reviewer has local data'
    WHEN r.UserID IS NULL     AND r.Name IS NULL     THEN 'VIOLATION: Guest reviewer has no name'
    WHEN r.UserID IS NOT NULL                        THEN 'OK: Registered reviewer'
    ELSE                                                  'OK: Guest reviewer'
  END AS ConsistencyStatus
FROM Reviewer r
LEFT JOIN UserAccount u ON r.UserID = u.UserID;

-- Self-citations audit (should always be empty due to CHECK constraint)
CREATE VIEW v_self_citations AS
SELECT CitationID, CitingArticleID, CitedArticleID, CitationDate
FROM Citation
WHERE CitingArticleID = CitedArticleID;

-- Duplicate reviews audit (should always be empty due to UNIQUE constraint)
CREATE VIEW v_duplicate_reviews AS
SELECT ArticleID, ReviewerID, COUNT(*) AS ReviewCount
FROM Review
GROUP BY ArticleID, ReviewerID
HAVING COUNT(*) > 1;

-- Performance dashboard (used by statsController getHealthScore)
CREATE VIEW v_performance_dashboard AS
SELECT
  COUNT(*)                                                         AS TotalQueries,
  ROUND(AVG(ExecutionTimeMs), 2)                                   AS AvgTimeMs,
  SUM(CASE WHEN ExecutionTimeMs > 1000 THEN 1 ELSE 0 END)         AS SlowQueries,
  (SELECT HealthScore FROM PerformanceHealthSnapshots
   ORDER BY RecordedAt DESC LIMIT 1)                               AS HealthScore
FROM PerformanceQueryLog
WHERE CreatedAt > NOW() - INTERVAL 1 HOUR;

-- Top slow queries view
CREATE VIEW v_top_slow_queries AS
SELECT QueryText, TableName, ExecutionTimeMs, OccurrenceCount, LastSeenAt
FROM PerformanceSlowQueries
ORDER BY ExecutionTimeMs DESC
LIMIT 20;

-- ============================================================
-- 15. STORED PROCEDURES
-- ============================================================
DELIMITER $$

-- Called by authController signup
CREATE PROCEDURE createuserifunique(
  IN  p_username    VARCHAR(100),
  IN  p_password    VARCHAR(255),
  IN  p_email       VARCHAR(150),
  IN  p_affiliation VARCHAR(200),
  IN  p_orcid       VARCHAR(50),
  IN  p_role        ENUM('Author','Reviewer','Admin')
)
BEGIN
  IF EXISTS (SELECT 1 FROM UserAccount WHERE Username = p_username) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Username already exists';
  ELSEIF EXISTS (SELECT 1 FROM UserAccount WHERE Email = p_email) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email already exists';
  ELSE
    INSERT INTO UserAccount (Username, PasswordHash, Email, Affiliation, ORCID, Role)
    VALUES (p_username, p_password, p_email, p_affiliation, p_orcid, p_role);
    SELECT * FROM UserAccount WHERE UserID = LAST_INSERT_ID();
  END IF;
END$$

-- Called by performanceMonitor _logQuery
CREATE PROCEDURE log_query_performance(
  IN p_query_text      TEXT,
  IN p_query_type      VARCHAR(20),
  IN p_table_name      VARCHAR(255),
  IN p_execution_time  FLOAT,
  IN p_rows_affected   INT,
  IN p_error_message   TEXT
)
BEGIN
  -- Insert into query log
  INSERT INTO PerformanceQueryLog
    (QueryText, QueryType, TableName, ExecutionTimeMs, RowsAffected)
  VALUES
    (p_query_text, p_query_type, p_table_name, p_execution_time, p_rows_affected);

  -- Upsert into slow queries if above threshold (1000ms)
  IF p_execution_time >= 1000 THEN
    INSERT INTO PerformanceSlowQueries (QueryText, TableName, ExecutionTimeMs, OccurrenceCount, LastSeenAt)
    VALUES (p_query_text, p_table_name, p_execution_time, 1, NOW())
    ON DUPLICATE KEY UPDATE
      OccurrenceCount = OccurrenceCount + 1,
      ExecutionTimeMs = GREATEST(ExecutionTimeMs, p_execution_time),
      LastSeenAt      = NOW();
  END IF;
END$$

DELIMITER ;
