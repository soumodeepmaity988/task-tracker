'use client';
import { useMemo } from 'react';
import { startOfDay, DAY_MS, dateKey } from '@/lib/dateUtils';

// Last 26 weeks of activity
export default function ActivityHeatmap({ boards, habits }) {
  const cells = useMemo(() => {
    const today = startOfDay(Date.now());
    const dow = new Date(today).getDay();
    const lastSat = today - ((dow + 1) % 7) * DAY_MS; // align grid end at Saturday
    const start = lastSat - 26 * 7 * DAY_MS + DAY_MS;

    const counts = {};
    boards.forEach(b => (b.tasks || []).forEach(t => {
      if (t.status === 'done' && t.completedAt) {
        const k = dateKey(t.completedAt);
        counts[k] = (counts[k] || 0) + 1;
      }
    }));
    habits.forEach(h => (h.completions || []).forEach(k => {
      counts[k] = (counts[k] || 0) + 1;
    }));

    const out = [];
    for (let i = 0; i < 26 * 7 + 7; i++) {
      const ts = start + i * DAY_MS;
      if (ts > today) break;
      const k = dateKey(ts);
      const v = counts[k] || 0;
      let level = 0;
      if (v >= 1) level = 1;
      if (v >= 3) level = 2;
      if (v >= 5) level = 3;
      if (v >= 8) level = 4;
      out.push({ ts, k, v, level });
    }
    return out;
  }, [boards, habits]);

  const totalDone = cells.reduce((s, c) => s + c.v, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700 }}>🔥 Activity (last 26 weeks)</h2>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{totalDone} completions</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div className="heatmap-grid">
          {cells.map(c => (
            <div
              key={c.k}
              className={`heatmap-cell${c.level ? ' l' + c.level : ''}`}
              title={`${c.k} — ${c.v} completion${c.v === 1 ? '' : 's'}`}
            />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
        Less
        <div className="heatmap-cell" />
        <div className="heatmap-cell l1" />
        <div className="heatmap-cell l2" />
        <div className="heatmap-cell l3" />
        <div className="heatmap-cell l4" />
        More
      </div>
    </div>
  );
}
