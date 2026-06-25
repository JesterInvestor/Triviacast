-- Migration: create a simple scores table and useful indexes (Postgres)
-- Run with your usual migration tool (psql, knex, flyway, etc.)

CREATE TABLE IF NOT EXISTS scores (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes to speed up aggregations and date filtering
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores(created_at);

-- Optional: materialized view for all-time leaderboard (refresh periodically)
-- Use: REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_alltime_matview;
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_alltime_matview AS
SELECT user_id, SUM(points) AS total
FROM scores
GROUP BY user_id
ORDER BY total DESC;

-- Index for matview to speed lookups
CREATE INDEX IF NOT EXISTS idx_leaderboard_alltime_total ON leaderboard_alltime_matview (total DESC);
