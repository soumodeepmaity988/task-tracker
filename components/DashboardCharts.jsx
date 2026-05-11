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

function HabitSparkline({ weeks, color }) {
  const W = 180, H = 56, PAD_T = 6, PAD_B = 14, PAD_L = 4, PAD_R = 4;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const max = 7; // daily habit can hit 7/week
  const n = weeks.length;
  const barW = innerW / n;
  const xAt = (i) => PAD_L + i * barW;
  const yAt = (v) => PAD_T + (1 - v / max) * innerH;

  // Line path connecting tops of bars
  const linePts = weeks.map((w, i) => `${xAt(i) + barW / 2},${yAt(w.count)}`);
  const linePath = 'M ' + linePts.join(' L ');

  // Area path under line for fill
  const areaPath = `M ${xAt(0) + barW / 2} ${yAt(0)} L ${linePts.join(' L ')} L ${xAt(n - 1) + barW / 2} ${yAt(0)} Z`;

  // x-axis tick labels at quarter points
  const ticks = [0, Math.floor(n / 3), Math.floor((n * 2) / 3), n - 1];

  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      {/* baseline */}
      <line x1={PAD_L} y1={yAt(0)} x2={W - PAD_R} y2={yAt(0)} stroke="var(--border)" />
      {/* bars */}
      {weeks.map((w, i) => {
        const h = innerH * (w.count / max);
        return (
          <rect
            key={i}
            x={xAt(i) + 1}
            y={yAt(w.count)}
            width={Math.max(2, barW - 2)}
            height={Math.max(1, h)}
            rx={2}
            fill={color}
            opacity={w.count === 0 ? 0.15 : 0.45}
          >
            <title>{w.label}: {w.count}/7</title>
          </rect>
        );
      })}
      {/* area + line on top */}
      <path d={areaPath} fill={color} opacity="0.18" />
      <path d={linePath} stroke={color} strokeWidth="1.75" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      {/* end-point dot */}
      <circle cx={xAt(n - 1) + barW / 2} cy={yAt(weeks[n - 1].count)} r="3" fill={color} />
      {/* tick labels */}
      {ticks.map(i => (
        <text key={i} x={xAt(i) + barW / 2} y={H - 2} fontSize="8" textAnchor="middle" fill="var(--text-muted)">
          {weeks[i].short}
        </text>
      ))}
    </svg>
  );
}

export function HabitConsistencyChart({ habits, weeks = 12 }) {
  const today = startOfDay(Date.now());
  const mondayThisWeek = useMemo(() => {
    const dow = new Date(today).getDay(); // 0 = Sun
    return today - ((dow + 6) % 7) * DAY_MS;
  }, [today]);

  const rows = useMemo(() => habits.map(h => {
    const set = new Set(h.completions || []);
    // weekly buckets
    const buckets = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const start = mondayThisWeek - i * 7 * DAY_MS;
      let count = 0;
      for (let d = 0; d < 7; d++) {
        const dayStart = start + d * DAY_MS;
        if (dayStart > today) break;
        if (set.has(dateKey(dayStart))) count++;
      }
      const wk = new Date(start);
      buckets.push({
        start,
        count,
        label: `Week of ${wk.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
        short: `${wk.getMonth() + 1}/${wk.getDate()}`,
      });
    }
    // 30-day rate
    let hits30 = 0;
    for (let i = 0; i < 30; i++) if (set.has(dateKey(today - i * DAY_MS))) hits30++;
    const rate30 = Math.round((hits30 / 30) * 100);

    // Trend (this week vs last week)
    const thisWk = buckets[buckets.length - 1]?.count ?? 0;
    const lastWk = buckets[buckets.length - 2]?.count ?? 0;
    const delta = thisWk - lastWk;

    return { ...h, streak: streakOf(h), rate30, buckets, delta };
  }), [habits, today, mondayThisWeek, weeks]);

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
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>last {weeks} weeks · {habits.length} habit{habits.length === 1 ? '' : 's'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {rows.map(h => (
          <div key={h.id} style={{ padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, minWidth: 0 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{h.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.name}>{h.name}</span>
              <span
                style={{ fontSize: 11, fontWeight: 700, color: h.streak > 0 ? 'var(--accent-orange)' : 'var(--text-muted)' }}
                title="Current streak"
              >
                {h.streak > 0 ? `🔥${h.streak}` : '—'}
              </span>
            </div>
            <HabitSparkline weeks={h.buckets} color={h.color} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: 'var(--text-muted)' }}>
              <span>30-day rate <strong style={{ color: h.color }}>{h.rate30}%</strong></span>
              <span style={{ color: h.delta > 0 ? 'var(--accent-green)' : h.delta < 0 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                {h.delta > 0 ? '▲' : h.delta < 0 ? '▼' : '—'} {Math.abs(h.delta)} vs last wk
              </span>
            </div>
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
