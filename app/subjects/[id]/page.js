'use client';
import { use, useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, X, Check, Trash2, ArrowLeft, Pencil, Video, FileText, ExternalLink, ChevronDown, ChevronRight, Kanban, Send } from 'lucide-react';
import { VideoIconButton, VideoThumbnailStrip, VideoPlayerModal } from '@/components/VideoPlayer';

const STATUS_CYCLE = { 'not-started': 'learning', 'learning': 'done', 'done': 'not-started' };
const STATUS_COLOR = { 'not-started': 'tag-gray', 'learning': 'tag-yellow', 'done': 'tag-green' };
const STATUS_LABEL = { 'not-started': 'Not Started', 'learning': 'Learning', 'done': 'Done' };
const PRIORITY_COLOR = { low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444' };
const PRIORITY_TAG = { low: 'tag-green', medium: 'tag-yellow', high: 'tag-orange', critical: 'tag-red' };

// ── Move To Board Modal ──────────────────────────────────────
function MoveToBoardModal({ kind, sourceTitle, sourceCount, boards, onClose, onConfirm }) {
  const activeBoards = boards.filter(b => !b.archivedAt);
  const NEW_OPT = '__new__';
  const [target, setTarget] = useState(activeBoards[0]?.id || NEW_OPT);
  const [newBoardName, setNewBoardName] = useState('');

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const canSubmit = target === NEW_OPT ? newBoardName.trim().length > 0 : !!target;
  const submit = () => {
    if (!canSubmit) return;
    if (target === NEW_OPT) onConfirm({ newBoardName: newBoardName.trim() });
    else onConfirm({ targetBoardId: target });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">📥 Move {kind === 'topic' ? 'topic' : 'item'} to a board</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Moving: <strong>{sourceTitle}</strong>
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            {kind === 'topic' ? (
              <>Creates a new task on the target board with <strong>{sourceCount}</strong> subtask{sourceCount === 1 ? '' : 's'} (one per content). Marking subtasks done syncs status back here.</>
            ) : (
              <>Creates a new task on the target board. The video/doc links stay accessible as a subtask, and status syncs back here.</>
            )}
          </p>

          <div className="form-group">
            <label className="form-label">Target board</label>
            <select className="form-select" value={target} onChange={e => setTarget(e.target.value)} autoFocus>
              {activeBoards.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
              <option value={NEW_OPT}>+ Create new board…</option>
            </select>
          </div>

          {target === NEW_OPT && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">New board name</label>
              <input
                className="form-input"
                value={newBoardName}
                onChange={e => setNewBoardName(e.target.value)}
                placeholder="e.g. Focused Sprint, DSA Practice…"
                autoFocus
              />
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={!canSubmit}>
            <Send size={13} /> Move
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Modal ──────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !loading && onCancel()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          {!loading && <button className="btn btn-ghost btn-icon btn-sm" onClick={onCancel}><X size={16} /></button>}
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
          {loading && (
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12, color: 'var(--accent-blue)' }}>
              <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Converting subject to tasks...</span>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={loading}>
            {loading ? 'Converting...' : 'Yes, Convert'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Topic Modal ───────────────────────────────────────────────
function TopicModal({ initial, onSave, onClose }) {
  const [title, setTitle] = useState(initial?.title || '');
  const submit = (e) => { e.preventDefault(); if (!title.trim()) return; onSave({ title: title.trim() }); };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{initial ? 'Edit Topic' : 'New Topic'}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Topic Title *</label>
              <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Arrays, Linked Lists, Binary Trees" autoFocus />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{initial ? 'Save' : 'Add Topic'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Content Modal ─────────────────────────────────────────────
function ContentModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const base = initial || { title: '', notes: '', docUrl: '', priority: 'medium', status: 'not-started' };
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
          <span className="modal-title">{initial?.id ? 'Edit Content' : 'Add Content'}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Kadane's Algorithm" autoFocus />
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
              <label className="form-label">
                🎬 Video URLs
                {form.videoUrls.length > 1 && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>({form.videoUrls.length})</span>
                )}
              </label>
              {form.videoUrls.map((url, i) => (
                <div key={i} style={{ position: 'relative', display: 'flex', gap: 4, marginBottom: 5 }}>
                  <Video size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#ff4444', pointerEvents: 'none' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 32, flex: 1 }}
                    value={url}
                    onChange={e => updateUrl(i, e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
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
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                YouTube, Loom, or any video link. The 🎬 icon shows once; clicking it plays the video (or shows a small carousel if there are multiple).
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">📄 Doc / Question URL</label>
              <div style={{ position: 'relative' }}>
                <FileText size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#4f8ef7' }} />
                <input className="form-input" style={{ paddingLeft: 32 }} value={form.docUrl} onChange={e => set('docUrl', e.target.value)} placeholder="https://leetcode.com/problems/..." />
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>LeetCode, Docs, Articles — will show a blue 📄 icon</span>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Key takeaways, approach, complexity, etc." style={{ minHeight: 80 }} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{initial?.id ? 'Save Changes' : 'Add Content'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Content Row ───────────────────────────────────────────────
function ContentItem({ content, onEdit, onDelete, onCycleStatus, onMoveToBoard, onPlayVideo }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px 10px 40px',
      borderBottom: '1px solid rgba(255,255,255,0.03)',
      transition: 'background 0.15s',
    }}
      className="content-row"
    >
      {/* Status circle */}
      <button
        className={`topic-check ${content.status}`}
        onClick={() => onCycleStatus(content.id)}
        title="Click to cycle status"
        style={{ flexShrink: 0 }}
      >
        {content.status === 'done' && <Check size={10} color="white" />}
        {content.status === 'learning' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'white', display: 'block' }} />}
      </button>

      {/* Title + notes */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 13, fontWeight: 500,
            textDecoration: content.status === 'done' ? 'line-through' : 'none',
            opacity: content.status === 'done' ? 0.6 : 1,
          }}>{content.title}</span>
          <span className={`tag ${PRIORITY_TAG[content.priority]}`} style={{ fontSize: 9, padding: '1px 6px' }}>{content.priority}</span>
        </div>
        {content.notes && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {content.notes}
          </p>
        )}
      </div>

      {/* Link icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {(() => {
          const urls = Array.isArray(content.videoUrls) && content.videoUrls.length > 0
            ? content.videoUrls
            : (content.videoUrl ? [content.videoUrl] : []);
          return (
            <VideoIconButton
              urls={urls}
              onPlay={() => onPlayVideo?.(urls, urls[0], content.title)}
            />
          );
        })()}
        {content.docUrl && (
          <a href={content.docUrl} target="_blank" rel="noopener noreferrer"
            title="Open Document/Question"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 6,
              background: 'rgba(79,142,247,0.12)', color: '#4f8ef7',
              textDecoration: 'none', transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(79,142,247,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(79,142,247,0.12)'}
          >
            <FileText size={14} />
          </a>
        )}

        <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />
        <button className="task-card-action-btn" onClick={() => onMoveToBoard?.()} title="Move to a board (creates a task)"><Send size={12} /></button>
        <button className="task-card-action-btn" onClick={() => onEdit(content)} title="Edit"><Pencil size={12} /></button>
        <button className="task-card-action-btn" onClick={() => onDelete(content.id)} title="Delete"><Trash2 size={12} /></button>
      </div>
    </div>
  );
}

export default function SubjectDetailPage({ params }) {
  const { id } = use(params);
  const { subjects, boards, loadingSubjects, updateSubject, createBoard, updateBoard, fetchBoards } = useApp();
  const router = useRouter();
  const subject = useMemo(() => subjects.find(s => s.id === id), [subjects, id]);
  const loading = loadingSubjects;
  const [converting, setConverting] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [moveModal, setMoveModal] = useState(null); // { kind, topicId, contentId? }
  const [videoModal, setVideoModal] = useState(null); // { urls, startUrl, title } | null

  const [topicModal, setTopicModal] = useState(null); // null | { mode: 'add' | 'edit', initial? }
  const [contentModal, setContentModal] = useState(null); // null | { topicId, initial? }
  const [collapsedTopics, setCollapsedTopics] = useState({});

  const saveSubject = (patch) => updateSubject(id, patch);

  // --- Topic CRUD ---
  const handleAddTopic = (form) => {
    const topics = [...(subject.topics || []), { ...form, id: `tp-${Date.now()}`, contents: [] }];
    saveSubject({ topics });
    setTopicModal(null);
  };

  const handleEditTopic = (form) => {
    const topics = subject.topics.map(t => t.id === topicModal.initial.id ? { ...t, ...form } : t);
    saveSubject({ topics });
    setTopicModal(null);
  };

  const handleDeleteTopic = (topicId) => {
    if (!confirm('Delete this topic and all its contents?')) return;
    saveSubject({ topics: subject.topics.filter(t => t.id !== topicId) });
  };

  // --- Content CRUD ---
  const handleSaveContent = (form) => {
    const topics = subject.topics.map(t => {
      if (t.id !== contentModal.topicId) return t;
      let contents = t.contents || [];
      if (contentModal.initial?.id) {
        contents = contents.map(c => c.id === contentModal.initial.id ? { ...c, ...form } : c);
      } else {
        contents = [...contents, { ...form, id: `c-${Date.now()}`, createdAt: Date.now() }];
      }
      return { ...t, contents };
    });
    saveSubject({ topics });
    setContentModal(null);
  };

  const handleDeleteContent = (topicId, contentId) => {
    const topics = subject.topics.map(t => {
      if (t.id !== topicId) return t;
      return { ...t, contents: (t.contents || []).filter(c => c.id !== contentId) };
    });
    saveSubject({ topics });
  };

  const handleCycleContentStatus = (topicId, contentId) => {
    const topics = subject.topics.map(t => {
      if (t.id !== topicId) return t;
      return { ...t, contents: (t.contents || []).map(c => c.id === contentId ? { ...c, status: STATUS_CYCLE[c.status] } : c) };
    });
    saveSubject({ topics });
  };

  const toggleCollapse = (topicId) => {
    setCollapsedTopics(prev => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  // --- Move Topic or Content to a board (creates a task with subtasks) ---
  const handleMoveToBoard = async ({ targetBoardId, newBoardName }) => {
    if (!subject || !moveModal) return;
    const { kind, topicId, contentId } = moveModal;
    const topic = (subject.topics || []).find(t => t.id === topicId);
    if (!topic) { setMoveModal(null); return; }

    // Resolve target board (create if needed)
    let board;
    if (newBoardName) {
      board = await createBoard(newBoardName);
    } else {
      board = boards.find(b => b.id === targetBoardId);
    }
    if (!board) { setMoveModal(null); return; }

    const now = Date.now();
    const rand = () => Math.random().toString(36).slice(2, 7);
    let newTask;

    if (kind === 'topic') {
      newTask = {
        id: `t-${now}-${rand()}`,
        title: topic.title,
        description: '',
        priority: 'medium',
        status: 'todo',
        tags: [subject.name],
        sprintId: null,
        createdAt: now,
        completedAt: null,
        sourceRef: { subjectId: subject.id, topicId: topic.id },
        subtasks: (topic.contents || []).map((c, i) => {
          const urls = Array.isArray(c.videoUrls) && c.videoUrls.length > 0
            ? c.videoUrls
            : (c.videoUrl ? [c.videoUrl] : []);
          return {
            id: `st-${now}-${i}-${rand()}`,
            title: c.title,
            notes: c.notes || '',
            videoUrl: urls[0] || '',
            videoUrls: urls,
            docUrl: c.docUrl || '',
            priority: c.priority || 'medium',
            status: c.status || 'not-started',
            sourceContentId: c.id,
            createdAt: now,
          };
        }),
      };
    } else {
      const content = (topic.contents || []).find(c => c.id === contentId);
      if (!content) { setMoveModal(null); return; }
      newTask = {
        id: `t-${now}-${rand()}`,
        title: content.title,
        description: content.notes || '',
        priority: content.priority || 'medium',
        status: content.status === 'done' ? 'done' : 'todo',
        tags: [subject.name, topic.title],
        sprintId: null,
        createdAt: now,
        completedAt: content.status === 'done' ? now : null,
        sourceRef: { subjectId: subject.id, topicId: topic.id },
        subtasks: [(() => {
          const urls = Array.isArray(content.videoUrls) && content.videoUrls.length > 0
            ? content.videoUrls
            : (content.videoUrl ? [content.videoUrl] : []);
          return {
            id: `st-${now}-${rand()}`,
            title: content.title,
            notes: content.notes || '',
            videoUrl: urls[0] || '',
            videoUrls: urls,
            docUrl: content.docUrl || '',
            priority: content.priority || 'medium',
            status: content.status || 'not-started',
            sourceContentId: content.id,
            createdAt: now,
          };
        })()],
      };
    }

    const tasks = [...(board.tasks || []), newTask];
    await updateBoard(board.id, { tasks });
    setMoveModal(null);
  };

  // --- Move to Tasks ---
  const handleConvertToTasks = async () => {
    if (!subject) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/subjects/${subject.id}/convert`, { method: 'POST' });
      const data = await res.json();
      
      if (res.ok && data.id) {
        await fetchBoards();
        // Force a slightly longer delay to show progress and then hard redirect
        setTimeout(() => {
          window.location.href = `/tasks/${data.id}`;
        }, 800);
      } else {
        alert(`Failed to convert: ${data.error || 'Unknown error'}`);
        setConverting(false);
        setShowConvertModal(false);
      }
    } catch (e) {
      console.error('Conversion error:', e);
      alert('An error occurred while converting the subject to tasks.');
      setConverting(false);
      setShowConvertModal(false);
    }
  };

  // --- Compute topic-level status from its contents ---
  const getTopicStatus = (topic) => {
    const contents = topic.contents || [];
    if (contents.length === 0) return 'not-started';
    const allDone = contents.every(c => c.status === 'done');
    const anyStarted = contents.some(c => c.status !== 'not-started');
    if (allDone) return 'done';
    if (anyStarted) return 'learning';
    return 'not-started';
  };

  if (loading) return (
    <div className="app-layout"><Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </main>
    </div>
  );

  if (!subject) return (
    <div className="app-layout"><Sidebar />
      <main className="main-content">
        <div className="page-inner">
          <div className="empty-state">
            <div className="empty-state-icon">❓</div>
            <h3>Subject not found</h3>
            <Link href="/subjects" className="btn btn-primary" style={{ marginTop: 16 }}>← Back</Link>
          </div>
        </div>
      </main>
    </div>
  );

  const topics = subject.topics || [];
  const allContents = topics.flatMap(t => t.contents || []);
  const totalContents = allContents.length;
  const doneContents = allContents.filter(c => c.status === 'done').length;
  const learningContents = allContents.filter(c => c.status === 'learning').length;
  const pct = totalContents ? Math.round((doneContents / totalContents) * 100) : 0;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-inner">
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <Link href="/subjects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 12 }}>
              <ArrowLeft size={13} /> Back to Subjects
            </Link>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `${subject.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                  {subject.icon}
                </div>
                <div>
                  <h1 className="page-title">{subject.name}</h1>
                  <p className="page-subtitle">{subject.description || 'No description'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setShowConvertModal(true)}>
                  <Kanban size={14} /> Move to Tasks
                </button>
                <button className="btn btn-primary" onClick={() => setTopicModal({ mode: 'add' })}><Plus size={15} /> Add Topic</button>
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 28 }}>
            <div style={{ display: 'flex', gap: 32, marginBottom: 14 }}>
              {[
                { label: 'Topics', val: topics.length, color: subject.color },
                { label: 'Contents', val: totalContents, color: 'var(--text-primary)' },
                { label: 'Done', val: doneContents, color: '#22c55e' },
                { label: 'Learning', val: learningContents, color: '#eab308' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="progress-bar" style={{ height: 8 }}>
              <div className="progress-fill" style={{ width: `${pct}%`, background: subject.color }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{pct}% complete</div>
          </div>

          {/* Topics & Nested Contents */}
          {topics.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <h3>No topics yet</h3>
              <p>Create topics like "Arrays", "Linked Lists", then add content items inside each.</p>
              <br />
              <button className="btn btn-primary" onClick={() => setTopicModal({ mode: 'add' })}><Plus size={14} /> Add First Topic</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {topics.map(topic => {
                const tContents = topic.contents || [];
                const tDone = tContents.filter(c => c.status === 'done').length;
                const tTotal = tContents.length;
                const tPct = tTotal ? Math.round((tDone / tTotal) * 100) : 0;
                const topicStatus = getTopicStatus(topic);
                const isCollapsed = collapsedTopics[topic.id];

                return (
                  <div key={topic.id} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Topic Header */}
                    <div
                      style={{
                        padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'rgba(255,255,255,0.02)', borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleCollapse(topic.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {isCollapsed ? <ChevronRight size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{topic.title}</h3>
                        <span className={`tag ${STATUS_COLOR[topicStatus]}`} style={{ fontSize: 9 }}>{STATUS_LABEL[topicStatus]}</span>
                        {tTotal > 0 && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tDone}/{tTotal}</span>
                        )}
                        {tTotal > 0 && (
                          <div className="progress-bar" style={{ width: 50, height: 4 }}>
                            <div className="progress-fill" style={{ width: `${tPct}%`, background: subject.color }} />
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setContentModal({ topicId: topic.id, initial: null })}>
                          <Plus size={12} /> Content
                        </button>
                        <button
                          className="task-card-action-btn"
                          onClick={() => setMoveModal({ kind: 'topic', topicId: topic.id })}
                          title="Move this topic to a board (creates a task with subtasks)"
                        ><Send size={12} /></button>
                        <button className="task-card-action-btn" onClick={() => setTopicModal({ mode: 'edit', initial: topic })} title="Edit Topic"><Pencil size={12} /></button>
                        <button className="task-card-action-btn" onClick={() => handleDeleteTopic(topic.id)} title="Delete Topic"><Trash2 size={12} /></button>
                      </div>
                    </div>

                    {/* Content List */}
                    {!isCollapsed && (
                      <div>
                        {tContents.length === 0 ? (
                          <div style={{ padding: '16px 40px', color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
                            No content yet — click "+ Content" to add questions, videos, or articles.
                          </div>
                        ) : (
                          tContents.map(content => (
                            <ContentItem
                              key={content.id}
                              content={content}
                              onEdit={(c) => setContentModal({ topicId: topic.id, initial: c })}
                              onDelete={(cId) => handleDeleteContent(topic.id, cId)}
                              onCycleStatus={(cId) => handleCycleContentStatus(topic.id, cId)}
                              onMoveToBoard={() => setMoveModal({ kind: 'content', topicId: topic.id, contentId: content.id })}
                              onPlayVideo={(urls, startUrl, title) => setVideoModal({ urls, startUrl, title })}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {topicModal && <TopicModal mode={topicModal.mode} initial={topicModal.initial} onSave={topicModal.mode === 'add' ? handleAddTopic : handleEditTopic} onClose={() => setTopicModal(null)} />}
      {contentModal && <ContentModal topicId={contentModal.topicId} initial={contentModal.initial} onSave={handleSaveContent} onClose={() => setContentModal(null)} />}
      
      {showConvertModal && (
        <ConfirmModal
          title="Convert to Task Board"
          message={`Are you sure you want to convert "${subject.name}" into a task board? This will create a new board where topics become tasks and contents become subtasks.`}
          onConfirm={handleConvertToTasks}
          onCancel={() => !converting && setShowConvertModal(false)}
          loading={converting}
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

      {moveModal && (() => {
        const topic = (subject.topics || []).find(t => t.id === moveModal.topicId);
        if (!topic) return null;
        let sourceTitle, sourceCount;
        if (moveModal.kind === 'topic') {
          sourceTitle = topic.title;
          sourceCount = (topic.contents || []).length;
        } else {
          const content = (topic.contents || []).find(c => c.id === moveModal.contentId);
          if (!content) return null;
          sourceTitle = content.title;
          sourceCount = 1;
        }
        return (
          <MoveToBoardModal
            kind={moveModal.kind}
            sourceTitle={sourceTitle}
            sourceCount={sourceCount}
            boards={boards}
            onClose={() => setMoveModal(null)}
            onConfirm={handleMoveToBoard}
          />
        );
      })()}
    </div>
  );
}
