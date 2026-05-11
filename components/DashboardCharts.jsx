'use client';
import { useMemo } from 'react';
import { DAY_MS, startOfDay, dateKey } from '@/lib/dateUtils';
import Link from 'next/link';

// ── On-time vs Delayed donut + counts ───────────────────────────
export function OnTimeChart({ boards }) {
  const stats = useMemo(() => {
    let onTime = 0, late = 0, noDate = 0;
    boards.forEach(b => (b.tasks || []).forEach(t => {
      if (t.status !== 'done') return;
      if (!t.dueDate) { noDate++; return; }
      if (!t.completedAt) { noDate++; return; }
      if (startOfDay(t.completedAt) <= startOfDay(t.dueDate)) onTime++;
      else late++;
    }));
    const tracked = onTime + late;
    const pct = tracked ? Math.round((onTime / tracked) * 100) : 0;
    return { onTime, late, noDate, tracked, pct };
  }, [boards]);

  const { onTime, late, tracked, pct, noDate } = stats;
  const r = 36, c = 2 * Math.PI * r;
  const onTimeStroke = c * (pct / 100);

  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>⏰ Delivery — on time vs late</h2>
      {tracked === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
          No tasks with both a due date and a completion yet.
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-glass)" strokeWidth="12" />
            <circle
              cx="50" cy="50" r={r} fill="none"
              stroke="var(--accent-green)" strokeWidth="12"
              strokeDasharray={`${onTimeStroke} ${c}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
            <text x="50" y="48" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--text-primary)">{pct}%</text>
            <text x="50" y="64" textAnchor="middle" fontSize="9" fill="var(--text-muted)">on time</text>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent-green)' }} />
              <strong style={{ minWidth: 24, textAlign: 'right' }}>{onTime}</strong> on time
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent-red)' }} />
              <strong style={{ minWidth: 24, textAlign: 'right' }}>{late}</strong> delayed
            </div>
            {noDate > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--bg-glass)', border: '1px solid var(--border)' }} />
                <strong style={{ minWidth: 24, textAlign: 'right' }}>{noDate}</strong> no due date
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Goals: created vs completed ────────────────────────────────
export function GoalsChart({ goals }) {
  const stats = useMemo(() => {
    const created = goals.length;
    const done = goals.filter(g => g.status === 'done').length;
    const active = goals.filter(g => g.status === 'active').length;
    const abandoned = goals.filter(g => g.status === 'abandoned').length;
    const pct = created ? Math.round((done / created) * 100) : 0;
    return { created, done, active, abandoned, pct };
  }, [goals]);

  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700 }}>🎯 Goals</h2>
        <Link href="/goals" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>View all</Link>
      </div>
      {stats.created === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
          No goals set yet. <Link href="/goals" style={{ color: 'var(--accent-blue)' }}>Create one</Link>.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
            <Stat label="Created" value={stats.created} color="var(--accent-blue)" />
            <Stat label="Completed" value={stats.done} color="var(--accent-green)" />
            <Stat label="Active" value={stats.active} color="var(--accent-yellow)" />
          </div>
          <div className="progress-bar" style={{ height: 8 }}>
            <div className="progress-fill" style={{ width: `${stats.pct}%`, background: 'var(--accent-green)' }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{stats.pct}% completion rate</div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );
}

// ── Weekly completion trend (improvement chart) ─────────────────
export function CompletionTrendChart({ boards, weeks = 8 }) {
  const data = useMemo(() => {
    const today = startOfDay(Date.now());
    const dow = new Date(today).getDay();
    const mondayThisWeek = today - ((dow + 6) % 7) * DAY_MS;
    const buckets = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const start = mondayThisWeek - i * 7 * DAY_MS;
      const end = start + 7 * DAY_MS;
      let done = 0;
      boards.forEach(b => (b.tasks || []).forEach(t => {
        if (t.status === 'done' && t.completedAt && t.completedAt >= start && t.completedAt < end) done++;
      }));
      buckets.push({ start, done });
    }
    return buckets;
  }, [boards, weeks]);

  const max = Math.max(1, ...data.map(d => d.done));
  const avg = data.reduce((s, d) => s + d.done, 0) / data.length;
  const lastWeek = data[data.length - 2]?.done ?? 0;
  const thisWeek = data[data.length - 1]?.done ?? 0;
  const delta = thisWeek - lastWeek;

  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700 }}>📈 Weekly completions ({weeks}w)</h2>
        <div style={{ fontSize: 11, display: 'flex', gap: 12, color: 'var(--text-muted)' }}>
          <span>avg <strong style={{ color: 'var(--text-primary)' }}>{avg.toFixed(1)}/wk</strong></span>
          <span style={{ color: delta >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} vs last week
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
        {data.map((d, i) => {
          const h = (d.done / max) * 100;
          const isThisWeek = i === data.length - 1;
          const wk = new Date(d.start);
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: d.done ? 'var(--text-secondary)' : 'transparent', fontWeight: 600 }}>{d.done || '0'}</span>
              <div
                style={{
                  width: '100%',
                  height: `${h}%`,
                  minHeight: 2,
                  background: isThisWeek ? 'var(--accent-blue)' : 'var(--accent-purple)',
                  borderRadius: 4,
                  opacity: d.done ? 1 : 0.25,
                }}
                title={`${d.done} tasks · week of ${wk.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
              />
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{wk.getMonth() + 1}/{wk.getDate()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Habit consistency card ─────────────────────────────────────
function streakOf(habit) {
  const set = new Set(habit.completions || []);
  let n = 0;
  let cursor = startOfDay(Date.now());
  if (!set.has(dateKey(cursor))) cursor -= DAY_MS;
  while (set.has(dateKey(cursor))) {
    n++;
    cursor -= DAY_MS;
  }
  return n;
}

export function HabitConsistencyChart({ habits }) {
  const today = startOfDay(Date.now());
  const last14 = useMemo(() => {
    const out = [];
    for (let i = 13; i >= 0; i--) out.push(today - i * DAY_MS);
    return out;
  }, [today]);

  const rows = useMemo(() => habits.map(h => {
    const set = new Set(h.completions || []);
    // 30-day consistency
    let hits30 = 0;
    for (let i = 0; i < 30; i++) if (set.has(dateKey(today - i * DAY_MS))) hits30++;
    const rate30 = Math.round((hits30 / 30) * 100);
    return {
      ...h,
      streak: streakOf(h),
      rate30,
      last14: last14.map(ts => set.has(dateKey(ts))),
    };
  }), [habits, today, last14]);

  if (habits.length === 0) {
    return (
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700 }}>🔥 Habit consistency</h2>
          <Link href="/habits" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>Open</Link>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
          No habits yet. <Link href="/habits" style={{ color: 'var(--accent-blue)' }}>Add one</Link> and start a streak.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700 }}>🔥 Habit consistency</h2>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>last 30 days · {habits.length} habit{habits.length === 1 ? '' : 's'}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(h => (
          <div key={h.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto auto', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{h.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
            </div>
            {/* 14-day strip */}
            <div style={{ display: 'flex', gap: 3 }}>
              {h.last14.map((done, i) => (
                <span
                  key={i}
                  title={done ? 'Completed' : 'Missed'}
                  style={{
                    width: 10, height: 16, borderRadius: 2,
                    background: done ? h.color : 'var(--bg-glass)',
                    border: `1px solid ${done ? h.color : 'var(--border)'}`,
                    opacity: done ? 1 : 0.6,
                  }}
                />
              ))}
            </div>
            <div style={{ minWidth: 80, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div className="progress-bar" style={{ height: 5 }}>
                <div className="progress-fill" style={{ width: `${h.rate30}%`, background: h.color }} />
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>{h.rate30}%</span>
            </div>
            <span
              style={{
                fontSize: 11, fontWeight: 700,
                minWidth: 38, textAlign: 'right',
                color: h.streak > 0 ? 'var(--accent-orange)' : 'var(--text-muted)',
              }}
              title="Current streak"
            >
              {h.streak > 0 ? `🔥${h.streak}` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Weekly review summary card ─────────────────────────────────
export function WeeklyReviewSummary({ entries }) {
  const sorted = useMemo(() => [...entries].sort((a, b) => b.weekOf.localeCompare(a.weekOf)), [entries]);
  const latest = sorted[0];
  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700 }}>📓 Weekly review</h2>
        <Link href="/review" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>Open</Link>
      </div>
      {!latest ? (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '10px 0' }}>
          No reviews yet. <Link href="/review" style={{ color: 'var(--accent-blue)' }}>Write your first one</Link>.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Week of {latest.weekOf}</div>
          {latest.nextWeek && (
            <Section icon="🎯" label="Focus next week" body={latest.nextWeek} accent="var(--accent-blue)" />
          )}
          {latest.didWell && (
            <Section icon="🌱" label="What went well" body={latest.didWell} accent="var(--accent-green)" />
          )}
          {latest.slipped && (
            <Section icon="🪨" label="What slipped" body={latest.slipped} accent="var(--accent-orange)" />
          )}
          {sorted.length > 1 && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
              + {sorted.length - 1} earlier {sorted.length - 1 === 1 ? 'entry' : 'entries'}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({ icon, label, body, accent }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {icon} {label}
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap' }}>
        {body.length > 220 ? body.slice(0, 220) + '…' : body}
      </p>
    </div>
  );
}
