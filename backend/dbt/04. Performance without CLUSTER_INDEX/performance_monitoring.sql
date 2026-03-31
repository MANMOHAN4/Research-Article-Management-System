-- ============================================================
-- PERFORMANCE MONITORING SYSTEM (FINAL - CLEAN VERSION)
-- ============================================================

SET GLOBAL event_scheduler = ON;

-- ============================================================
-- CLEANUP (IMPORTANT - avoids all previous errors)
-- ============================================================

DROP VIEW IF EXISTS v_performance_dashboard;
DROP VIEW IF EXISTS v_top_slow_queries;

DROP EVENT IF EXISTS evt_aggregate_hourly_metrics;
DROP EVENT IF EXISTS evt_health_score;

DROP PROCEDURE IF EXISTS log_query_performance;
DROP PROCEDURE IF EXISTS aggregate_hourly_metrics;
DROP PROCEDURE IF EXISTS calculate_health_score;

DROP TABLE IF EXISTS PerformanceQueryLog;
DROP TABLE IF EXISTS PerformanceSlowQueries;
DROP TABLE IF EXISTS PerformanceAlerts;
DROP TABLE IF EXISTS PerformanceHealthSnapshots;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE PerformanceQueryLog (
    QueryID INT AUTO_INCREMENT PRIMARY KEY,
    QueryText TEXT,
    QueryType VARCHAR(20),
    TableName VARCHAR(255),
    ExecutionTimeMs FLOAT,
    RowsAffected INT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE PerformanceSlowQueries (
    SlowQueryID INT AUTO_INCREMENT PRIMARY KEY,
    QueryText TEXT,
    TableName VARCHAR(255),
    ExecutionTimeMs FLOAT,
    OccurrenceCount INT DEFAULT 1,
    LastSeenAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    IsOptimized BOOLEAN DEFAULT FALSE,
    UNIQUE KEY unique_query (QueryText(255), TableName)
);

CREATE TABLE PerformanceAlerts (
    AlertID INT AUTO_INCREMENT PRIMARY KEY,
    AlertType VARCHAR(50),
    Severity VARCHAR(50),
    AlertMessage TEXT,
    MetricValue FLOAT,
    ThresholdValue FLOAT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    IsResolved BOOLEAN DEFAULT FALSE
);

CREATE TABLE PerformanceHealthSnapshots (
    SnapshotID INT AUTO_INCREMENT PRIMARY KEY,
    HealthScore FLOAT,
    RecordedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

DELIMITER $$

CREATE PROCEDURE log_query_performance(
    IN p_query TEXT,
    IN p_type VARCHAR(20),
    IN p_table VARCHAR(255),
    IN p_time FLOAT,
    IN p_rows INT,
    IN p_index TEXT
)
BEGIN
    -- Log all queries
    INSERT INTO PerformanceQueryLog 
    (QueryText, QueryType, TableName, ExecutionTimeMs, RowsAffected)
    VALUES (p_query, p_type, p_table, p_time, p_rows);

    -- Handle slow queries
    IF p_time > 1000 THEN
        INSERT INTO PerformanceSlowQueries 
        (QueryText, TableName, ExecutionTimeMs)
        VALUES (p_query, p_table, p_time)
        ON DUPLICATE KEY UPDATE
            OccurrenceCount = OccurrenceCount + 1,
            LastSeenAt = CURRENT_TIMESTAMP,
            ExecutionTimeMs = GREATEST(ExecutionTimeMs, p_time);
    END IF;
END$$

CREATE PROCEDURE aggregate_hourly_metrics()
BEGIN
    INSERT INTO PerformanceHealthSnapshots (HealthScore)
    SELECT 
        100 - IFNULL(AVG(ExecutionTimeMs), 0)
    FROM PerformanceQueryLog
    WHERE CreatedAt > DATE_SUB(NOW(), INTERVAL 1 HOUR);
END$$

CREATE PROCEDURE calculate_health_score()
BEGIN
    INSERT INTO PerformanceHealthSnapshots (HealthScore)
    SELECT 
        100 - IFNULL(AVG(ExecutionTimeMs), 0)
    FROM PerformanceQueryLog;
END$$

DELIMITER ;

-- ============================================================
-- EVENTS
-- ============================================================

CREATE EVENT evt_aggregate_hourly_metrics
ON SCHEDULE EVERY 1 HOUR
DO CALL aggregate_hourly_metrics();

CREATE EVENT evt_health_score
ON SCHEDULE EVERY 1 HOUR
DO CALL calculate_health_score();

-- ============================================================
-- VIEWS (FOR DASHBOARD)
-- ============================================================

CREATE VIEW v_performance_dashboard AS
SELECT 
    COUNT(*) AS TotalQueries,
    ROUND(AVG(ExecutionTimeMs), 2) AS AvgTimeMs,
    SUM(CASE WHEN ExecutionTimeMs > 1000 THEN 1 ELSE 0 END) AS SlowQueries,
    (
        SELECT HealthScore 
        FROM PerformanceHealthSnapshots 
        ORDER BY RecordedAt DESC 
        LIMIT 1
    ) AS HealthScore
FROM PerformanceQueryLog
WHERE CreatedAt > DATE_SUB(NOW(), INTERVAL 1 HOUR);

CREATE VIEW v_top_slow_queries AS
SELECT 
    QueryText,
    TableName,
    ExecutionTimeMs,
    OccurrenceCount,
    LastSeenAt
FROM PerformanceSlowQueries
ORDER BY ExecutionTimeMs DESC
LIMIT 20;

-- ============================================================
-- DONE
-- ============================================================

SELECT 'Performance Monitoring System Installed Successfully!';