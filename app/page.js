'use client';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { CheckCircle2, Zap, ListTodo, BookOpen, TrendingUp, Kanban, Calendar, Flame, Target } from 'lucide-react';
import Link from 'next/link';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import { OnTimeChart, GoalsChart, CompletionTrendChart, WeeklyReviewSummary, HabitConsistencyChart } from '@/components/DashboardCharts';
import { startOfDay, DAY_MS, fmtRelative } from '@/lib/dateUtils';
import { subjectProgress } from '@/lib/subject';

export default function DashboardPage() {
  const { boards, subjects, habits, goals, journal, loadingBoards, loadingSubjects } = useApp();

  // Active = not archived. Used for current-state UI (stats, today, boards list).
  // ALL boards/tasks (including archived) feed historical charts so deletes are
  // not the only way to remove data from history.
  const activeBoards = boards.filter(b => !b.archivedAt);
  const activeTasks = activeBoards.flatMap(b => b.tasks || []);
  const todo = activeTasks.filter(t => t.status === 'todo').length;
  const inProgress = activeTasks.filter(t => t.status === 'in-progress').length;
  const done = activeTasks.filter(t => t.status === 'done').length;
  const subjectStats = subjects.map(s => subjectProgress(s));
  const totalTopics = subjectStats.reduce((a, p) => a + p.topics.total, 0);
  const doneTopics = subjectStats.reduce((a, p) => a + p.topics.done, 0);

  const stats = [
    { icon: <ListTodo size={20} />, label: 'To Do', value: todo, color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)' },
    { icon: <Zap size={20} />, label: 'In Progress', value: inProgress, color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
    { icon: <CheckCircle2 size={20} />, label: 'Done', value: done, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    { icon: <Kanban size={20} />, label: 'Boards', value: activeBoards.length, color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)' },
    { icon: <BookOpen size={20} />, label: 'Subjects', value: subjects.length, color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)' },
    { icon: <TrendingUp size={20} />, label: 'Topics Done', value: `${doneTopics}/${totalTopics}`, color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  ];

  const recentTasks = [...activeTasks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
  const pColor = { low: 'tag-green', medium: 'tag-yellow', high: 'tag-orange', critical: 'tag-red' };
  const sLabel = { todo: 'To Do', 'in-progress': 'In Progress', done: 'Done' };

  const loading = loadingBoards || loadingSubjects;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-inner">
          <div className="page-header">
            <h1 className="page-title">👋 Welcome back!</h1>
            <p className="page-subtitle">Here's your workspace overview</p>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
          ) : (
            <>
              <div className="stats-grid">
                {stats.map((s, i) => (
                  <div key={i} className="stat-card">
                    <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                    <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
                <ActivityHeatmap boards={boards} habits={habits} />
              </div>

              {(() => {
                const today = startOfDay(Date.now());
                const todayTasks = activeBoards.flatMap(b =>
                  (b.tasks || [])
                    .filter(t => t.dueDate && startOfDay(t.dueDate) <= today && t.status !== 'done')
                    .map(t => ({ ...t, _board: b }))
                );
                if (todayTasks.length === 0) return null;
                return (
                  <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <h2 style={{ fontSize: 14, fontWeight: 700 }}>📅 Today & Overdue ({todayTasks.length})</h2>
                      <Link href="/today" className="btn btn-ghost btn-sm">View all</Link>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {todayTasks.slice(0, 5).map(t => (
                        <Link
                          key={t.id}
                          href={`/tasks/${t._board.id}/${t.id}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                            border: '1px solid var(--border)', borderRadius: 8, textDecoration: 'none', color: 'var(--text-primary)', fontSize: 13,
                          }}
                        >
                          <span style={{ flex: 1, fontWeight: 500 }}>{t.title}</span>
                          <span className={`tag ${pColor[t.priority]}`} style={{ fontSize: 10 }}>{t.priority}</span>
                          <span className="tag tag-gray" style={{ fontSize: 10 }}>{fmtRelative(t.dueDate)}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t._board.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Insight charts */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 20 }}>
                <OnTimeChart boards={boards} />
                <GoalsChart goals={goals} />
                <CompletionTrendChart boards={boards} />
              </div>

              <div style={{ marginBottom: 20 }}>
                <HabitConsistencyChart habits={habits} />
              </div>

              {/* Weekly review surfaced */}
              <div style={{ marginBottom: 20 }}>
                <WeeklyReviewSummary entries={journal} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Recent Tasks */}
                <div className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700 }}>Recent Tasks</h2>
                  </div>
                  {recentTasks.length === 0 && <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No tasks yet</h3></div>}
                  {recentTasks.map(task => (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <span className={`tag ${pColor[task.priority]}`}>{task.priority}</span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{task.title}</span>
                      <span className="tag tag-gray">{sLabel[task.status]}</span>
                    </div>
                  ))}
                </div>

                {/* Subjects Progress */}
                <div className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700 }}>Subjects Progress</h2>
                    <Link href="/subjects" className="btn btn-ghost btn-sm">View All</Link>
                  </div>
                  {subjects.length === 0 && <div className="empty-state"><div className="empty-state-icon">📚</div><h3>No subjects yet</h3></div>}
                  {subjects.map(s => {
                    const prog = subjectProgress(s);
                    const t = prog.topics.total;
                    const d = prog.topics.done;
                    const pct = prog.pct;
                    return (
                      <div key={s.id} style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span>{s.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{s.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d}/{t}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${pct}%`, background: s.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Boards Overview */}
              {activeBoards.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--text-secondary)' }}>Task Boards</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {activeBoards.map(b => {
                      const tasks = b.tasks || [];
                      const doneCount = tasks.filter(t => t.status === 'done').length;
                      return (
                        <Link key={b.id} href={`/tasks/${b.id}`} style={{ textDecoration: 'none' }}>
                          <div className="glass-card" style={{ padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                              <Kanban size={16} color="var(--accent-blue)" />
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{b.name}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tasks.length} tasks · {doneCount} done</div>
                            <div className="progress-bar" style={{ marginTop: 10 }}>
                              <div className="progress-fill" style={{ width: `${tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0}%`, background: 'var(--accent-blue)' }} />
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
