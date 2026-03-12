# Database Normalization Analysis - Research Article Management System

## Current Schema Issues

### 1. **Author Table - Partial Redundancy**
```
Author(AuthorID, Name, Affiliation, ORCID, UserID)
```
**Issue**: Author information (Name, Affiliation, ORCID) is duplicated from UserAccount when UserID exists.

**Functional Dependencies**:
- UserID → Name, Affiliation, ORCID (from UserAccount)
- AuthorID → Name, Affiliation, ORCID, UserID

**Problem**: Violates 3NF due to transitive dependency through UserID.

---

### 2. **Reviewer Table - Same Issue**
```
Reviewer(ReviewerID, Name, Affiliation, ExpertiseArea, UserID)
```
**Issue**: Similar redundancy with UserAccount data.

**Functional Dependencies**:
- UserID → Name, Affiliation (from UserAccount)
- ReviewerID → Name, Affiliation, ExpertiseArea, UserID

---

### 3. **ResearchArticle Table - Potential Issues**
```
ResearchArticle(ArticleID, Title, Abstract, DOI, Keywords, SubmissionDate, Status, JournalID, ConferenceID)
```
**Issue**: An article published in a journal shouldn't also have a conference (and vice versa), but the schema allows both.

**Functional Dependencies**:
- ArticleID → Title, Abstract, DOI, Keywords, SubmissionDate, Status, JournalID, ConferenceID
- DOI → ArticleID (DOI is unique)

---

## Recommended Normalization Steps

### Step 1: Eliminate Author/Reviewer Redundancy

**Problem**: Author and Reviewer tables duplicate data from UserAccount.

**Solution**: Remove redundant fields and use UserAccount as the single source of truth.

#### Option A: Pure Normalization (Recommended)
```sql
-- Remove redundant columns from Author
ALTER TABLE Author 
DROP COLUMN Name,
DROP COLUMN Affiliation,
DROP COLUMN ORCID;

-- Remove redundant columns from Reviewer
ALTER TABLE Reviewer
DROP COLUMN Name,
DROP COLUMN Affiliation;

-- Author now only stores role-specific data
Author(AuthorID, UserID)

-- Reviewer now only stores role-specific data
Reviewer(ReviewerID, ExpertiseArea, UserID)
```

**Lossless Join Verification**:
- Can reconstruct full author info: `Author ⋈ UserAccount` using UserID
- Can reconstruct full reviewer info: `Reviewer ⋈ UserAccount` using UserID
- Common attribute (UserID) is a key in UserAccount → **Lossless Join ✓**

---

### Step 2: Separate Journal and Conference Publications

**Problem**: An article can have both JournalID and ConferenceID, which is logically incorrect.

**Solution**: Create a publication type discriminator or separate tables.

#### Option A: Using Enum Discriminator
```sql
-- Add publication type
ALTER TABLE ResearchArticle 
ADD COLUMN PublicationType ENUM('Journal', 'Conference', 'Unpublished') NOT NULL DEFAULT 'Unpublished';

-- Add constraints to enforce mutual exclusivity
ALTER TABLE ResearchArticle
ADD CONSTRAINT chk_publication_type CHECK (
  (PublicationType = 'Journal' AND JournalID IS NOT NULL AND ConferenceID IS NULL) OR
  (PublicationType = 'Conference' AND ConferenceID IS NOT NULL AND JournalID IS NULL) OR
  (PublicationType = 'Unpublished' AND JournalID IS NULL AND ConferenceID IS NULL)
);
```

