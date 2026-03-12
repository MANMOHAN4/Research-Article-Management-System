# Testing Guide: Verifying Lossless Join Decomposition

## Objective
Verify that the normalized database maintains data integrity and that all original data can be reconstructed through joins (lossless join property).

## Prerequisites
- Complete database backup
- Migration script executed successfully
- Sample data populated

---

## Test 1: Author Data Integrity

### Test 1A: Verify Registered Authors
```sql
-- Original data retrieval method (before normalization)
SELECT AuthorID, Name, Affiliation, ORCID
FROM Author_backup
WHERE UserID IS NOT NULL
ORDER BY AuthorID;

-- New normalized retrieval (should match exactly)
SELECT 
    a.AuthorID,
    u.Username as Name,
    u.Affiliation,
    u.ORCID
FROM Author a
INNER JOIN UserAccount u ON a.UserID = u.UserID
ORDER BY a.AuthorID;

-- Compare counts
SELECT 'Backup' as Source, COUNT(*) as Count FROM Author_backup WHERE UserID IS NOT NULL
UNION ALL
SELECT 'Normalized' as Source, COUNT(*) as Count 
FROM Author a INNER JOIN UserAccount u ON a.UserID = u.UserID;
```

**Expected**: Both queries return identical data and counts.

---

### Test 1B: Verify Guest Authors
```sql
-- Guest authors (no UserID) should still have their local data
SELECT 
    AuthorID,
    Name,
    Affiliation,
    ORCID
FROM Author
WHERE UserID IS NULL
ORDER BY AuthorID;
```

**Expected**: Guest authors retain their original data.

---

## Test 2: Keyword Normalization

### Test 2A: Verify Keyword Extraction
```sql
-- Compare original comma-separated keywords with normalized version
SELECT 
    ra.ArticleID,
    ra.Title,
    -- Original (from backup if Keywords column still exists)
    ra.Keywords as OriginalKeywords,
    -- Reconstructed from normalized tables
    GROUP_CONCAT(k.KeywordText ORDER BY k.KeywordText SEPARATOR ', ') as NormalizedKeywords
FROM ResearchArticle ra
LEFT JOIN ArticleKeyword ak ON ra.ArticleID = ak.ArticleID
LEFT JOIN Keyword k ON ak.KeywordID = k.KeywordID
GROUP BY ra.ArticleID, ra.Title, ra.Keywords
HAVING OriginalKeywords IS NOT NULL
ORDER BY ra.ArticleID;
```

**Expected**: OriginalKeywords and NormalizedKeywords should be semantically equivalent (order may differ).

---

### Test 2B: Count Keywords
```sql
-- Verify no keywords were lost
SELECT 
    'Total Articles' as Metric,
    COUNT(*) as Count
FROM ResearchArticle
WHERE Keywords IS NOT NULL AND Keywords != ''

UNION ALL

SELECT 
    'Articles with Normalized Keywords' as Metric,
    COUNT(DISTINCT ak.ArticleID) as Count
FROM ArticleKeyword ak

UNION ALL

SELECT 
    'Unique Keywords Extracted' as Metric,
    COUNT(*) as Count
FROM Keyword;
```

**Expected**: Articles with keywords count should match before and after.

---

## Test 3: Publication Type Consistency

### Test 3A: Verify Publication Type Assignment
```sql
SELECT 
    PublicationType,
    COUNT(*) as Count,
    SUM(CASE WHEN JournalID IS NOT NULL THEN 1 ELSE 0 END) as HasJournalID,
    SUM(CASE WHEN ConferenceID IS NOT NULL THEN 1 ELSE 0 END) as HasConferenceID,
    SUM(CASE WHEN JournalID IS NULL AND ConferenceID IS NULL THEN 1 ELSE 0 END) as NoVenue
FROM ResearchArticle
GROUP BY PublicationType;
```

**Expected Results**:
- 'Journal' type: HasJournalID = Count, HasConferenceID = 0
- 'Conference' type: HasConferenceID = Count, HasJournalID = 0  
- 'Unpublished' type: NoVenue = Count

