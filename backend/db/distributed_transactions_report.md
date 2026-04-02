# Distributed Transactions Across Multiple Database Instances
## Research Article Management System — MySQL 8.0 XA Protocol
**Database 1 (Instance 1):** research_article_management — Port 3306 (Host MySQL)  
**Database 2 (Instance 2):** audit_db — Port 3307 (Docker: mysql:8.0)  
**Protocol:** XA (eXtended Architecture) — ISO/IEC 9075 2-Phase Commit  
**Date:** 2026-04-02  

---

## 1. Overview

A distributed transaction spans multiple independent database instances and guarantees
atomicity across all of them — either every instance commits or every instance rolls back.
This report documents the implementation and testing of MySQL's native XA protocol to
coordinate distributed transactions between two MySQL 8.0 instances running on separate
processes (one host, one Docker container).

The business scenario modeled is an article submission workflow:

- **Instance 1** records the new article in `ResearchArticle`
- **Instance 2** logs the submission event in `ArticleSubmissionLog`

Both writes must succeed atomically. If either fails, neither write persists.

---

## 2. Architecture

```
Application / Transaction Manager (dbclient / Node.js)
                    |
        ____________|____________
       |                         |
  Instance 1                Instance 2
  Host MySQL 8.0             Docker mysql:8.0
  Port 3306                  Port 3307
  research_article_management audit_db
  Table: ResearchArticle     Table: ArticleSubmissionLog
```

### Infrastructure Setup

Instance 2 was provisioned using Docker:

```bash
docker run --name mysql_instance2 \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=audit_db \
  -p 3307:3306 \
  -d mysql:8.0
```

The audit table was created on Instance 2:

```sql
CREATE TABLE ArticleSubmissionLog (
    LogID     INT AUTO_INCREMENT PRIMARY KEY,
    ArticleID INT NOT NULL,
    Action    VARCHAR(50) NOT NULL,
    Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    XA_TxID   VARCHAR(100)
) ENGINE=InnoDB;
```

InnoDB engine is mandatory — XA transactions are not supported on MyISAM or other
storage engines.

---

## 3. XA Protocol — 2-Phase Commit (2PC)

MySQL implements the XA standard which defines the 2-Phase Commit protocol for
coordinating distributed transactions across multiple Resource Managers (RM).

### Roles

| Role | Description | In This Setup |
|---|---|---|
| Transaction Manager (TM) | Coordinates the overall transaction | Application / manual execution |
| Resource Manager (RM) | Each database instance | Instance 1 (3306), Instance 2 (3307) |
| XID | Unique transaction identifier | e.g., `xa_article_submit_001` |

### XA State Machine

```
XA START 'xid'    -->  ACTIVE   (DML statements executed here)
                           |
XA END 'xid'      -->  IDLE     (branch closed, no more DML)
                           |
XA PREPARE 'xid' -->  PREPARED  (write durably locked, survives crash)
                           |
              _____________|_____________
             |                           |
    XA COMMIT 'xid'            XA ROLLBACK 'xid'
    (write persisted)           (write undone)
```

### Phase 1 — Prepare

Each RM executes its local work and calls `XA PREPARE`. The RM writes the prepared
state durably to disk. At this point the write is locked but not visible to other
transactions. The TM waits for all RMs to confirm PREPARED.

### Phase 2 — Commit or Rollback

If all RMs returned PREPARED successfully, the TM issues `XA COMMIT` to all.
If any RM failed to PREPARE, the TM issues `XA ROLLBACK` to all RMs that did PREPARE.

---

## 4. XA Verification

Before executing transactions, XA support was verified on both instances:

```sql
SELECT ENGINE, SUPPORT, TRANSACTIONS, XA
FROM information_schema.ENGINES
WHERE ENGINE = 'InnoDB';
```

Result on both instances:

```
+--------+---------+--------------+----+
| ENGINE | SUPPORT | TRANSACTIONS | XA |
+--------+---------+--------------+----+
| InnoDB | DEFAULT | YES          | YES|
+--------+---------+--------------+----+
```

Note: The variable `@@innodb_support_xa` was removed in MySQL 8.0. XA support is
always enabled and cannot be disabled in MySQL 8.0 InnoDB.

---

## 5. Scenario 1 — Happy Path (Successful Distributed Commit)

### 5.1 XID Used
`xa_article_submit_001`

### 5.2 Phase 1 — Prepare on Both Instances

**Instance 1 (Port 3306):**

```sql
USE research_article_management;

XA START 'xa_article_submit_001';

INSERT INTO ResearchArticle
    (Title, Abstract, SubmissionDate, Status, PublicationType)
VALUES
    ('Distributed Systems in Research DBs',
     'Study of XA protocol in academic databases.',
     CURDATE(), 'Under Review', 'Journal');

XA END 'xa_article_submit_001';
XA PREPARE 'xa_article_submit_001';
```

**Instance 2 (Port 3307):**