#### Option B: Separate Tables (Better Normalization)
```sql
-- Create separate publication tables
CREATE TABLE JournalPublication (
    PublicationID INT AUTO_INCREMENT PRIMARY KEY,
    ArticleID INT UNIQUE NOT NULL,
    JournalID INT NOT NULL,
    PublicationDate DATE,
    Volume VARCHAR(50),
    Issue VARCHAR(50),
    Pages VARCHAR(50),
    FOREIGN KEY (ArticleID) REFERENCES ResearchArticle(ArticleID) ON DELETE CASCADE,
    FOREIGN KEY (JournalID) REFERENCES Journal(JournalID) ON DELETE RESTRICT
);

CREATE TABLE ConferencePublication (
    PublicationID INT AUTO_INCREMENT PRIMARY KEY,
    ArticleID INT UNIQUE NOT NULL,
    ConferenceID INT NOT NULL,
    PresentationDate DATE,
    SessionName VARCHAR(100),
    FOREIGN KEY (ArticleID) REFERENCES ResearchArticle(ArticleID) ON DELETE CASCADE,
    FOREIGN KEY (ConferenceID) REFERENCES Conference(ConferenceID) ON DELETE RESTRICT
);

-- Remove from ResearchArticle
ALTER TABLE ResearchArticle 
DROP FOREIGN KEY ResearchArticle_ibfk_1,
DROP FOREIGN KEY ResearchArticle_ibfk_2,
DROP COLUMN JournalID,
DROP COLUMN ConferenceID;
```

**Lossless Join Verification**:
- Original: `ResearchArticle(ArticleID, ..., JournalID, ConferenceID)`
- Decomposed: 
  - `ResearchArticle(ArticleID, ...)`
  - `JournalPublication(ArticleID, JournalID, ...)`
  - `ConferencePublication(ArticleID, ConferenceID, ...)`
- ArticleID is the key → **Lossless Join ✓**

---

### Step 3: Normalize Keywords (Optional but Recommended)

**Problem**: Keywords stored as comma-separated string violates 1NF.

**Solution**: Create a separate Keywords table.

```sql
CREATE TABLE Keyword (
    KeywordID INT AUTO_INCREMENT PRIMARY KEY,
    KeywordText VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE ArticleKeyword (
    ArticleID INT,
    KeywordID INT,
    PRIMARY KEY (ArticleID, KeywordID),
    FOREIGN KEY (ArticleID) REFERENCES ResearchArticle(ArticleID) ON DELETE CASCADE,
    FOREIGN KEY (KeywordID) REFERENCES Keyword(KeywordID) ON DELETE CASCADE
);

-- Remove from ResearchArticle
ALTER TABLE ResearchArticle DROP COLUMN Keywords;
```

**Lossless Join Verification**:
- Can reconstruct: `ResearchArticle ⋈ ArticleKeyword ⋈ Keyword`
- ArticleID is preserved → **Lossless Join ✓**

---

## Functional Dependency Preservation

### Original FDs:
1. UserID → Username, Email, PasswordHash, Affiliation, ORCID, Role
2. AuthorID → Name, Affiliation, ORCID, UserID
3. ReviewerID → Name, Affiliation, ExpertiseArea, UserID
4. ArticleID → Title, Abstract, DOI, Keywords, Status, JournalID, ConferenceID

### After Normalization:
1. UserID → Username, Email, PasswordHash, Affiliation, ORCID, Role ✓
2. AuthorID → UserID (Name, Affiliation via join) ✓
3. ReviewerID → ExpertiseArea, UserID (Name, Affiliation via join) ✓
4. ArticleID → Title, Abstract, DOI, Status (Publication venue via join) ✓

All FDs are preserved → **Dependency Preservation ✓**

---

## Benefits of These Changes

### 1. **Data Integrity**
- No redundant storage of user information
- Single source of truth for user details
- Cascading updates work correctly

### 2. **Storage Efficiency**
- Reduced data duplication
- Smaller table sizes
- Better cache utilization

### 3. **Maintainability**
- Update user info in one place
- No synchronization issues
- Clearer data model

### 4. **Query Performance**
- Indexed joins are efficient
- Reduced write overhead
- Better normalization = better optimization opportunities

---

## Migration Complexity

### Low Impact Changes (Do First):
1. ✅ Add PublicationType discriminator
2. ✅ Add CHECK constraints for mutual exclusivity

### Medium Impact Changes:
1. ⚠️ Normalize Keywords table (affects article creation/search)
2. ⚠️ Remove redundant columns from Author/Reviewer (affects multiple controllers)

### High Impact Changes:
1. ⚠️⚠️ Separate Journal/Conference publication tables (major schema change)

---

## Next Steps

1. **Backup your database**
2. **Create a migration script** (provided separately)
3. **Update controllers** to work with normalized schema
4. **Update frontend** if it directly references removed columns
5. **Test thoroughly** with existing data
