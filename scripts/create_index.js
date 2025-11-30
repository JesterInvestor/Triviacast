#!/usr/bin/env node
import { Client } from 'pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is not set.');
    process.exit(1);
  }
  // Try connecting with TLS verification disabled first via client option.
  // If that fails due to certificate issues, retry after setting
  // NODE_TLS_REJECT_UNAUTHORIZED=0 as a fallback (not recommended for prod).
  let client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to database (ssl.rejectUnauthorized=false).');
  } catch (err) {
    console.warn('Initial connection failed:', err && err.code ? err.code : err.message || err);
    if (err && err.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      console.warn('Retrying with NODE_TLS_REJECT_UNAUTHORIZED=0 (insecure)...');
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
      try {
        await client.connect();
        console.log('Connected to database after disabling TLS verification.');
      } catch (err2) {
        console.error('Retry failed:', err2);
        process.exitCode = 1;
        await client.end().catch(() => {});
        return;
      }
    } else {
      console.error('Failed to connect to DB:', err);
      process.exitCode = 1;
      return;
    }
  }

  try {
    console.log('Creating table quiz_results if not exists...');
    await client.query(
      `CREATE TABLE IF NOT EXISTS quiz_results (
        id TEXT PRIMARY KEY,
        wallet TEXT NOT NULL,
        import { Client } from 'pg';
        import fs from 'fs';

        async function main() {
          const connectionString = process.env.DATABASE_URL;
          if (!connectionString) {
            console.error('ERROR: DATABASE_URL environment variable is not set.');
            process.exit(1);
          }

          // SSL configuration:
          // - If PGSSLMODE=disable is set, SSL will be disabled (NOT recommended for prod).
          // - If PG_SSL_CA is set, its value (PEM content) will be passed as the CA to verify server.
          // - Otherwise, Node/pg will use default TLS verification (recommended).
          let sslOption;
          if ((process.env.PGSSLMODE || '').toLowerCase() === 'disable') {
            sslOption = false;
            console.warn('PGSSLMODE=disable set: connecting without SSL (insecure).');
          } else if (process.env.PG_SSL_CA) {
            // PG_SSL_CA may contain raw PEM content or a path to a file.
            const maybePath = process.env.PG_SSL_CA;
            let ca;
            try {
              // If the env var points to an existing file, read it.
              if (fs.existsSync(maybePath)) ca = fs.readFileSync(maybePath, 'utf8');
              else ca = maybePath; // assume it's raw PEM content
            } catch (e) {
              console.error('Failed to read PG_SSL_CA file:', e);
              process.exit(1);
            }
            sslOption = { ca };
            console.log('Using PG_SSL_CA for TLS verification.');
          } else {
            sslOption = undefined; // use default behavior (strict verification)
            console.log('Using default SSL verification for connection.');
          }

          const client = new Client({ connectionString, ssl: sslOption });

          try {
            await client.connect();
            console.log('Connected to database.');

            console.log('Creating table quiz_results if not exists...');
            await client.query(`
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
            `);

            console.log('Creating index if not exists...');
            await client.query(`CREATE INDEX IF NOT EXISTS idx_wallet_created_at ON quiz_results (wallet, created_at);`);
            console.log('Table and index created (or already existed).');
          } catch (err) {
            console.error('Failed to create table/index:', err);
            process.exitCode = 1;
          } finally {
            await client.end();
          }
        }

        main();
