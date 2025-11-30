-- Baseline migration to ensure `quiz_results` exists and add composite index.
-- This migration is intentionally idempotent (uses IF NOT EXISTS) so it can be applied safely.

CREATE TABLE IF NOT EXISTS quiz_results (
  id TEXT PRIMARY KEY,
  wallet TEXT NOT NULL,
  points INTEGER,
  quiz_id TEXT,
  score INTEGER,
  details JSONB,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_created_at ON quiz_results (wallet, created_at);
