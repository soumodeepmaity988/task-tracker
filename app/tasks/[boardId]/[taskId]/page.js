'use client';
import { use, useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import Link from 'next/link';
import { ArrowLeft, Check, Pencil, Trash2, Video, FileText, X, Plus, Save, Play, ExternalLink, GripVertical, Timer } from 'lucide-react';
import Markdown from '@/components/Markdown';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { fmtDuration, fmtRelative, isOverdue, isToday } from '@/lib/dateUtils';
import { VideoIconButton, VideoThumbnailStrip, VideoPlayerModal } from '@/components/VideoPlayer';

const STATUS_CYCLE = { 'not-started': 'learning', 'learning': 'done', 'done': 'not-started' };
const STATUS_COLOR = { 'not-started': 'tag-gray', 'learning': 'tag-yellow', 'done': 'tag-green' };
const STATUS_LABEL = { 'not-started': 'Not Started', 'learning': 'Learning', 'done': 'Done' };
const TASK_STATUS_LABEL = { 'todo': 'To Do', 'in-progress': 'In Progress', 'done': 'Done' };
const TASK_STATUS_COLOR = { 'todo': 'tag-blue', 'in-progress': 'tag-yellow', 'done': 'tag-green' };
const PRIORITY_TAG = { low: 'tag-green', medium: 'tag-yellow', high: 'tag-orange', critical: 'tag-red' };

function SubtaskModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const base = initial || { title: '', notes: '', docUrl: '', priority: 'medium', status: 'not-started' };
    // Normalize videoUrls — fall back to legacy single videoUrl
    const urls = Array.isArray(base.videoUrls) && base.videoUrls.length > 0
      ? base.videoUrls
      : (base.videoUrl ? [base.videoUrl] : []);
    return { ...base, videoUrls: urls.length > 0 ? urls : [''] };
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const updateUrl = (i, v) => setForm(f => ({ ...f, videoUrls: f.videoUrls.map((u, idx) => idx === i ? v : u) }));
  const addUrl = () => setForm(f => ({ ...f, videoUrls: [...(f.videoUrls || []), ''] }));
  const removeUrl = (i) => setForm(f => ({ ...f, videoUrls: f.videoUrls.filter((_, idx) => idx !== i) }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const urls = (form.videoUrls || []).map(u => (u || '').trim()).filter(Boolean);
    onSave({ ...form, videoUrls: urls, videoUrl: urls[0] || '' });
  };

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
              <label className="form-label">🎬 Video URLs {form.videoUrls.length > 1 && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>({form.videoUrls.length})</span>}</label>
              {form.videoUrls.map((url, i) => (
                <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                  <input
                    className="form-input"
                    value={url}
                    onChange={e => updateUrl(i, e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    style={{ flex: 1 }}
                  />
                  {form.videoUrls.length > 1 && (
                    <button type="button" className="task-card-action-btn" onClick={() => removeUrl(i)} title="Remove">
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-ghost btn-sm" onClick={addUrl} style={{ fontSize: 11, padding: '4px 8px' }}>
                <Plus size={12} /> Add another video
              </button>
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
  const { boards, loadingBoards, updateBoard, fetchSubjects } = useApp();
  const board = useMemo(() => boards.find(b => b.id === boardId), [boards, boardId]);
  const task = useMemo(() => board?.tasks?.find(t => t.id === taskId), [board, taskId]);
  const loading = loadingBoards;
  const [subtaskModal, setSubtaskModal] = useState(null);
  const [videoModal, setVideoModal] = useState(null); // { urls, startUrl, title } | null
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const { session: pomoSession, start: startPomo, stop: stopPomo } = usePomodoro();
  const draggingSubtaskId = useMemo(() => ({ current: null }), []);
  const [dragOverSubtaskId, setDragOverSubtaskId] = useState(null);

  const reorderSubtasks = async (draggedId, targetId) => {
    if (!draggedId || draggedId === targetId) return;
    const list = [...(task.subtasks || [])];
    const fromIdx = list.findIndex(s => s.id === draggedId);
    const toIdx = list.findIndex(s => s.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    await saveTask({ ...task, subtasks: list });
  };

  const saveTask = async (updatedTask) => {
    const tasks = board.tasks.map(t => t.id === taskId ? updatedTask : t);
    await updateBoard(boardId, { tasks });
  };

  // Sync subtask edits back to the source subject's contents:
  // status, title, notes, video URLs, doc URL, priority — anything editable.
  const syncToSubject = async (updatedTask) => {
    if (!updatedTask.sourceRef) return;
    const contentPatches = {};
    (updatedTask.subtasks || []).forEach(st => {
      if (!st.sourceContentId) return;
      const urls = Array.isArray(st.videoUrls) && st.videoUrls.length > 0
        ? st.videoUrls
        : (st.videoUrl ? [st.videoUrl] : []);
      contentPatches[st.sourceContentId] = {
        status: st.status,
        title: st.title,
        notes: st.notes || '',
        docUrl: st.docUrl || '',
        priority: st.priority || 'medium',
        videoUrl: urls[0] || '',
        videoUrls: urls,
      };
    });
    if (Object.keys(contentPatches).length === 0) return;
    try {
      const res = await fetch('/api/tasks/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: updatedTask.sourceRef.subjectId,
          topicId: updatedTask.sourceRef.topicId,
          contentPatches,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('[syncToSubject] HTTP', res.status, text.slice(0, 300));
        return;
      }
      // DB updated — pull the fresh subjects into the AppContext so the
      // subject page and dashboard reflect the change without a hard refresh.
      if (typeof fetchSubjects === 'function') await fetchSubjects();
    } catch (e) {
      console.error('[syncToSubject] failed:', e);
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
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
                  <span className={`tag ${PRIORITY_TAG[task.priority]}`}>{task.priority}</span>
                  {task.dueDate && (
                    <span className={`tag ${isOverdue(task.dueDate) ? 'tag-red' : isToday(task.dueDate) ? 'tag-orange' : 'tag-blue'}`}>
                      📅 {fmtRelative(task.dueDate)}
                    </span>
                  )}
                  {task.recurring && <span className="tag tag-purple">🔁 {task.recurring}</span>}
                  {task.timeEstimate ? (
                    <span className="tag tag-gray">⏱ est {fmtDuration(task.timeEstimate)}</span>
                  ) : null}
                  {task.timeSpent ? (
                    <span className="tag tag-green">⌛ spent {fmtDuration(task.timeSpent)}</span>
                  ) : null}
                  {task.tags?.map(tag => <span key={tag} className="tag tag-blue">{tag}</span>)}
                  {task.sourceRef && (
                    <Link href={`/subjects/${task.sourceRef.subjectId}`} className="tag tag-purple" style={{ textDecoration: 'none' }}>
                      📚 From Subject
                    </Link>
                  )}
                  {pomoSession?.taskId === task.id ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => stopPomo(true)} style={{ fontSize: 11 }}>
                      <Timer size={12} /> Stop Pomodoro
                    </button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => startPomo(task, board)} style={{ fontSize: 11 }}>
                      <Timer size={12} /> 🍅 Start 25m focus
                    </button>
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
              ) : task.description ? (
                <Markdown>{task.description}</Markdown>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, fontStyle: 'italic' }}>
                  No description yet — click the pencil to add one.
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
                <div
                  key={st.id}
                  className="glass-card content-row"
                  style={{
                    padding: '12px 16px',
                    ...(dragOverSubtaskId === st.id ? { outline: '2px dashed var(--accent-blue)', outlineOffset: 2 } : {}),
                  }}
                  draggable
                  onDragStart={(e) => { draggingSubtaskId.current = st.id; e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverSubtaskId(st.id); }}
                  onDragLeave={() => setDragOverSubtaskId(null)}
                  onDrop={(e) => { e.preventDefault(); reorderSubtasks(draggingSubtaskId.current, st.id); draggingSubtaskId.current = null; setDragOverSubtaskId(null); }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <GripVertical size={12} style={{ color: 'var(--text-muted)', cursor: 'grab', flexShrink: 0 }} />
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 13, fontWeight: 500,
                          textDecoration: st.status === 'done' ? 'line-through' : 'none',
                          opacity: st.status === 'done' ? 0.6 : 1,
                        }}>{st.title}</span>
                        <span className={`tag ${PRIORITY_TAG[st.priority]}`} style={{ fontSize: 9, padding: '1px 6px' }}>{st.priority}</span>
                        <span className={`tag ${STATUS_COLOR[st.status]}`} style={{ fontSize: 9, padding: '1px 6px' }}>{STATUS_LABEL[st.status]}</span>
                      </div>
                      {st.notes && (
                        <div style={{ marginTop: 4 }}><Markdown compact>{st.notes}</Markdown></div>
                      )}
                    </div>

                    {/* Links & actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {(() => {
                        const urls = Array.isArray(st.videoUrls) && st.videoUrls.length > 0
                          ? st.videoUrls
                          : (st.videoUrl ? [st.videoUrl] : []);
                        return (
                          <VideoIconButton
                            urls={urls}
                            onPlay={() => setVideoModal({ urls, startUrl: urls[0], title: st.title })}
                          />
                        );
                      })()}
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

                  {/* Video preview(s) below the content. Single video → one thumbnail. Multiple → carousel. */}
                  {(() => {
                    const urls = Array.isArray(st.videoUrls) && st.videoUrls.length > 0
                      ? st.videoUrls
                      : (st.videoUrl ? [st.videoUrl] : []);
                    if (urls.length === 0) return null;
                    return (
                      <div style={{ paddingLeft: 32, marginTop: 4 }}>
                        <VideoThumbnailStrip
                          urls={urls}
                          onPick={(u) => setVideoModal({ urls, startUrl: u, title: st.title })}
                        />
                      </div>
                    );
                  })()}
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

      {videoModal && (
        <VideoPlayerModal
          urls={videoModal.urls}
          startUrl={videoModal.startUrl}
          title={videoModal.title}
          onClose={() => setVideoModal(null)}
        />
      )}
    </div>
  );
}