---

### Test 3B: Test CHECK Constraint
```sql
-- This should FAIL (violates constraint)
INSERT INTO ResearchArticle 
(Title, PublicationType, JournalID, ConferenceID)
VALUES 
('Test Article', 'Journal', 1, 1);
-- Expected: Error due to CHECK constraint

-- This should SUCCEED
INSERT INTO ResearchArticle 
(Title, PublicationType, JournalID)
VALUES 
('Valid Journal Article', 'Journal', 1);
-- Expected: Success

-- Clean up
DELETE FROM ResearchArticle WHERE Title = 'Valid Journal Article';
```

---

## Test 4: Complete Data Reconstruction

### Test 4A: Reconstruct Full Article View
```sql
-- This should reconstruct the complete article information
-- exactly as it appeared before normalization
SELECT 
    ra.ArticleID,
    ra.Title,
    ra.Abstract,
    ra.DOI,
    ra.Status,
    ra.SubmissionDate,
    ra.PublicationType,
    -- Journal info (lossless join)
    j.Name as JournalName,
    j.Publisher,
    j.ImpactFactor,
    -- Conference info (lossless join)
    c.Name as ConferenceName,
    c.Location,
    c.StartDate,
    -- Authors (lossless join)
    GROUP_CONCAT(
        DISTINCT COALESCE(u.Username, a.Name) 
        ORDER BY a.AuthorID 
        SEPARATOR ', '
    ) as Authors,
    -- Keywords (lossless join)
    GROUP_CONCAT(
        DISTINCT k.KeywordText 
        ORDER BY k.KeywordText 
        SEPARATOR ', '
    ) as Keywords,
    -- Review count
    COUNT(DISTINCT r.ReviewID) as ReviewCount
FROM ResearchArticle ra
LEFT JOIN Journal j ON ra.JournalID = j.JournalID
LEFT JOIN Conference c ON ra.ConferenceID = c.ConferenceID
LEFT JOIN ArticleAuthor aa ON ra.ArticleID = aa.ArticleID
LEFT JOIN Author a ON aa.AuthorID = a.AuthorID
LEFT JOIN UserAccount u ON a.UserID = u.UserID
LEFT JOIN ArticleKeyword ak ON ra.ArticleID = ak.ArticleID
LEFT JOIN Keyword k ON ak.KeywordID = k.KeywordID
LEFT JOIN Review r ON ra.ArticleID = r.ArticleID
GROUP BY ra.ArticleID
ORDER BY ra.ArticleID
LIMIT 10;
```

**Expected**: All original article data is reconstructable.

---

### Test 4B: Verify No Data Loss
```sql
-- Count total records in each table before and after
SELECT 'ResearchArticle' as TableName, COUNT(*) as BeforeCount 
FROM ResearchArticle
UNION ALL
SELECT 'Author' as TableName, COUNT(*) 
FROM Author_backup
UNION ALL
SELECT 'Author (Normalized)' as TableName, COUNT(*) 
FROM Author;

-- Verify all relationships are preserved
SELECT 
    'ArticleAuthor relationships' as Check,
    COUNT(*) as Count
FROM ArticleAuthor;
```

---

## Test 5: Functional Dependency Preservation

### Test 5A: Verify UserID → Name, Affiliation, ORCID
```sql
-- This should return only 1 row per UserID
-- (proving the functional dependency is maintained)
SELECT 
    UserID,
    COUNT(DISTINCT Username) as UniqueNames,
    COUNT(DISTINCT Email) as UniqueEmails,
    COUNT(DISTINCT Affiliation) as UniqueAffiliations
FROM UserAccount
GROUP BY UserID
HAVING UniqueNames > 1 OR UniqueEmails > 1;
```

**Expected**: No rows returned (empty result set).

---

### Test 5B: Verify AuthorID → UserID
```sql
-- Each AuthorID should map to at most one UserID
SELECT 
    AuthorID,
    COUNT(DISTINCT UserID) as UserIDCount
FROM Author
WHERE UserID IS NOT NULL
GROUP BY AuthorID
HAVING UserIDCount > 1;
```

