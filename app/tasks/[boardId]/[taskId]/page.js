'use client';
import { use, useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import Link from 'next/link';
import { ArrowLeft, Check, Pencil, Trash2, Video, FileText, X, Plus, Save } from 'lucide-react';

const STATUS_CYCLE = { 'not-started': 'learning', 'learning': 'done', 'done': 'not-started' };
const STATUS_COLOR = { 'not-started': 'tag-gray', 'learning': 'tag-yellow', 'done': 'tag-green' };
const STATUS_LABEL = { 'not-started': 'Not Started', 'learning': 'Learning', 'done': 'Done' };
const TASK_STATUS_LABEL = { 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done' };
const TASK_STATUS_COLOR = { 'todo': 'tag-blue', 'in-progress': 'tag-yellow', 'done': 'tag-green' };
const PRIORITY_TAG = { low: 'tag-green', medium: 'tag-yellow', high: 'tag-orange', critical: 'tag-red' };

function SubtaskModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    title: '', notes: '', videoUrl: '', docUrl: '', priority: 'medium', status: 'not-started'
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => { e.preventDefault(); if (!form.title.trim()) return; onSave(form); };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <span className="modal-title">{initial?.id ? 'Edit Subtask' : 'Add Subtask'}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Subtask title" autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="not-started">Not Started</option>
                  <option value="learning">Learning</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">🎬 Video URL</label>
              <input className="form-input" value={form.videoUrl} onChange={e => set('videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div className="form-group">
              <label className="form-label">📄 Doc / Question URL</label>
              <input className="form-input" value={form.docUrl} onChange={e => set('docUrl', e.target.value)} placeholder="https://leetcode.com/problems/..." />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Key takeaways, approach, complexity..." style={{ minHeight: 80 }} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{initial?.id ? 'Save' : 'Add Subtask'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TaskDetailPage({ params }) {
  const { boardId, taskId } = use(params);
  const { updateBoard, fetchBoards } = useApp();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subtaskModal, setSubtaskModal] = useState(null);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');

  const fetchBoard = async () => {
    const res = await fetch(`/api/boards/${boardId}`);
    if (res.ok) setBoard(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchBoard(); }, [boardId]);

  const task = board?.tasks?.find(t => t.id === taskId);

  const saveTask = async (updatedTask) => {
    const tasks = board.tasks.map(t => t.id === taskId ? updatedTask : t);
    const updated = { ...board, tasks };
    setBoard(updated);
    await fetch(`/api/boards/${boardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks }),
    });
    updateBoard(boardId, { tasks });
  };

  // Sync subtask statuses back to subjects.json
  const syncToSubject = async (updatedTask) => {
    if (!updatedTask.sourceRef) return;
    const contentStatuses = {};
    (updatedTask.subtasks || []).forEach(st => {
      if (st.sourceContentId) {
        contentStatuses[st.sourceContentId] = st.status;
      }
    });
    if (Object.keys(contentStatuses).length > 0) {
      await fetch('/api/tasks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: updatedTask.sourceRef.subjectId,
          topicId: updatedTask.sourceRef.topicId,
          contentStatuses,
        }),
      });
    }
  };

  const handleCycleSubtaskStatus = async (subtaskId) => {
    const updatedTask = {
      ...task,
      subtasks: task.subtasks.map(st =>
        st.id === subtaskId ? { ...st, status: STATUS_CYCLE[st.status] } : st
      ),
    };
    await saveTask(updatedTask);
    await syncToSubject(updatedTask);
  };

  const handleSaveSubtask = async (form) => {
    let updatedTask;
    if (subtaskModal.initial?.id) {
      updatedTask = {
        ...task,
        subtasks: task.subtasks.map(st => st.id === subtaskModal.initial.id ? { ...st, ...form } : st),
      };
    } else {
      updatedTask = {
        ...task,
        subtasks: [...(task.subtasks || []), { ...form, id: `st-${Date.now()}`, createdAt: Date.now() }],
      };
    }
    await saveTask(updatedTask);
    await syncToSubject(updatedTask);
    setSubtaskModal(null);
  };

  const handleDeleteSubtask = async (subtaskId) => {
    const updatedTask = {
      ...task,
      subtasks: task.subtasks.filter(st => st.id !== subtaskId),
    };
    await saveTask(updatedTask);
  };

  const handleChangeTaskStatus = async (newStatus) => {
    const updatedTask = { ...task, status: newStatus };
    // If marking task as done, also mark all subtasks as done
    if (newStatus === 'done') {
      updatedTask.subtasks = (updatedTask.subtasks || []).map(st => ({ ...st, status: 'done' }));
    }
    await saveTask(updatedTask);
    await syncToSubject(updatedTask);
  };

  const handleSaveDescription = async () => {
    const updatedTask = { ...task, description: descValue };
    await saveTask(updatedTask);
    setEditingDesc(false);
  };

  if (loading) return (
    <div className="app-layout"><Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </main>
    </div>
  );

  if (!task) return (
    <div className="app-layout"><Sidebar />
      <main className="main-content">
        <div className="page-inner">
          <div className="empty-state">
            <div className="empty-state-icon">❓</div>
            <h3>Task not found</h3>
            <Link href={`/tasks/${boardId}`} className="btn btn-primary" style={{ marginTop: 16 }}>← Back to Board</Link>
          </div>
        </div>
      </main>
    </div>
  );

  const subtasks = task.subtasks || [];
  const doneCount = subtasks.filter(st => st.status === 'done').length;
  const totalCount = subtasks.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-inner" style={{ maxWidth: 800 }}>
          {/* Back link */}
          <Link href={`/tasks/${boardId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 16 }}>
            <ArrowLeft size={13} /> Back to {board.name}
          </Link>

          {/* Task Header */}
          <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{task.title}</h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span className={`tag ${PRIORITY_TAG[task.priority]}`}>{task.priority}</span>
                  {task.tags?.map(tag => <span key={tag} className="tag tag-blue">{tag}</span>)}
                  {task.sourceRef && (
                    <Link href={`/subjects/${task.sourceRef.subjectId}`} className="tag tag-purple" style={{ textDecoration: 'none' }}>
                      📚 From Subject
                    </Link>
                  )}
                </div>
              </div>

              {/* Status dropdown */}
              <select
                className="form-select"
                value={task.status}
                onChange={e => handleChangeTaskStatus(e.target.value)}
                style={{
                  width: 'auto', minWidth: 140, fontWeight: 600,
                  background: task.status === 'done' ? 'rgba(34,197,94,0.15)' : task.status === 'in-progress' ? 'rgba(234,179,8,0.15)' : 'rgba(79,142,247,0.15)',
                  color: task.status === 'done' ? '#22c55e' : task.status === 'in-progress' ? '#eab308' : '#4f8ef7',
                  border: 'none',
                }}
              >
                <option value="todo">📋 To Do</option>
                <option value="in-progress">⚡ In Progress</option>
                <option value="done">✅ Done</option>
              </select>
            </div>

            {/* Description */}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Description</span>
                {!editingDesc && (
                  <button className="task-card-action-btn" onClick={() => { setEditingDesc(true); setDescValue(task.description || ''); }}>
                    <Pencil size={10} />
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div>
                  <textarea className="form-textarea" value={descValue} onChange={e => setDescValue(e.target.value)} placeholder="Add a description..." style={{ minHeight: 60, marginBottom: 8 }} autoFocus />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary btn-sm" onClick={handleSaveDescription}><Save size={12} /> Save</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingDesc(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: task.description ? 'var(--text-secondary)' : 'var(--text-muted)', lineHeight: 1.6, fontStyle: task.description ? 'normal' : 'italic' }}>
                  {task.description || 'No description yet — click the pencil to add one.'}
                </p>
              )}
            </div>

            {/* Progress */}
            {totalCount > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                  <span>{doneCount}/{totalCount} subtasks done</span>
                  <span style={{ fontWeight: 600 }}>{pct}%</span>
                </div>
                <div className="progress-bar" style={{ height: 6 }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--accent-green)' }} />
                </div>
              </div>
            )}
          </div>

          {/* Subtasks */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>Subtasks ({totalCount})</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setSubtaskModal({ initial: null })}>
              <Plus size={13} /> Add Subtask
            </button>
          </div>

          {totalCount === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <h3>No subtasks yet</h3>
              <p>Add subtasks to break down this task into smaller items</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {subtasks.map(st => (
                <div key={st.id} className="glass-card content-row" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Status circle */}
                  <button
                    className={`topic-check ${st.status}`}
                    onClick={() => handleCycleSubtaskStatus(st.id)}
                    title="Click to cycle status"
                    style={{ flexShrink: 0 }}
                  >
                    {st.status === 'done' && <Check size={10} color="white" />}
                    {st.status === 'learning' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'white', display: 'block' }} />}
                  </button>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 500,
                        textDecoration: st.status === 'done' ? 'line-through' : 'none',
                        opacity: st.status === 'done' ? 0.6 : 1,
                      }}>{st.title}</span>
                      <span className={`tag ${PRIORITY_TAG[st.priority]}`} style={{ fontSize: 9, padding: '1px 6px' }}>{st.priority}</span>
                      <span className={`tag ${STATUS_COLOR[st.status]}`} style={{ fontSize: 9, padding: '1px 6px' }}>{STATUS_LABEL[st.status]}</span>
                    </div>
                    {st.notes && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.5 }}>{st.notes}</p>
                    )}
                  </div>

                  {/* Links & actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {st.videoUrl && (
                      <a href={st.videoUrl} target="_blank" rel="noopener noreferrer" title="Watch Video"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: 'rgba(255,68,68,0.12)', color: '#ff4444', textDecoration: 'none' }}>
                        <Video size={14} />
                      </a>
                    )}
                    {st.docUrl && (
                      <a href={st.docUrl} target="_blank" rel="noopener noreferrer" title="Open Doc"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: 'rgba(79,142,247,0.12)', color: '#4f8ef7', textDecoration: 'none' }}>
                        <FileText size={14} />
                      </a>
                    )}
                    <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />
                    <button className="task-card-action-btn" onClick={() => setSubtaskModal({ initial: st })} title="Edit"><Pencil size={12} /></button>
                    <button className="task-card-action-btn" onClick={() => handleDeleteSubtask(st.id)} title="Delete"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {subtaskModal && (
        <SubtaskModal
          initial={subtaskModal.initial}
          onSave={handleSaveSubtask}
          onClose={() => setSubtaskModal(null)}
        />
      )}
    </div>
  );
}
