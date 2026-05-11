'use client';
import { use, useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, X, Check, Trash2, ArrowLeft, Pencil, Video, FileText, ExternalLink, ChevronDown, ChevronRight, Kanban } from 'lucide-react';

const STATUS_CYCLE = { 'not-started': 'learning', 'learning': 'done', 'done': 'not-started' };
const STATUS_COLOR = { 'not-started': 'tag-gray', 'learning': 'tag-yellow', 'done': 'tag-green' };
const STATUS_LABEL = { 'not-started': 'Not Started', 'learning': 'Learning', 'done': 'Done' };
const PRIORITY_COLOR = { low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444' };
const PRIORITY_TAG = { low: 'tag-green', medium: 'tag-yellow', high: 'tag-orange', critical: 'tag-red' };

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
  const [form, setForm] = useState(initial || {
    title: '', notes: '', videoUrl: '', docUrl: '', priority: 'medium', status: 'not-started'
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => { e.preventDefault(); if (!form.title.trim()) return; onSave(form); };

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
              <label className="form-label">🎬 Video URL</label>
              <div style={{ position: 'relative' }}>
                <Video size={14} style={{ position: 'absolute', left: 10, top: 11, color: '#ff4444' }} />
                <input className="form-input" style={{ paddingLeft: 32 }} value={form.videoUrl} onChange={e => set('videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>YouTube, Loom, or any video link — will show a red 🎬 icon</span>
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
function ContentItem({ content, onEdit, onDelete, onCycleStatus }) {
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

      {/* Link icons — only show if URL exists, clicking opens in new tab */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {content.videoUrl && (
          <a href={content.videoUrl} target="_blank" rel="noopener noreferrer"
            title="Watch Video"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 6,
              background: 'rgba(255,68,68,0.12)', color: '#ff4444',
              textDecoration: 'none', transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,68,68,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,68,68,0.12)'}
          >
            <Video size={14} />
          </a>
        )}
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
        <button className="task-card-action-btn" onClick={() => onEdit(content)} title="Edit"><Pencil size={12} /></button>
        <button className="task-card-action-btn" onClick={() => onDelete(content.id)} title="Delete"><Trash2 size={12} /></button>
      </div>
    </div>
  );
}

export default function SubjectDetailPage({ params }) {
  const { id } = use(params);
  const { subjects, loadingSubjects, updateSubject, fetchBoards } = useApp();
  const router = useRouter();
  const subject = useMemo(() => subjects.find(s => s.id === id), [subjects, id]);
  const loading = loadingSubjects;
  const [converting, setConverting] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

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
    </div>
  );
}