**Expected**: No rows returned.

---

## Test 6: Performance Comparison

### Test 6A: Search Performance
```sql
-- Before normalization (if Keywords column exists)
EXPLAIN SELECT * FROM ResearchArticle 
WHERE Keywords LIKE '%machine learning%';

-- After normalization
EXPLAIN SELECT DISTINCT ra.* 
FROM ResearchArticle ra
JOIN ArticleKeyword ak ON ra.ArticleID = ak.ArticleID
JOIN Keyword k ON ak.KeywordID = k.KeywordID
WHERE k.KeywordText = 'machine learning';
```

**Expected**: Normalized version should use indexes more efficiently.

---

### Test 6B: Join Performance
```sql
-- Measure execution time for complex join
SET profiling = 1;

SELECT 
    ra.ArticleID,
    ra.Title,
    GROUP_CONCAT(k.KeywordText SEPARATOR ', ') as Keywords
FROM ResearchArticle ra
LEFT JOIN ArticleKeyword ak ON ra.ArticleID = ak.ArticleID
LEFT JOIN Keyword k ON ak.KeywordID = k.KeywordID
GROUP BY ra.ArticleID;

SHOW PROFILES;
SET profiling = 0;
```

---

## Test 7: Application-Level Tests

### Test 7A: Create Article with Keywords
```javascript
// Test data
const testArticle = {
  title: "Test Article for Lossless Join",
  abstract: "Testing normalized schema",
  keywords: ["machine learning", "database", "normalization"],
  authors: [
    { name: "Test Author", affiliation: "Test University" }
  ],
  publicationType: "Unpublished"
};

// POST to /api/articles
// Verify:
// 1. Article created successfully
// 2. All keywords appear in Keyword table
// 3. All keyword links appear in ArticleKeyword
// 4. GET /api/articles/:id returns keywords correctly
```

---

### Test 7B: Search by Keywords
```javascript
// GET /api/articles/search?q=machine learning
// Verify:
// 1. Articles with "machine learning" keyword are returned
// 2. Results match original functionality
// 3. Performance is acceptable
```

---

## Test 8: Edge Cases

### Test 8A: Null Values
```sql
-- Articles with no keywords
SELECT COUNT(*) FROM ResearchArticle ra
LEFT JOIN ArticleKeyword ak ON ra.ArticleID = ak.ArticleID
WHERE ak.ArticleID IS NULL;
```

**Expected**: Should return count without errors.

---

### Test 8B: Duplicate Keywords
```sql
-- Verify no duplicate keywords exist
SELECT KeywordText, COUNT(*) as Count
FROM Keyword
GROUP BY KeywordText
HAVING Count > 1;
```

**Expected**: No duplicates.

---

### Test 8C: Orphaned Records
```sql
-- Check for orphaned keywords
SELECT k.* FROM Keyword k
LEFT JOIN ArticleKeyword ak ON k.KeywordID = ak.KeywordID
WHERE ak.KeywordID IS NULL;

-- Check for orphaned article-keyword links
SELECT ak.* FROM ArticleKeyword ak
LEFT JOIN ResearchArticle ra ON ak.ArticleID = ra.ArticleID
WHERE ra.ArticleID IS NULL;
```

**Expected**: No orphaned records.

---

## Test Results Checklist

- [ ] All author data reconstructable via joins
- [ ] All keywords properly normalized
- [ ] Publication types correctly assigned
- [ ] CHECK constraints working
- [ ] No data loss occurred
- [ ] Functional dependencies preserved
- [ ] Performance acceptable
- [ ] Application still works correctly
- [ ] No orphaned records
- [ ] Edge cases handled properly

---

## Rollback Criteria

If any of these tests fail, consider rolling back:
1. Data cannot be reconstructed (lossless join fails)
2. Count mismatch in any table
3. Functional dependencies violated
4. Application breaks
5. Unacceptable performance degradation

---

## Success Criteria

✅ All tests pass
✅ Application works normally
✅ Performance is same or better
✅ Data integrity maintained
✅ Lossless join property verified