```sql
USE audit_db;

XA START 'xa_article_submit_001';

INSERT INTO ArticleSubmissionLog (ArticleID, Action, XA_TxID)
VALUES (999, 'SUBMITTED', 'xa_article_submit_001');

XA END 'xa_article_submit_001';
XA PREPARE 'xa_article_submit_001';
```

### 5.3 XA RECOVER — Both Instances in PREPARED State

After both `XA PREPARE` calls succeeded, `XA RECOVER` was run on both instances:

**Instance 1 output:**
```
+----------+--------------+--------------+-----------------------+
| formatID | gtrid_length | bqual_length | data                  |
+----------+--------------+--------------+-----------------------+
|        1 |           22 |            0 | xa_article_submit_001 |
+----------+--------------+--------------+-----------------------+
```

**Instance 2 output:**
```
+----------+--------------+--------------+-----------------------+
| formatID | gtrid_length | bqual_length | data                  |
+----------+--------------+--------------+-----------------------+
|        1 |           22 |            0 | xa_article_submit_001 |
+----------+--------------+--------------+-----------------------+
```

Both instances held the XID in PREPARED state simultaneously — writes were locked
but not yet committed on either instance.

### 5.4 Phase 2 — Commit Both

```sql
-- Instance 1
XA COMMIT 'xa_article_submit_001';

-- Instance 2
XA COMMIT 'xa_article_submit_001';
```

### 5.5 Verification

**Instance 1:**
```sql
SELECT ArticleID, Title, Status, SubmissionDate
FROM ResearchArticle
WHERE Title = 'Distributed Systems in Research DBs';
-- Result: 1 row confirmed
```

**Instance 2:**
```sql
SELECT * FROM ArticleSubmissionLog;
-- Result: 1 row, Action='SUBMITTED', XA_TxID='xa_article_submit_001'
```

Both writes persisted atomically across two independent MySQL instances.

---

## 6. Scenario 2 — Failure Path (Distributed Rollback)

### 6.1 XID Used
`xa_fail_test_001` / `xa_fail_test_002`

### 6.2 Sequence

**Instance 1 — PREPARE succeeds:**

```sql
XA START 'xa_fail_test_002';

INSERT INTO ResearchArticle
    (Title, Abstract, SubmissionDate, Status, PublicationType)
VALUES
    ('Failure Test Article', 'XA rollback test',
     CURDATE(), 'Under Review', 'Journal');

XA END 'xa_fail_test_002';
XA PREPARE 'xa_fail_test_002';
-- Succeeds: Instance 1 write is locked in PREPARED state
```

**Instance 2 — SQL fails:**

```sql
XA START 'xa_fail_test_002';

INSERT INTO NonExistentTable (col) VALUES (1);
-- ERROR 1146: Table 'audit_db.NonExistentTable' doesn't exist
-- Instance 2 cannot PREPARE
```

**Instance 2 — Correct rollback sequence after failure:**

```sql
XA END 'xa_fail_test_002';        -- exit ACTIVE state first
XA ROLLBACK 'xa_fail_test_002';   -- now valid from IDLE state
```

**Instance 1 — Rollback since Instance 2 failed:**

```sql
XA ROLLBACK 'xa_fail_test_002';   -- valid from PREPARED state
```

### 6.3 Atomicity Verification

```sql
-- Instance 1
SELECT * FROM ResearchArticle
WHERE Title = 'Failure Test Article';
-- Result: 0 rows
```

Instance 1's write was in PREPARED state — it had durably written to disk — but
`XA ROLLBACK` undid it completely. Zero rows confirms atomicity: the distributed
transaction left no partial writes on any instance.

---

## 7. Errors Encountered and Analysis

### Error 1 — `XAER_RMFAIL: The command cannot be executed when global transaction is in the ACTIVE state`

| Field | Detail |
|---|---|
| Triggered by | `XA ROLLBACK` called directly after SQL failure without `XA END` |
| Root cause | XA branch was still in ACTIVE state; ROLLBACK is not valid from ACTIVE |
| Fix | Always call `XA END 'xid'` before `XA ROLLBACK 'xid'` when SQL fails mid-branch |

### Error 2 — `XAER_NOTA: Unknown XID`

| Field | Detail |
|---|---|
| Triggered by | `XA ROLLBACK 'xa_fail_test_001'` on Instance 1 |
| Root cause | MySQL auto-rolled back the branch when the connection context detected an unresolved ACTIVE branch from a prior failed execution |
| Implication | Not an error in practice — the XID was already cleaned up; verify via SELECT that 0 rows exist |

### Error 3 — `Unknown system variable 'innodb_support_xa'`

| Field | Detail |
|---|---|
| Triggered by | `SELECT @@innodb_support_xa` |
| Root cause | Variable removed in MySQL 8.0; XA is always on |
| Fix | Use `SELECT XA FROM information_schema.ENGINES WHERE ENGINE='InnoDB'` |

