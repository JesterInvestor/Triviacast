-- Migration: add composite index on wallet + created_at for quiz_results
-- Generated manually to avoid destructive reset on existing DB

CREATE INDEX IF NOT EXISTS idx_wallet_created_at ON quiz_results (wallet, created_at);
