import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __triviacast_pg_pool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

function getPool() {
  if (global.__triviacast_pg_pool) return global.__triviacast_pg_pool;
  const pool = new Pool({ connectionString });
  global.__triviacast_pg_pool = pool;
  return pool;
}

export async function query(text: string, params?: any[]) {
  const pool = getPool();
  return pool.query(text, params);
}

export async function closePool() {
  if (global.__triviacast_pg_pool) {
    await global.__triviacast_pg_pool.end();
    global.__triviacast_pg_pool = undefined;
  }
}
