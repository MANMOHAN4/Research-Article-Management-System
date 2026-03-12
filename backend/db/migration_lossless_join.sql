-- ============================================================
-- MIGRATION SCRIPT: Lossless Join Decomposition
-- Research Article Management System
-- ============================================================
-- IMPORTANT: Backup your database before running this script!
-- Run each step carefully and verify data integrity
-- ============================================================

USE research_article_management;

-- ============================================================
-- STEP 1: Add PublicationType to ResearchArticle
-- Impact: LOW - Just adds a new column
-- ============================================================

ALTER TABLE ResearchArticle 
ADD COLUMN PublicationType ENUM('Journal', 'Conference', 'Unpublished') 
NOT NULL DEFAULT 'Unpublished';

-- Update existing data based on current JournalID/ConferenceID values
UPDATE ResearchArticle 
SET PublicationType = 'Journal' 
WHERE JournalID IS NOT NULL;

UPDATE ResearchArticle 
SET PublicationType = 'Conference' 
WHERE ConferenceID IS NOT NULL AND JournalID IS NULL;

-- Add constraint to enforce mutual exclusivity
ALTER TABLE ResearchArticle
ADD CONSTRAINT chk_publication_type CHECK (
  (PublicationType = 'Journal' AND JournalID IS NOT NULL AND ConferenceID IS NULL) OR
  (PublicationType = 'Conference' AND ConferenceID IS NOT NULL AND JournalID IS NULL) OR
  (PublicationType = 'Unpublished' AND JournalID IS NULL AND ConferenceID IS NULL)
);

-- Verify the change
SELECT PublicationType, COUNT(*) as Count
FROM ResearchArticle
GROUP BY PublicationType;

-- ============================================================
-- STEP 2: Normalize Keywords Table
-- Impact: MEDIUM - Affects article creation and search
-- ============================================================

-- Create Keyword table
CREATE TABLE Keyword (
    KeywordID INT AUTO_INCREMENT PRIMARY KEY,
    KeywordText VARCHAR(100) NOT NULL UNIQUE,
    INDEX idx_keyword_text (KeywordText)
);

-- Create junction table
CREATE TABLE ArticleKeyword (
    ArticleID INT,
    KeywordID INT,
    PRIMARY KEY (ArticleID, KeywordID),
    FOREIGN KEY (ArticleID) REFERENCES ResearchArticle(ArticleID) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (KeywordID) REFERENCES Keyword(KeywordID) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_article_id (ArticleID),
    INDEX idx_keyword_id (KeywordID)
);

-- Migrate existing keywords data
DELIMITER $$

CREATE PROCEDURE migrate_keywords()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE article_id INT;
    DECLARE keywords_str VARCHAR(255);
    DECLARE single_keyword VARCHAR(100);
    DECLARE keyword_id INT;
    DECLARE cur CURSOR FOR 
        SELECT ArticleID, Keywords 
        FROM ResearchArticle 
        WHERE Keywords IS NOT NULL AND Keywords != '';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO article_id, keywords_str;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- Split keywords by comma and insert
        -- This is a simple version; for production, use a proper string split function
        SET keywords_str = TRIM(keywords_str);
        
        keyword_loop: WHILE LENGTH(keywords_str) > 0 DO
            -- Find next comma
            SET single_keyword = TRIM(SUBSTRING_INDEX(keywords_str, ',', 1));
            
            -- Insert keyword if it doesn't exist
            INSERT IGNORE INTO Keyword (KeywordText) VALUES (single_keyword);
            
            -- Get keyword ID
            SELECT KeywordID INTO keyword_id 
            FROM Keyword 
            WHERE KeywordText = single_keyword;
            
            -- Link article to keyword
            INSERT IGNORE INTO ArticleKeyword (ArticleID, KeywordID) 
            VALUES (article_id, keyword_id);
            
            -- Remove processed keyword from string
            IF LOCATE(',', keywords_str) > 0 THEN
                SET keywords_str = TRIM(SUBSTRING(keywords_str, LOCATE(',', keywords_str) + 1));
            ELSE
                SET keywords_str = '';
            END IF;
        END WHILE keyword_loop;
    END LOOP;
    
    CLOSE cur;
