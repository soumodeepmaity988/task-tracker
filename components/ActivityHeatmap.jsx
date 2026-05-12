'use client';
import { useMemo, useState, useRef } from 'react';
import { startOfDay, DAY_MS, dateKey, fmtDateLong } from '@/lib/dateUtils';

// Last 26 weeks of activity
export default function ActivityHeatmap({ boards, habits }) {
  const [hover, setHover] = useState(null); // { x, y, cell }
  const containerRef = useRef(null);

  const cells = useMemo(() => {
    const today = startOfDay(Date.now());
    const dow = new Date(today).getDay();
    const lastSat = today - ((dow + 1) % 7) * DAY_MS;
    const start = lastSat - 26 * 7 * DAY_MS + DAY_MS;

    // Per-day details: { [dateKey]: { tasks: [...], habits: [...] } }
    const details = {};
    const pushTask = (k, t, b) => {
      (details[k] ||= { tasks: [], habits: [] }).tasks.push({
        title: t.title,
        board: b.name,
        boardId: b.id,
        id: t.id,
      });
    };
    const pushHabit = (k, h) => {
      (details[k] ||= { tasks: [], habits: [] }).habits.push({
        name: h.name,
        icon: h.icon,
        color: h.color,
      });
    };

    boards.forEach(b => (b.tasks || []).forEach(t => {
      if (t.status === 'done' && t.completedAt) pushTask(dateKey(t.completedAt), t, b);
    }));
    habits.forEach(h => (h.completions || []).forEach(k => pushHabit(k, h)));

    const out = [];
    for (let i = 0; i < 26 * 7 + 7; i++) {
      const ts = start + i * DAY_MS;
      if (ts > today) break;
      const k = dateKey(ts);
      const d = details[k] || { tasks: [], habits: [] };
      const v = d.tasks.length + d.habits.length;
      let level = 0;
      if (v >= 1) level = 1;
      if (v >= 3) level = 2;
      if (v >= 5) level = 3;
      if (v >= 8) level = 4;
      out.push({ ts, k, v, level, details: d });
    }
    return out;
  }, [boards, habits]);

  const totalDone = cells.reduce((s, c) => s + c.v, 0);

  const onEnter = (e, cell) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setHover({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
      cell,
    });
  };
  const onLeave = () => setHover(null);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
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
              onMouseEnter={(e) => onEnter(e, c)}
              onMouseLeave={onLeave}
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

      {/* Tooltip */}
      {hover && (
        <div
          style={{
            position: 'absolute',
            left: hover.x,
            top: hover.y - 8,
            transform: 'translate(-50%, -100%)',
            zIndex: 100,
            pointerEvents: 'none',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-hover)',
            borderRadius: 8,
            padding: '8px 10px',
            boxShadow: 'var(--shadow)',
            minWidth: 180,
            maxWidth: 280,
            fontSize: 12,
            animation: 'fadeIn 0.1s ease',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            {fmtDateLong(hover.cell.ts)}
          </div>
          {hover.cell.v === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 11 }}>No activity</div>
          ) : (
            <>
              {hover.cell.details.tasks.length > 0 && (
                <div style={{ marginBottom: hover.cell.details.habits.length ? 6 : 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent-green)', marginBottom: 3 }}>
                    ✓ Tasks ({hover.cell.details.tasks.length})
                  </div>
                  {hover.cell.details.tasks.slice(0, 6).map((t, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${t.title} — ${t.board}`}>
                      • {t.title}
                      <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>· {t.board}</span>
                    </div>
                  ))}
                  {hover.cell.details.tasks.length > 6 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>+ {hover.cell.details.tasks.length - 6} more</div>
                  )}
                </div>
              )}
              {hover.cell.details.habits.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent-orange)', marginBottom: 3 }}>
                    🔥 Habits ({hover.cell.details.habits.length})
                  </div>
                  {hover.cell.details.habits.slice(0, 6).map((h, i) => (
                    <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>{h.icon}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                    </div>
                  ))}
                  {hover.cell.details.habits.length > 6 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>+ {hover.cell.details.habits.length - 6} more</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
