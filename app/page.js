'use client';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { CheckCircle2, Zap, ListTodo, BookOpen, TrendingUp, Kanban } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { boards, subjects, loadingBoards, loadingSubjects } = useApp();

  const allTasks = boards.flatMap(b => b.tasks || []);
  const todo = allTasks.filter(t => t.status === 'todo').length;
  const inProgress = allTasks.filter(t => t.status === 'in-progress').length;
  const done = allTasks.filter(t => t.status === 'done').length;
  const totalTopics = subjects.reduce((a, s) => a + (s.topics?.length || 0), 0);
  const doneTopics = subjects.reduce((a, s) => a + (s.topics?.filter(t => t.status === 'done').length || 0), 0);

  const stats = [
    { icon: <ListTodo size={20} />, label: 'To Do', value: todo, color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)' },
    { icon: <Zap size={20} />, label: 'In Progress', value: inProgress, color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
    { icon: <CheckCircle2 size={20} />, label: 'Done', value: done, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    { icon: <Kanban size={20} />, label: 'Boards', value: boards.length, color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)' },
    { icon: <BookOpen size={20} />, label: 'Subjects', value: subjects.length, color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)' },
    { icon: <TrendingUp size={20} />, label: 'Topics Done', value: `${doneTopics}/${totalTopics}`, color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  ];

  const recentTasks = [...allTasks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6);
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
                    const t = s.topics?.length || 0;
                    const d = s.topics?.filter(x => x.status === 'done').length || 0;
                    const pct = t ? Math.round((d / t) * 100) : 0;
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
              {boards.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--text-secondary)' }}>Task Boards</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {boards.map(b => {
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
