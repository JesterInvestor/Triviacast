import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Leaderboard() {
  const [scope, setScope] = useState(() => localStorage.getItem('leaderboardScope') || 'alltime');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('leaderboardScope', scope);
    let cancelled = false;
    async function fetchBoard() {
      setLoading(true);
      try {
        const r = await axios.get(`/api/leaderboard?scope=${scope}&limit=50`);
        if (!cancelled) setRows(r.data.data || r.data || []);
      } catch (err) {
        console.error('Leaderboard fetch error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchBoard();
    return () => { cancelled = true; };
  }, [scope]);

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setScope('alltime')} disabled={scope === 'alltime'}>All time</button>
        <button onClick={() => setScope('weekly')} disabled={scope === 'weekly'} style={{ marginLeft: 8 }}>Weekly</button>
      </div>

      {loading ? <div>Loading…</div> : (
        <ol>
          {rows.map((r, i) => (
            <li key={r.user_id}>
              #{i + 1} User {r.user_id} — {r.total} pts
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