END$$

DELIMITER ;

-- Run the migration procedure
CALL migrate_keywords();

-- Verify the migration
SELECT 
    ra.ArticleID, 
    ra.Title, 
    ra.Keywords as OldKeywords,
    GROUP_CONCAT(k.KeywordText SEPARATOR ', ') as NewKeywords
FROM ResearchArticle ra
LEFT JOIN ArticleKeyword ak ON ra.ArticleID = ak.ArticleID
LEFT JOIN Keyword k ON ak.KeywordID = k.KeywordID
GROUP BY ra.ArticleID
LIMIT 10;

-- After verification, you can drop the old Keywords column
-- ALTER TABLE ResearchArticle DROP COLUMN Keywords;
-- (Commented out for safety - uncomment after verification)

DROP PROCEDURE migrate_keywords;

-- ============================================================
-- STEP 3: Remove Redundancy from Author and Reviewer Tables
-- Impact: MEDIUM - Affects multiple controllers
-- ============================================================

-- First, ensure all Authors have a UserID
-- You might need to handle orphan authors differently
SELECT COUNT(*) as OrphanAuthors 
FROM Author 
WHERE UserID IS NULL;

-- For authors without UserID, you have options:
-- Option 1: Create UserAccount entries for them (if they should have accounts)
-- Option 2: Keep them as-is and only normalize those with UserID
-- Option 3: Delete orphan authors (if they're not real users)

-- For this migration, we'll preserve data by only normalizing linked accounts

-- Create backup tables (optional but recommended)
CREATE TABLE Author_backup AS SELECT * FROM Author;
CREATE TABLE Reviewer_backup AS SELECT * FROM Reviewer;

-- Remove redundant columns from Author
-- Note: We keep Name for orphan authors who don't have UserID
ALTER TABLE Author 
MODIFY COLUMN Name VARCHAR(150) NULL,
MODIFY COLUMN Affiliation VARCHAR(200) NULL,
MODIFY COLUMN ORCID VARCHAR(50) NULL;

-- Update the columns to NULL where UserID exists
-- (The data will come from UserAccount via JOIN)
UPDATE Author 
SET Name = NULL, Affiliation = NULL, ORCID = NULL 
WHERE UserID IS NOT NULL;

-- Similar for Reviewer
ALTER TABLE Reviewer
MODIFY COLUMN Name VARCHAR(150) NULL,
MODIFY COLUMN Affiliation VARCHAR(200) NULL;

UPDATE Reviewer 
SET Name = NULL, Affiliation = NULL 
WHERE UserID IS NOT NULL;

-- Verify the normalization
SELECT 
    a.AuthorID,
    COALESCE(u.Username, a.Name) as Name,
    COALESCE(u.Affiliation, a.Affiliation) as Affiliation,
    COALESCE(u.ORCID, a.ORCID) as ORCID
FROM Author a
LEFT JOIN UserAccount u ON a.UserID = u.UserID
LIMIT 10;

-- ============================================================
-- STEP 4 (OPTIONAL): Separate Journal and Conference Publications
-- Impact: HIGH - Major schema change
-- Note: Only implement if you want complete normalization
-- ============================================================

-- Create JournalPublication table
CREATE TABLE JournalPublication (
    PublicationID INT AUTO_INCREMENT PRIMARY KEY,
    ArticleID INT UNIQUE NOT NULL,
    JournalID INT NOT NULL,
    PublicationDate DATE,
    Volume VARCHAR(50),
    Issue VARCHAR(50),
    Pages VARCHAR(50),
    FOREIGN KEY (ArticleID) REFERENCES ResearchArticle(ArticleID) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (JournalID) REFERENCES Journal(JournalID) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_article_id (ArticleID),
    INDEX idx_journal_id (JournalID)
);

-- Create ConferencePublication table
CREATE TABLE ConferencePublication (
    PublicationID INT AUTO_INCREMENT PRIMARY KEY,
    ArticleID INT UNIQUE NOT NULL,
    ConferenceID INT NOT NULL,
    PresentationDate DATE,
    SessionName VARCHAR(100),
    FOREIGN KEY (ArticleID) REFERENCES ResearchArticle(ArticleID) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (ConferenceID) REFERENCES Conference(ConferenceID) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_article_id (ArticleID),
    INDEX idx_conference_id (ConferenceID)
);

-- Migrate existing journal publications
INSERT INTO JournalPublication (ArticleID, JournalID)
SELECT ArticleID, JournalID
FROM ResearchArticle
WHERE JournalID IS NOT NULL;

-- Migrate existing conference publications
INSERT INTO ConferencePublication (ArticleID, ConferenceID)
SELECT ArticleID, ConferenceID
FROM ResearchArticle
WHERE ConferenceID IS NOT NULL;

-- Verify the migration
SELECT 
    'Journal' as Type,
    COUNT(*) as Count
FROM JournalPublication
UNION ALL
SELECT 
    'Conference' as Type,
    COUNT(*) as Count
FROM ConferencePublication
UNION ALL
SELECT
    'Original Journal' as Type,
    COUNT(*) as Count
FROM ResearchArticle
WHERE JournalID IS NOT NULL
UNION ALL
SELECT
    'Original Conference' as Type,
    COUNT(*) as Count
FROM ResearchArticle
WHERE ConferenceID IS NOT NULL;

-- After verification, drop the old columns and constraints
-- DROP INDEX JournalID ON ResearchArticle;
-- DROP INDEX ConferenceID ON ResearchArticle;
-- ALTER TABLE ResearchArticle DROP FOREIGN KEY ResearchArticle_ibfk_1;
-- ALTER TABLE ResearchArticle DROP FOREIGN KEY ResearchArticle_ibfk_2;
-- ALTER TABLE ResearchArticle DROP COLUMN JournalID;
-- ALTER TABLE ResearchArticle DROP COLUMN ConferenceID;
-- ALTER TABLE ResearchArticle DROP CONSTRAINT chk_publication_type;
-- (Commented out for safety - uncomment after verification)

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- 1. Verify lossless join for Authors
SELECT 
    a.AuthorID,
    COALESCE(u.Username, a.Name) as Name,
    COALESCE(u.Email, 'N/A') as Email,
    COALESCE(u.Affiliation, a.Affiliation) as Affiliation
FROM Author a
LEFT JOIN UserAccount u ON a.UserID = u.UserID;

-- 2. Verify lossless join for Articles with Keywords
SELECT 
    ra.ArticleID,
    ra.Title,
    GROUP_CONCAT(k.KeywordText ORDER BY k.KeywordText SEPARATOR ', ') as Keywords
FROM ResearchArticle ra
LEFT JOIN ArticleKeyword ak ON ra.ArticleID = ak.ArticleID
LEFT JOIN Keyword k ON ak.KeywordID = k.KeywordID
GROUP BY ra.ArticleID, ra.Title;

-- 3. Verify lossless join for Publications (if Step 4 was executed)
SELECT 
    ra.ArticleID,
    ra.Title,
    ra.PublicationType,
    j.Name as JournalName,
    c.Name as ConferenceName
FROM ResearchArticle ra
LEFT JOIN JournalPublication jp ON ra.ArticleID = jp.ArticleID
LEFT JOIN Journal j ON jp.JournalID = j.JournalID
LEFT JOIN ConferencePublication cp ON ra.ArticleID = cp.ArticleID
LEFT JOIN Conference c ON cp.ConferenceID = c.ConferenceID;

-- ============================================================
-- ROLLBACK PLAN
-- ============================================================

-- If you need to rollback Step 3:
/*
DROP TABLE Author;
CREATE TABLE Author AS SELECT * FROM Author_backup;
DROP TABLE Reviewer;
CREATE TABLE Reviewer AS SELECT * FROM Reviewer_backup;
*/

-- If you need to rollback Step 2:
/*
DROP TABLE ArticleKeyword;
DROP TABLE Keyword;
*/

-- If you need to rollback Step 4:
/*
DROP TABLE JournalPublication;
DROP TABLE ConferencePublication;
-- Restore the columns and constraints manually
*/

SELECT 'Migration completed successfully!' as Status;
