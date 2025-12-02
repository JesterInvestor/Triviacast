// Example Node.js leaderboard service (SQL on-demand) using `pg`
// Adapt DB pool config to your environment.

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Get leaderboard using SQL on-demand.
 * scope: 'alltime' | 'weekly'
 * limit: number (must be positive, defaults to 100)
 */
async function getLeaderboardSql(scope = 'alltime', limit = 100) {
  // Validate and sanitize limit
  const sanitizedLimit = Math.max(1, Math.min(Number(limit) || 100, 1000));

  // Build query with optional date filter for weekly scope
  const whereClause = scope === 'weekly' ? `WHERE created_at >= now() - interval '7 days'` : '';
  const query = `
    SELECT user_id, SUM(points) AS total
    FROM scores
    ${whereClause}
    GROUP BY user_id
    ORDER BY total DESC
    LIMIT $1
  `;

  const { rows } = await pool.query(query, [sanitizedLimit]);
  return rows.map(r => ({ user_id: r.user_id, total: Number(r.total) }));
}

/**
 * Record a score event (optional helper).
 * Keep the DB as the source-of-truth.
 */
async function addScoreEvent(userId, points, timestamp = new Date()) {
  await pool.query(
    `INSERT INTO scores (user_id, points, created_at) VALUES ($1, $2, $3)`,
    [userId, points, timestamp]
  );
}

module.exports = { getLeaderboardSql, addScoreEvent };
