'use client';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { useMemo } from 'react';
import { startOfDay, DAY_MS, fmtDateLong, fmtRelative, fmtDuration } from '@/lib/dateUtils';
import { Calendar, AlertCircle, CheckCircle2, Flame } from 'lucide-react';

const P_COLOR = { low: 'tag-green', medium: 'tag-yellow', high: 'tag-orange', critical: 'tag-red' };
const STATUS_LABEL = { backlog: 'Backlog', todo: 'To Do', 'in-progress': 'In Progress', done: 'Done' };

function TaskRow({ t, board }) {
  return (
    <Link
      href={`/tasks/${board.id}/${t.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        textDecoration: 'none', color: 'var(--text-primary)',
      }}
    >
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{t.title}</span>
      <span className={`tag ${P_COLOR[t.priority]}`} style={{ fontSize: 10 }}>{t.priority}</span>
      <span className="tag tag-gray" style={{ fontSize: 10 }}>{STATUS_LABEL[t.status || 'todo']}</span>
      {t.timeEstimate ? <span className="tag tag-purple" style={{ fontSize: 10 }}>⏱ {fmtDuration(t.timeEstimate)}</span> : null}
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{board.name}</span>
    </Link>
  );
}

export default function TodayPage() {
  const { boards, habits, updateHabit } = useApp();
  const today = startOfDay(Date.now());
  const todayKey = new Date(today).toISOString().slice(0, 10);

  const grouped = useMemo(() => {
    const overdue = [];
    const dueToday = [];
    const thisWeek = [];
    const noDate = [];
    boards.filter(b => !b.archivedAt).forEach(b => {
      (b.tasks || []).forEach(t => {
        if ((t.status || 'todo') === 'done') return;
        const entry = { ...t, _board: b };
        if (!t.dueDate) { noDate.push(entry); return; }
        const dd = startOfDay(t.dueDate);
        if (dd < today) overdue.push(entry);
        else if (dd === today) dueToday.push(entry);
        else if (dd < today + 7 * DAY_MS) thisWeek.push(entry);
      });
    });
    return { overdue, dueToday, thisWeek, noDate };
  }, [boards, today]);

  const toggleHabit = (h) => {
    const completions = h.completions || [];
    const next = completions.includes(todayKey)
      ? completions.filter(d => d !== todayKey)
      : [...completions, todayKey];
    updateHabit(h.id, { completions: next });
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-inner" style={{ maxWidth: 900 }}>
          <div className="page-header">
            <h1 className="page-title">📅 Today</h1>
            <p className="page-subtitle">{fmtDateLong(today)}</p>
          </div>

          {habits.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)' }}>
                <Flame size={14} style={{ display: 'inline', marginRight: 6, color: 'var(--accent-orange)' }} />
                Habits
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {habits.map(h => {
                  const done = (h.completions || []).includes(todayKey);
                  return (
                    <button
                      key={h.id}
                      onClick={() => toggleHabit(h)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 12px',
                        background: done ? `${h.color}22` : 'var(--bg-card)',
                        border: `1px solid ${done ? h.color : 'var(--border)'}`,
                        borderRadius: 10, cursor: 'pointer',
                        color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{h.icon}</span>
                      <span style={{ flex: 1, textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.7 : 1 }}>{h.name}</span>
                      {done && <CheckCircle2 size={14} color={h.color} />}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {grouped.overdue.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--accent-red)' }}>
                <AlertCircle size={14} style={{ display: 'inline', marginRight: 6 }} />
                Overdue ({grouped.overdue.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {grouped.overdue.map(t => <TaskRow key={t.id} t={t} board={t._board} />)}
              </div>
            </section>
          )}

          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--accent-orange)' }}>
              <Calendar size={14} style={{ display: 'inline', marginRight: 6 }} />
              Due today ({grouped.dueToday.length})
            </h2>
            {grouped.dueToday.length === 0 ? (
              <div style={{ padding: 18, color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic', borderRadius: 10, border: '1px dashed var(--border)' }}>
                Nothing due today. Good day to chip at the backlog.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {grouped.dueToday.map(t => <TaskRow key={t.id} t={t} board={t._board} />)}
              </div>
            )}
          </section>

          {grouped.thisWeek.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--accent-blue)' }}>
                This week ({grouped.thisWeek.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {grouped.thisWeek.map(t => <TaskRow key={t.id} t={t} board={t._board} />)}
              </div>
            </section>
          )}

          {grouped.noDate.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--text-muted)' }}>
                No due date ({grouped.noDate.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {grouped.noDate.slice(0, 10).map(t => <TaskRow key={t.id} t={t} board={t._board} />)}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
