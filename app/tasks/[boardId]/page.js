'use client';
import { use, useState, useEffect, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, X, Pencil, Trash2, FileJson } from 'lucide-react';

const COLUMNS = [
  { id: 'todo',        label: 'To Do',       cls: 'col-todo',     color: '#4f8ef7' },
  { id: 'in-progress', label: 'In Progress', cls: 'col-progress',  color: '#eab308' },
  { id: 'done',        label: 'Done',         cls: 'col-done',     color: '#22c55e' },
];

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const P_COLOR = { low: 'tag-green', medium: 'tag-yellow', high: 'tag-orange', critical: 'tag-red' };
const P_DOT   = { low: 'priority-low', medium: 'priority-medium', high: 'priority-high', critical: 'priority-critical' };
const EMPTY_FORM = { title: '', description: '', priority: 'medium', tags: '', status: 'todo' };

const JSON_TEMPLATE = JSON.stringify([
  { title: 'Task title', description: 'Optional description', priority: 'high', tags: ['Tag1', 'Tag2'] },
  { title: 'Another task', priority: 'medium' },
], null, 2);

// ── Task Modal ────────────────────────────────────────────────
function TaskModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({ ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [] });
  };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{initial?.id ? 'Edit Task' : 'New Task'}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task title…" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional…" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => set('priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input className="form-input" value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Design, Bug, Feature…" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary"><Plus size={14} /> {initial?.id ? 'Save Changes' : 'Create Task'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── JSON Import Modal ─────────────────────────────────────────
function JsonImportModal({ onImport, onClose }) {
  const [json, setJson] = useState(JSON_TEMPLATE);
  const [error, setError] = useState('');
  const submit = () => {
    setError('');
    try {
      let parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) parsed = [parsed];
      const valid = parsed.filter(t => t && typeof t.title === 'string' && t.title.trim());
      if (valid.length === 0) { setError('No valid tasks found. Each task needs at least a "title" field.'); return; }
      onImport(valid);
    } catch (e) {
      setError('Invalid JSON: ' + e.message);
    }
  };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <span className="modal-title">📥 Import Tasks from JSON</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Paste a JSON array of tasks. Each task requires a <code style={{ background: 'var(--bg-glass)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>title</code>. Optional fields: <code style={{ background: 'var(--bg-glass)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>description</code>, <code style={{ background: 'var(--bg-glass)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>priority</code> (low/medium/high/critical), <code style={{ background: 'var(--bg-glass)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>tags</code> (array).
          </p>
          <textarea className="json-editor" value={json} onChange={e => { setJson(e.target.value); setError(''); }} spellCheck={false} />
          {error && <div className="json-error">⚠️ {error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}><FileJson size={14} /> Import Tasks</button>
        </div>
      </div>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────
function TaskCard({ task, boardId, onEdit, onDelete, onDragStart }) {
  const subtasks = task.subtasks || [];
  const stDone = subtasks.filter(st => st.status === 'done').length;
  const stTotal = subtasks.length;
  return (
    <div className="task-card" draggable onDragStart={e => onDragStart(e, task.id)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div className={`priority-dot ${P_DOT[task.priority]}`} style={{ marginTop: 5, flexShrink: 0 }} />
        <Link href={`/tasks/${boardId}/${task.id}`} className="task-card-title" style={{ flex: 1, textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
          {task.title}
        </Link>
        <div className="task-card-actions">
          <button className="task-card-action-btn" onClick={(e) => { e.stopPropagation(); onEdit(task); }}><Pencil size={11} /></button>
          <button className="task-card-action-btn" onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}><Trash2 size={11} /></button>
        </div>
      </div>
      {task.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5 }}>{task.description}</p>}
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {task.tags?.map(tag => <span key={tag} className="tag tag-blue" style={{ fontSize: 10 }}>{tag}</span>)}
          {stTotal > 0 && (
            <span className="tag tag-purple" style={{ fontSize: 10 }}>📋 {stDone}/{stTotal}</span>
          )}
        </div>
        <span className={`tag ${P_COLOR[task.priority]}`} style={{ fontSize: 10 }}>{task.priority}</span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function BoardPage({ params }) {
  const { boardId } = use(params);
  const { boards, updateBoard } = useApp();
  const router = useRouter();

  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);    // null | { mode, initial? }
  const [jsonModal, setJsonModal] = useState(false);
  const [dragOver, setDragOver] = useState(null);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const draggingId = useRef(null);

  // Fetch board from API
  const fetchBoard = async () => {
    setLoading(true);
    const res = await fetch(`/api/boards/${boardId}`);
    if (res.ok) setBoard(await res.json());
    else router.push('/');
    setLoading(false);
  };

  useEffect(() => { fetchBoard(); }, [boardId]);

  // Persist board tasks to file
  const saveBoard = async (patch) => {
    const updated = { ...board, ...patch };
    setBoard(updated);
    await fetch(`/api/boards/${boardId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    // also update context so sidebar stays in sync on rename etc
    updateBoard(boardId, patch);
  };

  const handleSaveTask = (form) => {
    const taskData = { ...form, tags: Array.isArray(form.tags) ? form.tags : [] };
    let tasks;
    if (modal.initial?.id) {
      tasks = board.tasks.map(t => t.id === modal.initial.id ? { ...t, ...taskData } : t);
    } else {
      tasks = [...board.tasks, { ...taskData, id: `t-${Date.now()}`, createdAt: Date.now() }];
    }
    saveBoard({ tasks });
    setModal(null);
  };

  const handleDelete = (id) => {
    saveBoard({ tasks: board.tasks.filter(t => t.id !== id) });
  };

  const handleImportJson = (parsed) => {
    const newTasks = parsed.map(t => ({
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: t.title.trim(),
      description: t.description || '',
      priority: ['low', 'medium', 'high', 'critical'].includes(t.priority) ? t.priority : 'medium',
      tags: Array.isArray(t.tags) ? t.tags : [],
      status: 'todo',
      createdAt: Date.now(),
    }));
    saveBoard({ tasks: [...board.tasks, ...newTasks] });
    setJsonModal(false);
  };

  const handleDragStart = (e, id) => { draggingId.current = id; e.dataTransfer.effectAllowed = 'move'; };
  const handleDrop = (e, colId) => {
    e.preventDefault();
    if (draggingId.current) {
      const tasks = board.tasks.map(t => t.id === draggingId.current ? { ...t, status: colId } : t);
      saveBoard({ tasks });
    }
    draggingId.current = null;
    setDragOver(null);
  };

  if (loading) return (
    <div className="app-layout"><Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </main>
    </div>
  );

  if (!board) return null;

  const filtered = (board.tasks || []).filter(t =>
    (filterPriority === 'all' || t.priority === filterPriority) &&
    (!search || t.title.toLowerCase().includes(search.toLowerCase()))
  );

  const todo = filtered.filter(t => t.status === 'todo').length;
  const inProg = filtered.filter(t => t.status === 'in-progress').length;
  const done = filtered.filter(t => t.status === 'done').length;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-inner">
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h1 className="page-title">{board.name}</h1>
              <p className="page-subtitle">{(board.tasks || []).length} tasks total · {done} done</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setJsonModal(true)}>
                <FileJson size={15} /> Import JSON
              </button>
              <button className="btn btn-primary" onClick={() => setModal({ mode: 'create', initial: { ...EMPTY_FORM } })}>
                <Plus size={15} /> New Task
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="search-box">
              <span style={{ color: 'var(--text-muted)' }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…" />
            </div>
            <select className="form-select" style={{ width: 'auto', minWidth: 140 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="all">All priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>

          {/* Kanban */}
          <div className="kanban-board">
            {COLUMNS.map(col => {
              const colTasks = filtered.filter(t => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className={`kanban-column ${col.cls}${dragOver === col.id ? ' drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
                  onDrop={e => handleDrop(e, col.id)}
                  onDragLeave={() => setDragOver(null)}
                >
                  <div className="column-header">
                    <div className="column-title">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                      {col.label}
                      <span className="column-count" style={{ background: `${col.color}22`, color: col.color }}>{colTasks.length}</span>
                    </div>
                  </div>
                  <div className="column-cards">
                    {colTasks.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: 12 }}>Drop here</div>
                    )}
                    {colTasks.map(task => (
                      <TaskCard key={task.id} task={task} boardId={boardId}
                        onEdit={t => setModal({ mode: 'edit', initial: { ...t, tags: t.tags?.join(', ') || '' } })}
                        onDelete={handleDelete}
                        onDragStart={handleDragStart}
                      />
                    ))}
                    <button className="add-card-btn" onClick={() => setModal({ mode: 'create', initial: { ...EMPTY_FORM, status: col.id } })}>
                      <Plus size={13} /> Add task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {modal && <TaskModal initial={modal.initial} onSave={handleSaveTask} onClose={() => setModal(null)} />}
      {jsonModal && <JsonImportModal onImport={handleImportJson} onClose={() => setJsonModal(false)} />}
    </div>
  );
}
