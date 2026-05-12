'use client';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { useMemo, useState, useEffect } from 'react';
import { startOfDay, dateKey, DAY_MS, fmtDateLong } from '@/lib/dateUtils';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const P_COLOR = { low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444' };
const STATUS_LABEL = { backlog: 'Backlog', todo: 'To Do', 'in-progress': 'In Progress', done: 'Done' };

function DayTasksModal({ dayTs, tasks, onClose }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <span className="modal-title">📅 {fmtDateLong(dayTs)} — {tasks.length} task{tasks.length === 1 ? '' : 's'}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tasks.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nothing due this day.</div>
          ) : tasks.map(t => (
            <Link
              key={t.id}
              href={`/tasks/${t._board.id}/${t.id}`}
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderLeft: `3px solid ${P_COLOR[t.priority] || '#4f8ef7'}`,
                borderRadius: 8,
                textDecoration: 'none', color: 'var(--text-primary)',
              }}
            >
              <span style={{
                flex: 1, fontSize: 13, fontWeight: 500,
                textDecoration: t.status === 'done' ? 'line-through' : 'none',
                opacity: t.status === 'done' ? 0.65 : 1,
              }}>{t.title}</span>
              <span className="tag tag-gray" style={{ fontSize: 10 }}>{STATUS_LABEL[t.status || 'todo']}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t._board.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { boards } = useApp();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });
  const [dayModal, setDayModal] = useState(null); // { ts, tasks }

  const tasksByDate = useMemo(() => {
    const map = {};
    boards.filter(b => !b.archivedAt).forEach(b => (b.tasks || []).forEach(t => {
      if (!t.dueDate) return;
      const key = dateKey(t.dueDate);
      (map[key] ||= []).push({ ...t, _board: b });
    }));
    return map;
  }, [boards]);

  // Build calendar grid: 6 rows × 7 cols starting from Sunday before month start
  const cells = useMemo(() => {
    const monthStart = new Date(cursor);
    const startDow = monthStart.getDay();
    const gridStart = startOfDay(cursor) - startDow * DAY_MS;
    const out = [];
    for (let i = 0; i < 42; i++) {
      const ts = gridStart + i * DAY_MS;
      const d = new Date(ts);
      out.push({
        ts,
        dom: d.getDate(),
        inMonth: d.getMonth() === monthStart.getMonth(),
        isToday: startOfDay(ts) === startOfDay(Date.now()),
        tasks: tasksByDate[dateKey(ts)] || [],
      });
    }
    return out;
  }, [cursor, tasksByDate]);

  const monthLabel = new Date(cursor).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const step = (delta) => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + delta);
    setCursor(d.getTime());
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h1 className="page-title">🗓 Calendar</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => step(-1)} title="Previous month"><ChevronLeft size={14} /></button>
              <div style={{ fontWeight: 700, fontSize: 14, minWidth: 160, textAlign: 'center' }}>{monthLabel}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => step(1)} title="Next month"><ChevronRight size={14} /></button>
              <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); setCursor(d.getTime()); }} style={{ fontSize: 12 }}>Today</button>
            </div>
          </div>

          <div className="cal-grid" style={{ marginBottom: 6 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d =>
              <div key={d} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', padding: 4 }}>{d}</div>
            )}
          </div>
          <div className="cal-grid">
            {cells.map((c, i) => {
              const hasOverflow = c.tasks.length > 3;
              const openDay = () => setDayModal({ ts: c.ts, tasks: c.tasks });
              return (
                <div
                  key={i}
                  className={`cal-cell${c.isToday ? ' is-today' : ''}${!c.inMonth ? ' is-other' : ''}`}
                  style={{ cursor: c.tasks.length > 0 ? 'pointer' : 'default' }}
                  onClick={(e) => {
                    // Only trigger if clicking the cell itself, not a child link
                    if (e.target === e.currentTarget && c.tasks.length > 0) openDay();
                  }}
                >
                  <div className="cal-day" onClick={(e) => { if (c.tasks.length > 0) { e.stopPropagation(); openDay(); } }} style={{ cursor: c.tasks.length > 0 ? 'pointer' : 'default' }}>
                    {c.dom}
                  </div>
                  {c.tasks.slice(0, 3).map(t => (
                    <Link
                      key={t.id}
                      href={`/tasks/${t._board.id}/${t.id}`}
                      className="cal-pill"
                      style={{
                        background: `${P_COLOR[t.priority] || '#4f8ef7'}22`,
                        color: P_COLOR[t.priority] || 'var(--text-secondary)',
                        textDecoration: 'none',
                      }}
                      title={`${t.title} — ${t._board.name}`}
                    >
                      {t.title}
                    </Link>
                  ))}
                  {hasOverflow && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openDay(); }}
                      style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        fontSize: 10, color: 'var(--accent-blue)', fontWeight: 600, textAlign: 'left',
                      }}
                    >
                      +{c.tasks.length - 3} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {dayModal && (
        <DayTasksModal
          dayTs={dayModal.ts}
          tasks={dayModal.tasks}
          onClose={() => setDayModal(null)}
        />
      )}
    </div>
  );
}
