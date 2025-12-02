// Express router for leaderboards
// Mount this router in your app e.g., app.use('/api/leaderboard', require('./routes/leaderboard'));

const express = require('express');
const router = express.Router();
const { getLeaderboardSql } = require('../services/leaderboard_service');

// GET /api/leaderboard?scope=weekly|alltime&limit=100
router.get('/', async (req, res) => {
  const scope = req.query.scope === 'weekly' ? 'weekly' : 'alltime';
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);

  try {
    const data = await getLeaderboardSql(scope, limit);
    res.json({ scope, data });
  } catch (err) {
    console.error('Failed to fetch leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
