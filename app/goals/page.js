'use client';
import { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { Plus, X, Pencil, Trash2, Target, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { msToDateInput, dateInputToMs, fmtRelative, isOverdue } from '@/lib/dateUtils';
import Link from 'next/link';

const COLORS = ['#4f8ef7', '#8b5cf6', '#2dd4bf', '#ec4899', '#f97316', '#22c55e', '#eab308', '#ef4444'];
const ICONS = ['🎯', '🚀', '💼', '📚', '💪', '✍️', '🧠', '🏆'];

function GoalModal({ initial, boards, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const base = {
      name: '',
      description: '',
      icon: '🎯',
      color: '#4f8ef7',
      linkedTaskIds: [],
      ...(initial || {}),
    };
    base.dueDate = initial?.dueDate ? msToDateInput(initial.dueDate) : '';
    return base;
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      dueDate: form.dueDate ? dateInputToMs(form.dueDate) : null,
    });
  };
  const toggleTask = (taskId) => {
    set('linkedTaskIds', form.linkedTaskIds.includes(taskId)
      ? form.linkedTaskIds.filter(id => id !== taskId)
      : [...form.linkedTaskIds, taskId]);
  };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <span className="modal-title">{initial?.id ? 'Edit Goal' : 'New Goal'}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Goal name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ship v1 of side project" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description (Markdown)</label>
              <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Why this matters, definition of done…" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Target date</label>
                <input className="form-input" type="date" value={form.dueDate || ''} onChange={e => set('dueDate', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Icon</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {ICONS.map(ic => (
                    <button key={ic} type="button" onClick={() => set('icon', ic)}
                      style={{ fontSize: 18, padding: 4, borderRadius: 6, cursor: 'pointer', background: form.icon === ic ? 'var(--bg-glass)' : 'none', border: form.icon === ic ? '2px solid var(--accent-blue)' : '2px solid transparent' }}
                    >{ic}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('color', c)}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid white' : '3px solid transparent', outline: form.color === c ? `2px solid ${c}` : 'none' }}
                  />
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Linked tasks ({form.linkedTaskIds.length})</label>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: 6 }}>
                {boards.map(b => (
                  <div key={b.id}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '6px 8px' }}>{b.name}</div>
                    {(b.tasks || []).map(t => (
                      <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer', borderRadius: 4 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <input type="checkbox" checked={form.linkedTaskIds.includes(t.id)} onChange={() => toggleTask(t.id)} />
                        {t.status === 'done' ? <CheckCircle2 size={12} color="var(--accent-green)" /> : <span style={{ width: 12 }} />}
                        <span style={{ flex: 1, textDecoration: t.status === 'done' ? 'line-through' : 'none', opacity: t.status === 'done' ? 0.7 : 1 }}>{t.title}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{initial?.id ? 'Save' : 'Create Goal'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const { goals, boards, createGoal, updateGoal, deleteGoal } = useApp();
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('active');

  const enriched = useMemo(() => {
    const taskMap = {};
    boards.forEach(b => (b.tasks || []).forEach(t => { taskMap[t.id] = { ...t, _board: b }; }));
    return goals.map(g => {
      const linked = (g.linkedTaskIds || []).map(id => taskMap[id]).filter(Boolean);
      const total = linked.length;
      const done = linked.filter(t => t.status === 'done').length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      return { ...g, _linked: linked, _done: done, _total: total, _pct: pct };
    });
  }, [goals, boards]);

  const visible = enriched.filter(g => filter === 'all' || g.status === filter);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div className="page-header" style={{ marginBottom: 0 }}>
              <h1 className="page-title"><Target size={20} style={{ display: 'inline', marginRight: 8 }} /> Goals</h1>
              <p className="page-subtitle">Long-lived parents; link tasks to them to track progress.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setModal({})}><Plus size={14} /> New Goal</button>
          </div>

          <div className="toolbar" style={{ marginBottom: 14 }}>
            <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
              <option value="active">Active</option>
              <option value="done">Done</option>
              <option value="abandoned">Abandoned</option>
              <option value="all">All</option>
            </select>
          </div>

          {visible.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <h3>No goals</h3>
              <p>{filter === 'active' ? 'Set a long-term goal and link tasks to it.' : 'Nothing in this filter.'}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {visible.map(g => (
                <div key={g.id} className="glass-card" style={{ padding: 16, borderLeft: `4px solid ${g.color}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{g.icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{g.name}</div>
                        {g.dueDate && (
                          <div style={{ fontSize: 11, color: isOverdue(g.dueDate) && g.status === 'active' ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                            📅 {fmtRelative(g.dueDate)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="task-card-action-btn" onClick={() => setModal(g)}><Pencil size={12} /></button>
                      <button className="task-card-action-btn" onClick={() => { if (confirm(`Delete "${g.name}"?`)) deleteGoal(g.id); }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {g.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>{g.description}</p>}
                  {g._total > 0 ? (
                    <>
                      <div className="progress-bar" style={{ height: 6 }}>
                        <div className="progress-fill" style={{ width: `${g._pct}%`, background: g.color }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{g._done}/{g._total} tasks done · {g._pct}%</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>No linked tasks yet</div>
                  )}
                  <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                    {g.status !== 'done' && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => updateGoal(g.id, { status: 'done' })}>
                        <CheckCircle2 size={12} /> Mark done
                      </button>
                    )}
                    {g.status === 'done' && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => updateGoal(g.id, { status: 'active' })}>
                        Reopen
                      </button>
                    )}
                    <Link href="/" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                      <LinkIcon size={11} /> {g._total}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      {modal && (
        <GoalModal
          initial={modal.id ? modal : null}
          boards={boards}
          onSave={async (form) => { if (modal.id) await updateGoal(modal.id, form); else await createGoal(form); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
