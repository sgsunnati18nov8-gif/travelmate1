-- ═══════════════════════════════════════════════════════════════════
--  TravelMate — Database Schema (schema.sql)
-- ═══════════════════════════════════════════════════════════════════
--  SQLite schema for the optional Flask backend.
--  Creates the fare_logs table for anonymized lookup history.
--
--  PRIVACY NOTICE:
--    This table stores ONLY anonymized aggregate data.
--    No IP addresses, user identifiers, session tokens, or
--    precise GPS coordinates are recorded.
-- ═══════════════════════════════════════════════════════════════════

-- Anonymized fare lookup logs
CREATE TABLE IF NOT EXISTS fare_logs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    city           TEXT    NOT NULL DEFAULT 'unknown',
    vehicle        TEXT    NOT NULL DEFAULT 'unknown',
    distance_km    REAL    NOT NULL DEFAULT 0.00,
    fare_estimate  REAL    NOT NULL DEFAULT 0.00,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Index for analytics queries by city
CREATE INDEX IF NOT EXISTS idx_fare_logs_city ON fare_logs (city);

-- Index for time-range analytics
CREATE INDEX IF NOT EXISTS idx_fare_logs_created ON fare_logs (created_at);