---

## 8. Critical Rules for XA Rollback

The correct rollback sequence depends on which state the branch is in when failure occurs:

| State at Failure | Correct Sequence | Error if Wrong |
|---|---|---|
| ACTIVE (during DML) | `XA END` → `XA ROLLBACK` | `XAER_RMFAIL` |
| IDLE (after XA END) | `XA ROLLBACK` directly | — |
| PREPARED (after XA PREPARE) | `XA ROLLBACK` directly | — |
| Already cleaned up | Nothing — verify 0 rows | `XAER_NOTA` |

---

## 9. Node.js Implementation

The following demonstrates the complete XA transaction manager pattern in Node.js,
including proper error handling for the `XAER_RMFAIL` case:

```javascript
const mysql = require('mysql2/promise');

async function distributedArticleSubmit(articleData) {
    const xid = `xa_${Date.now()}`;
    let phase1_inst1 = false;
    let phase1_inst2 = false;
    let inst1_active = false;
    let inst2_active = false;

    const conn1 = await mysql.createConnection({
        host: '127.0.0.1', port: 3306,
        user: 'root', password: 'root',
        database: 'research_article_management'
    });
    const conn2 = await mysql.createConnection({
        host: '127.0.0.1', port: 3307,
        user: 'root', password: 'root',
        database: 'audit_db'
    });

    try {
        // --- Phase 1: Prepare both branches ---

        await conn1.query(`XA START '${xid}'`);
        inst1_active = true;

        const [result] = await conn1.query(
            `INSERT INTO ResearchArticle
             (Title, Abstract, SubmissionDate, Status, PublicationType)
             VALUES (?, ?, CURDATE(), 'Under Review', 'Journal')`,
            [articleData.title, articleData.abstract]
        );

        await conn1.query(`XA END '${xid}'`);
        inst1_active = false;
        await conn1.query(`XA PREPARE '${xid}'`);
        phase1_inst1 = true;

        await conn2.query(`XA START '${xid}'`);
        inst2_active = true;

        await conn2.query(
            `INSERT INTO ArticleSubmissionLog (ArticleID, Action, XA_TxID)
             VALUES (?, 'SUBMITTED', ?)`,
            [result.insertId, xid]
        );

        await conn2.query(`XA END '${xid}'`);
        inst2_active = false;
        await conn2.query(`XA PREPARE '${xid}'`);
        phase1_inst2 = true;

        // --- Phase 2: Commit both ---
        await conn1.query(`XA COMMIT '${xid}'`);
        await conn2.query(`XA COMMIT '${xid}'`);

        console.log(`Distributed transaction ${xid} committed successfully.`);

    } catch (err) {
        console.error(`XA transaction ${xid} failed:`, err.message);

        // Must call XA END before ROLLBACK if still in ACTIVE state
        if (inst1_active) {
            try { await conn1.query(`XA END '${xid}'`); } catch (_) {}
        }
        if (inst2_active) {
            try { await conn2.query(`XA END '${xid}'`); } catch (_) {}
        }

        // Rollback whichever branches reached PREPARE
        if (phase1_inst1) {
            try { await conn1.query(`XA ROLLBACK '${xid}'`); } catch (_) {}
        }
        if (phase1_inst2) {
            try { await conn2.query(`XA ROLLBACK '${xid}'`); } catch (_) {}
        }

    } finally {
        await conn1.end();
        await conn2.end();
    }
}
```

---

## 10. Key Findings

1. **XA PREPARE is the durability boundary.** Once a branch reaches PREPARED state,
   the write survives a server crash. MySQL will re-present orphaned PREPARED branches
   via `XA RECOVER` after restart, allowing the TM to commit or rollback them.

2. **XA ROLLBACK from ACTIVE state throws XAER_RMFAIL.** The XA state machine
   requires `XA END` to be called before `XA ROLLBACK` whenever the branch is still
   in ACTIVE state. This must be handled explicitly in application error paths.

3. **XAER_NOTA does not indicate data corruption.** When MySQL auto-cleans an
   unresolved ACTIVE branch, the XID disappears. A subsequent `XA ROLLBACK` on an
   already-cleaned XID returns `XAER_NOTA`, but the underlying write was never
   committed and leaves 0 rows.

4. **`innodb_support_xa` was removed in MySQL 8.0.** XA is permanently enabled for
   InnoDB and cannot be disabled. Verification must use
   `information_schema.ENGINES`.

5. **Docker provides the simplest second-instance setup on Windows.** A single
   `docker run` command with `-p 3307:3306` produces a fully independent MySQL
   instance on a separate port, avoiding the complexity of managing a second
   `mysqld` process with a separate data directory.

6. **Atomicity was confirmed across both scenarios.** The happy path produced
   matching rows on both instances after commit. The failure path produced 0 rows
   on Instance 1 after rollback, even though Instance 1's branch had reached
   PREPARED state before the failure occurred on Instance 2.
