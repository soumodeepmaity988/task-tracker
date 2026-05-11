'use client';
import { useState, useMemo, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { Plus, X, Pencil, Trash2, Target, CheckCircle2, Link as LinkIcon, Circle, Loader, ArrowRight, RotateCcw } from 'lucide-react';
import { msToDateInput, dateInputToMs, fmtRelative, isOverdue, fmtDateLong } from '@/lib/dateUtils';
import Link from 'next/link';
import Markdown from '@/components/Markdown';

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

const STATUS_LABEL = { backlog: 'Backlog', todo: 'To Do', 'in-progress': 'In Progress', done: 'Done' };
const STATUS_COLOR = { backlog: '#8b5cf6', todo: '#4f8ef7', 'in-progress': '#eab308', done: '#22c55e' };
const P_COLOR = { low: 'tag-green', medium: 'tag-yellow', high: 'tag-orange', critical: 'tag-red' };

function GoalDetailModal({ goal, linked, onClose, onEdit, onDelete, onToggleDone, onUnlink }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const grouped = useMemo(() => {
    const out = { backlog: [], todo: [], 'in-progress': [], done: [] };
    linked.forEach(t => { (out[t.status || 'todo'] ||= []).push(t); });
    return out;
  }, [linked]);
  const done = linked.filter(t => t.status === 'done').length;
  const total = linked.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 700, width: '92%' }}>
        <div className="modal-header" style={{ borderLeft: `4px solid ${goal.color}`, paddingLeft: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 26 }}>{goal.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="modal-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.name}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                <span className={`tag ${goal.status === 'done' ? 'tag-green' : goal.status === 'abandoned' ? 'tag-gray' : 'tag-blue'}`} style={{ fontSize: 10 }}>{goal.status}</span>
                {goal.dueDate && (
                  <span style={{ color: isOverdue(goal.dueDate) && goal.status === 'active' ? 'var(--accent-red)' : undefined }}>
                    📅 {fmtRelative(goal.dueDate)} · {fmtDateLong(goal.dueDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {goal.description ? (
            <div style={{ marginBottom: 18 }}><Markdown>{goal.description}</Markdown></div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 18 }}>No description.</p>
          )}

          {/* Progress */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Progress</span>
              <span style={{ fontSize: 12, color: pct === 100 ? 'var(--accent-green)' : 'var(--text-secondary)', fontWeight: 700 }}>
                {done}/{total} tasks · {pct}%
              </span>
            </div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: goal.color }} />
            </div>
            {total > 0 && (
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                {Object.entries(grouped).map(([status, list]) => list.length > 0 && (
                  <span key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[status] }} />
                    {STATUS_LABEL[status]}: <strong style={{ color: 'var(--text-secondary)' }}>{list.length}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Linked tasks */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Linked tasks ({total})</div>
            {total === 0 ? (
              <div style={{ padding: 18, borderRadius: 10, border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic', textAlign: 'center' }}>
                No tasks linked yet. Click <strong>Edit</strong> below to add tasks.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['in-progress', 'todo', 'backlog', 'done'].flatMap(status =>
                  grouped[status].map(t => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderLeft: `3px solid ${STATUS_COLOR[status]}`,
                        borderRadius: 8,
                      }}
                    >
                      {status === 'done'
                        ? <CheckCircle2 size={14} color="var(--accent-green)" />
                        : status === 'in-progress'
                          ? <Loader size={14} color="var(--accent-yellow)" />
                          : <Circle size={14} color={STATUS_COLOR[status]} />}
                      <Link
                        href={`/tasks/${t._board.id}/${t.id}`}
                        onClick={onClose}
                        style={{
                          flex: 1, fontSize: 13, fontWeight: 500,
                          color: 'var(--text-primary)',
                          textDecoration: status === 'done' ? 'line-through' : 'none',
                          opacity: status === 'done' ? 0.6 : 1,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {t.title}
                      </Link>
                      {t.priority && <span className={`tag ${P_COLOR[t.priority]}`} style={{ fontSize: 10 }}>{t.priority}</span>}
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                        {t._board.name}
                      </span>
                      <button
                        className="task-card-action-btn"
                        title="Unlink from goal"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUnlink(t.id); }}
                      >
                        <X size={11} />
                      </button>
                      <Link
                        href={`/tasks/${t._board.id}/${t.id}`}
                        onClick={onClose}
                        title="Open task"
                        style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', textDecoration: 'none' }}
                      >
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn btn-ghost" onClick={onDelete} style={{ color: 'var(--accent-red)' }}>
            <Trash2 size={13} /> Delete
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {goal.status === 'done' ? (
              <button className="btn btn-ghost" onClick={onToggleDone}>
                <RotateCcw size={13} /> Reopen
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={onToggleDone}>
                <CheckCircle2 size={13} /> Mark done
              </button>
            )}
            <button className="btn btn-primary" onClick={onEdit}>
              <Pencil size={13} /> Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const { goals, boards, createGoal, updateGoal, deleteGoal } = useApp();
  const [modal, setModal] = useState(null);
  const [detailId, setDetailId] = useState(null);
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
                <div
                  key={g.id}
                  className="glass-card"
                  style={{ padding: 16, borderLeft: `4px solid ${g.color}`, cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}
                  onClick={() => setDetailId(g.id)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{g.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                        {g.dueDate && (
                          <div style={{ fontSize: 11, color: isOverdue(g.dueDate) && g.status === 'active' ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                            📅 {fmtRelative(g.dueDate)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button className="task-card-action-btn" title="Edit" onClick={() => setModal(g)}><Pencil size={12} /></button>
                      <button className="task-card-action-btn" title="Delete" onClick={() => { if (confirm(`Delete "${g.name}"?`)) deleteGoal(g.id); }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {g.description && (
                    <div style={{ marginBottom: 10, maxHeight: 60, overflow: 'hidden', maskImage: 'linear-gradient(180deg, #000 60%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, #000 60%, transparent 100%)' }}>
                      <Markdown compact>{g.description}</Markdown>
                    </div>
                  )}
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
                  <div style={{ marginTop: 10, display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
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
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setDetailId(g.id)} title="View linked tasks">
                      <LinkIcon size={11} /> {g._total} task{g._total === 1 ? '' : 's'}
                    </button>
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
      {detailId && (() => {
        const g = enriched.find(x => x.id === detailId);
        if (!g) return null;
        return (
          <GoalDetailModal
            goal={g}
            linked={g._linked}
            onClose={() => setDetailId(null)}
            onEdit={() => { setModal(g); setDetailId(null); }}
            onDelete={() => {
              if (confirm(`Delete "${g.name}"?`)) { deleteGoal(g.id); setDetailId(null); }
            }}
            onToggleDone={() => updateGoal(g.id, { status: g.status === 'done' ? 'active' : 'done' })}
            onUnlink={(taskId) => updateGoal(g.id, { linkedTaskIds: (g.linkedTaskIds || []).filter(id => id !== taskId) })}
          />
        );
      })()}
    </div>
  );
}
