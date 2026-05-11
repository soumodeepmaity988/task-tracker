'use client';
import { use, useState, useEffect, useRef, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Plus, X, Pencil, Trash2, FileJson, LayoutGrid, List as ListIcon,
  CheckCircle2, GripVertical, ChevronDown, Flag, Calendar,
} from 'lucide-react';
import { msToDateInput, dateInputToMs, fmtDateShort, fmtRelative, fmtDuration, isOverdue, isToday } from '@/lib/dateUtils';
import { RECURRENCE_OPTIONS, nextOccurrence } from '@/lib/recurrence';

// ── Constants ─────────────────────────────────────────────────
const COLUMNS = [
  { id: 'backlog',     label: 'Backlog',     cls: 'col-backlog',  color: '#8b5cf6' },
  { id: 'todo',        label: 'To Do',       cls: 'col-todo',     color: '#4f8ef7' },
  { id: 'in-progress', label: 'In Progress', cls: 'col-progress', color: '#eab308' },
  { id: 'done',        label: 'Done',        cls: 'col-done',     color: '#22c55e' },
];

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const P_COLOR = { low: 'tag-green', medium: 'tag-yellow', high: 'tag-orange', critical: 'tag-red' };
const P_DOT   = { low: 'priority-low', medium: 'priority-medium', high: 'priority-high', critical: 'priority-critical' };

const EMPTY_FORM = { title: '', description: '', priority: 'medium', tags: '', status: 'todo', sprintId: '', dueDate: null, recurring: '', timeEstimate: '' };

const JSON_TEMPLATE = JSON.stringify([
  { title: 'Task title', description: 'Optional description', priority: 'high', tags: ['Tag1', 'Tag2'] },
  { title: 'Another task', priority: 'medium' },
], null, 2);

const DAY_MS = 86400000;
const SPRINT_FILTER_ALL = '__all__';
const SPRINT_FILTER_NONE = '__none__';

function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function fmtRange(start, end) {
  if (!start || !end) return '';
  return `${fmtDate(start)} – ${fmtDate(end)}`;
}

// ── Templates Modal ───────────────────────────────────────────
function TemplatesModal({ templates, onSave, onClose }) {
  const [list, setList] = useState(templates || []);
  const addBlank = () => setList(prev => [...prev, {
    id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    name: 'Template name',
    title: '',
    description: '',
    priority: 'medium',
    tags: [],
    recurring: '',
    timeEstimate: '',
  }]);
  const update = (i, k, v) => setList(prev => prev.map((t, idx) => idx === i ? { ...t, [k]: v } : t));
  const remove = (i) => setList(prev => prev.filter((_, idx) => idx !== i));
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <span className="modal-title">📋 Task Templates</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            Pre-fill new tasks with common patterns. When creating a task, pick a template from the dropdown to seed the form.
          </p>
          {list.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 10 }}>
              No templates yet.
            </div>
          )}
          {list.map((t, i) => (
            <div key={t.id} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="form-input" style={{ flex: 1, fontWeight: 600 }} placeholder="Template name" value={t.name} onChange={e => update(i, 'name', e.target.value)} />
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(i)}><Trash2 size={13} /></button>
              </div>
              <input className="form-input" placeholder="Default task title" value={t.title} onChange={e => update(i, 'title', e.target.value)} />
              <textarea className="form-textarea" placeholder="Default description (markdown)" value={t.description} onChange={e => update(i, 'description', e.target.value)} style={{ minHeight: 50 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <select className="form-select" value={t.priority} onChange={e => update(i, 'priority', e.target.value)}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select className="form-select" value={t.recurring} onChange={e => update(i, 'recurring', e.target.value)}>
                  {RECURRENCE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <input className="form-input" type="number" min="0" step="5" placeholder="Est (min)" value={t.timeEstimate} onChange={e => update(i, 'timeEstimate', e.target.value)} />
              </div>
              <input className="form-input" placeholder="Tags (comma-separated)" value={Array.isArray(t.tags) ? t.tags.join(', ') : t.tags} onChange={e => update(i, 'tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addBlank}><Plus size={13} /> Add template</button>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(list)}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ── Task Modal ────────────────────────────────────────────────
function TaskModal({ initial, sprints, templates, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const base = initial || EMPTY_FORM;
    return {
      ...base,
      dueDate: typeof base.dueDate === 'number' ? msToDateInput(base.dueDate) : (base.dueDate || ''),
      timeEstimate: base.timeEstimate ?? '',
    };
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const applyTemplate = (tplId) => {
    const tpl = templates?.find(t => t.id === tplId);
    if (!tpl) return;
    setForm(f => ({
      ...f,
      title: tpl.title || f.title,
      description: tpl.description || f.description,
      priority: tpl.priority || f.priority,
      tags: Array.isArray(tpl.tags) ? tpl.tags.join(', ') : (tpl.tags || f.tags),
      recurring: tpl.recurring || f.recurring,
      timeEstimate: tpl.timeEstimate || f.timeEstimate,
    }));
  };
  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSave({
      ...form,
      tags: typeof form.tags === 'string'
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : (Array.isArray(form.tags) ? form.tags : []),
      sprintId: form.sprintId || null,
      dueDate: form.dueDate ? dateInputToMs(form.dueDate) : null,
      recurring: form.recurring || '',
      timeEstimate: form.timeEstimate === '' ? null : Number(form.timeEstimate),
    });
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
            {!initial?.id && templates && templates.length > 0 && (
              <div className="form-group">
                <label className="form-label">📋 Start from template (optional)</label>
                <select className="form-select" defaultValue="" onChange={e => { if (e.target.value) applyTemplate(e.target.value); }}>
                  <option value="">— None —</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task title…" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description (Markdown supported)</label>
              <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="**Bold**, lists, `code`, [links](url), - [ ] checkboxes…" />
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">📅 Due date</label>
                <input className="form-input" type="date" value={form.dueDate || ''} onChange={e => set('dueDate', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">🔁 Repeat</label>
                <select className="form-select" value={form.recurring || ''} onChange={e => set('recurring', e.target.value)}>
                  {RECURRENCE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">⏱ Time estimate (min)</label>
                <input className="form-input" type="number" min="0" step="5" value={form.timeEstimate ?? ''} onChange={e => set('timeEstimate', e.target.value)} placeholder="e.g. 30" />
              </div>
              <div className="form-group">
                <label className="form-label">Sprint</label>
                <select className="form-select" value={form.sprintId || ''} onChange={e => set('sprintId', e.target.value)}>
                  <option value="">— No sprint —</option>
                  {sprints.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.status === 'completed' ? '(completed)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input
                className="form-input"
                value={typeof form.tags === 'string' ? form.tags : (form.tags || []).join(', ')}
                onChange={e => set('tags', e.target.value)}
                placeholder="Design, Bug, Feature…"
              />
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
            Paste a JSON array of tasks. Each task requires a <code style={{ background: 'var(--bg-glass)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>title</code>. Optional: <code>description</code>, <code>priority</code>, <code>tags</code>, <code>status</code>.
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

// ── Move To Sprint Modal (reusable) ───────────────────────────
function MoveToSprintModal({ title, description, count, sprints, excludeSprintId, allowUnschedule, onConfirm, onCancel }) {
  const candidates = sprints.filter(s => s.status !== 'completed' && s.id !== excludeSprintId);
  const defaultTarget = candidates[0]?.id || (allowUnschedule ? '__none__' : '');
  const [target, setTarget] = useState(defaultTarget);
  const hasOptions = candidates.length > 0 || allowUnschedule;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {!hasOptions ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              No active sprints to move into. Create a new sprint from the sidebar first.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>{description}</p>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Target sprint</label>
                <select className="form-select" value={target} onChange={e => setTarget(e.target.value)}>
                  {allowUnschedule && <option value="__none__">— No sprint (unschedule) —</option>}
                  {candidates.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!target}
            onClick={() => onConfirm(target === '__none__' ? null : target)}
          >
            Move {count} task{count === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Complete Sprint Modal ─────────────────────────────────────
function CompleteSprintModal({ sprint, unfinished, onConfirm, onCancel }) {
  const [moveAction, setMoveAction] = useState('next');

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">✅ Complete {sprint.name}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onCancel}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {unfinished.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              All {sprint.name} tasks are done — ready to close it out. 🎉
            </p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                <strong>{unfinished.length}</strong> task{unfinished.length === 1 ? '' : 's'} in {sprint.name} {unfinished.length === 1 ? "isn't" : "aren't"} done yet. What should happen to them?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { id: 'next',       label: 'Move to next sprint',        desc: 'Creates a new 7-day sprint if needed.' },
                  { id: 'unschedule', label: 'Unschedule (no sprint)',     desc: 'Tasks remain on the board but lose their sprint.' },
                  { id: 'keep',       label: 'Keep them in this sprint',   desc: 'Closes the sprint anyway, marking it completed.' },
                ].map(opt => (
                  <label key={opt.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12,
                      borderRadius: 10, cursor: 'pointer',
                      background: moveAction === opt.id ? 'rgba(79,142,247,0.10)' : 'var(--bg-glass)',
                      border: moveAction === opt.id ? '1px solid var(--accent-blue)' : '1px solid var(--border)',
                    }}>
                    <input type="radio" name="move" value={opt.id} checked={moveAction === opt.id} onChange={() => setMoveAction(opt.id)} style={{ marginTop: 3 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(moveAction)}>
            <CheckCircle2 size={14} /> Complete Sprint
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task Card (Kanban) ────────────────────────────────────────
function TaskCard({ task, boardId, selected, onToggleSelect, onEdit, onDelete, onDragStart, onDragOver, onDrop, isDraggedOver }) {
  const subtasks = task.subtasks || [];
  const stDone = subtasks.filter(st => st.status === 'done').length;
  const stTotal = subtasks.length;
  return (
    <div
      className="task-card"
      draggable
      onDragStart={e => onDragStart(e, task.id)}
      onDragOver={e => onDragOver?.(e, task.id)}
      onDrop={e => onDrop?.(e, task.id)}
      style={{
        ...(isDraggedOver ? { outline: '2px dashed var(--accent-blue)', outlineOffset: 2 } : {}),
        ...(selected ? { background: 'rgba(79,142,247,0.10)', borderColor: 'var(--accent-blue)' } : {}),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <input
          type="checkbox"
          checked={!!selected}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => { e.stopPropagation(); onToggleSelect?.(task.id); }}
          style={{ marginTop: 4, cursor: 'pointer', flexShrink: 0 }}
          title="Select"
        />
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
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {task.dueDate && (
            <span
              className={`tag ${isOverdue(task.dueDate) ? 'tag-red' : isToday(task.dueDate) ? 'tag-orange' : 'tag-blue'}`}
              style={{ fontSize: 10 }}
              title={fmtDateShort(task.dueDate)}
            >
              📅 {fmtRelative(task.dueDate)}
            </span>
          )}
          {task.recurring && <span className="tag tag-purple" style={{ fontSize: 10 }} title="Recurring">🔁</span>}
          {task.timeEstimate ? (
            <span className="tag tag-gray" style={{ fontSize: 10 }} title={`Estimate: ${fmtDuration(task.timeEstimate)}`}>
              ⏱ {fmtDuration(task.timeEstimate)}
            </span>
          ) : null}
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

// ── List Row ──────────────────────────────────────────────────
function ListRow({ task, boardId, selected, onToggleSelect, onEdit, onDelete, onDragStart, onDragOver, onDrop, isDraggedOver }) {
  const subtasks = task.subtasks || [];
  const stDone = subtasks.filter(st => st.status === 'done').length;
  const stTotal = subtasks.length;
  return (
    <div
      className="list-row"
      draggable
      onDragStart={e => onDragStart(e, task.id)}
      onDragOver={e => onDragOver?.(e, task.id)}
      onDrop={e => onDrop?.(e, task.id)}
      style={{
        display: 'grid',
        gridTemplateColumns: '18px 18px 8px minmax(0,1fr) auto auto auto auto',
        alignItems: 'center', gap: 10,
        padding: '10px 14px',
        background: selected ? 'rgba(79,142,247,0.10)' : 'var(--bg-card)',
        border: `1px solid ${selected ? 'var(--accent-blue)' : 'var(--border)'}`,
        borderRadius: 10,
        cursor: 'grab',
        ...(isDraggedOver ? { outline: '2px dashed var(--accent-blue)', outlineOffset: 2 } : {}),
      }}
    >
      <input
        type="checkbox"
        checked={!!selected}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => { e.stopPropagation(); onToggleSelect?.(task.id); }}
        style={{ cursor: 'pointer' }}
        title="Select"
      />
      <GripVertical size={14} style={{ color: 'var(--text-muted)' }} />
      <div className={`priority-dot ${P_DOT[task.priority]}`} />
      <Link href={`/tasks/${boardId}/${task.id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {task.title}
      </Link>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
        {(task.tags || []).slice(0, 3).map(tag => <span key={tag} className="tag tag-blue" style={{ fontSize: 10 }}>{tag}</span>)}
      </div>
      {stTotal > 0 ? (
        <span className="tag tag-purple" style={{ fontSize: 10 }}>📋 {stDone}/{stTotal}</span>
      ) : <span />}
      <span className={`tag ${P_COLOR[task.priority]}`} style={{ fontSize: 10 }}>{task.priority}</span>
      <div style={{ display: 'flex', gap: 2 }}>
        <button className="task-card-action-btn" onClick={() => onEdit(task)} title="Edit"><Pencil size={11} /></button>
        <button className="task-card-action-btn" onClick={() => onDelete(task.id)} title="Delete"><Trash2 size={11} /></button>
      </div>
    </div>
  );
}

// ── Status Filter ─────────────────────────────────────────────
function StatusFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
  const toggle = (id) => {
    if (value.includes(id)) onChange(value.filter(v => v !== id));
    else onChange([...value, id]);
  };
  const allOn = value.length === COLUMNS.length;
  const label = allOn ? 'All statuses' : value.length === 0 ? 'No status' : `${value.length} selected`;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="form-select" onClick={() => setOpen(o => !o)}
        style={{ minWidth: 150, textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, cursor: 'pointer' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <Flag size={13} /> {label}
        </span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', left: 0, zIndex: 50,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 6, minWidth: 180, boxShadow: 'var(--shadow)',
        }}>
          {COLUMNS.map(c => (
            <label key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
              borderRadius: 6, cursor: 'pointer', fontSize: 13,
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <input type="checkbox" checked={value.includes(c.id)} onChange={() => toggle(c.id)} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
              {c.label}
            </label>
          ))}
          <div style={{ display: 'flex', gap: 6, padding: 6, borderTop: '1px solid var(--border)', marginTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={() => onChange(COLUMNS.map(c => c.id))}>All</button>
            <button type="button" className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 11 }} onClick={() => onChange([])}>None</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sprint Selector ───────────────────────────────────────────
function SprintSelector({ sprints, value, onChange }) {
  return (
    <select className="form-select" value={value} onChange={e => onChange(e.target.value)}
      style={{ minWidth: 220, fontWeight: 600 }}>
      <option value={SPRINT_FILTER_ALL}>All Tasks</option>
      <option value={SPRINT_FILTER_NONE}>— No Sprint (Unscheduled) —</option>
      {sprints.map(s => (
        <option key={s.id} value={s.id}>
          {s.name}{s.status === 'completed' ? ' ✓' : ''} · {fmtRange(s.startDate, s.endDate)}
        </option>
      ))}
    </select>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function BoardPage({ params }) {
  const { boardId } = use(params);
  const { boards, loadingBoards, updateBoard, pushUndo } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sprintFromUrl = searchParams.get('sprint') || SPRINT_FILTER_ALL;

  const board = useMemo(() => {
    const b = boards.find(x => x.id === boardId);
    return b ? {
      ...b,
      sprints: Array.isArray(b.sprints) ? b.sprints : [],
      tasks: Array.isArray(b.tasks) ? b.tasks : [],
      templates: Array.isArray(b.templates) ? b.templates : [],
    } : null;
  }, [boards, boardId]);
  const loading = loadingBoards;

  const [modal, setModal] = useState(null);
  const [jsonModal, setJsonModal] = useState(false);
  const [completeSprintModal, setCompleteSprintModal] = useState(null);
  const [moveUnfinishedModal, setMoveUnfinishedModal] = useState(false);
  const [moveSelectedModal, setMoveSelectedModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const [dragOverCol, setDragOverCol] = useState(null);
  const [dragOverTaskId, setDragOverTaskId] = useState(null);
  const draggingId = useRef(null);

  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState(COLUMNS.map(c => c.id));
  const sprintFilter = sprintFromUrl;
  const setSprintFilter = (next) => {
    if (next === SPRINT_FILTER_ALL) router.replace(`/tasks/${boardId}`);
    else router.replace(`/tasks/${boardId}?sprint=${encodeURIComponent(next)}`);
  };
  const [view, setView] = useState('kanban');

  useEffect(() => {
    const saved = typeof window !== 'undefined' && localStorage.getItem('tf:board-view');
    if (saved === 'list' || saved === 'kanban') setView(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('tf:board-view', view);
  }, [view]);

  // Redirect to home if the board no longer exists (after load completes)
  useEffect(() => {
    if (!loadingBoards && !board) router.push('/');
  }, [loadingBoards, board, router]);

  const saveBoard = (patch) => updateBoard(boardId, patch);

  // Helper: when a recurring task becomes done, spawn the next occurrence
  const spawnRecurrenceIfNeeded = (tasks, taskId, previousStatus, newStatus) => {
    if (newStatus !== 'done' || previousStatus === 'done') return tasks;
    const original = tasks.find(t => t.id === taskId);
    if (!original?.recurring) return tasks;
    const base = original.dueDate || Date.now();
    const next = nextOccurrence(original.recurring, base);
    if (!next) return tasks;
    const clone = {
      ...original,
      id: `t-${Date.now()}-r`,
      status: 'todo',
      createdAt: Date.now(),
      dueDate: next,
      timeSpent: 0,
      subtasks: (original.subtasks || []).map(st => ({ ...st, id: `st-${Date.now()}-${Math.random().toString(36).slice(2,5)}`, status: 'not-started' })),
    };
    return [...tasks, clone];
  };

  // ── Task CRUD ──
  const handleSaveTask = (form) => {
    const taskData = { ...form, tags: Array.isArray(form.tags) ? form.tags : [] };
    let tasks;
    if (modal.initial?.id) {
      const prev = board.tasks.find(t => t.id === modal.initial.id);
      const wasDone = prev?.status === 'done';
      const nowDone = taskData.status === 'done';
      tasks = board.tasks.map(t => t.id === modal.initial.id ? {
        ...t,
        ...taskData,
        completedAt: nowDone && !wasDone ? Date.now() : (nowDone ? t.completedAt : null),
      } : t);
      tasks = spawnRecurrenceIfNeeded(tasks, modal.initial.id, prev?.status, taskData.status);
    } else {
      const defaultSprintId =
        sprintFilter !== SPRINT_FILTER_ALL && sprintFilter !== SPRINT_FILTER_NONE
          ? sprintFilter
          : (taskData.sprintId || null);
      tasks = [...board.tasks, {
        ...taskData,
        sprintId: taskData.sprintId ?? defaultSprintId,
        id: `t-${Date.now()}`,
        createdAt: Date.now(),
        completedAt: taskData.status === 'done' ? Date.now() : null,
        timeSpent: 0,
      }];
    }
    saveBoard({ tasks });
    setModal(null);
  };

  const handleDelete = (id) => {
    const t = board.tasks.find(x => x.id === id);
    if (t) pushUndo(`Deleted "${t.title}"`, { boards: [{ ...board }] });
    saveBoard({ tasks: board.tasks.filter(t => t.id !== id) });
  };

  const handleImportJson = (parsed) => {
    const defaultSprintId =
      sprintFilter !== SPRINT_FILTER_ALL && sprintFilter !== SPRINT_FILTER_NONE
        ? sprintFilter
        : null;
    const newTasks = parsed.map((t, i) => ({
      id: `t-${Date.now()}-${i}`,
      title: t.title.trim(),
      description: t.description || '',
      priority: PRIORITIES.includes(t.priority) ? t.priority : 'medium',
      tags: Array.isArray(t.tags) ? t.tags : [],
      status: COLUMNS.some(c => c.id === t.status) ? t.status : 'todo',
      sprintId: defaultSprintId,
      createdAt: Date.now(),
    }));
    saveBoard({ tasks: [...board.tasks, ...newTasks] });
    setJsonModal(false);
  };

  // ── Drag & Drop ──
  const handleDragStart = (e, id) => {
    draggingId.current = id;
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDropOnColumn = (e, colId) => {
    e.preventDefault();
    const dragged = draggingId.current;
    if (!dragged) return;
    const target = board.tasks.find(t => t.id === dragged);
    if (!target) return;
    const wasDone = target.status === 'done';
    const nowDone = colId === 'done';
    const updated = {
      ...target,
      status: colId,
      completedAt: nowDone && !wasDone ? Date.now() : (nowDone ? target.completedAt : null),
    };
    const others = board.tasks.filter(t => t.id !== dragged);
    let next = [...others, updated];
    next = spawnRecurrenceIfNeeded(next, dragged, target.status, colId);
    saveBoard({ tasks: next });
    draggingId.current = null;
    setDragOverCol(null);
    setDragOverTaskId(null);
  };
  const handleDropOnTask = (e, targetTaskId) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = draggingId.current;
    if (!draggedId || draggedId === targetTaskId) {
      setDragOverTaskId(null);
      return;
    }
    const target = board.tasks.find(t => t.id === targetTaskId);
    const dragged = board.tasks.find(t => t.id === draggedId);
    if (!target || !dragged) return;
    const wasDone = dragged.status === 'done';
    const nowDone = target.status === 'done';
    const updatedDragged = {
      ...dragged,
      status: target.status,
      completedAt: nowDone && !wasDone ? Date.now() : (nowDone ? dragged.completedAt : null),
    };
    const without = board.tasks.filter(t => t.id !== draggedId);
    const targetIdx = without.findIndex(t => t.id === targetTaskId);
    let next = [...without.slice(0, targetIdx), updatedDragged, ...without.slice(targetIdx)];
    next = spawnRecurrenceIfNeeded(next, draggedId, dragged.status, target.status);
    saveBoard({ tasks: next });
    draggingId.current = null;
    setDragOverCol(null);
    setDragOverTaskId(null);
  };

  // ── Sprint actions ──
  const handleMoveSelected = (targetSprintId) => {
    const ids = selectedIds;
    if (ids.size === 0) return;
    const next = board.tasks.map(t => ids.has(t.id) ? { ...t, sprintId: targetSprintId } : t);
    saveBoard({ tasks: next });
    setMoveSelectedModal(false);
    clearSelection();
    if (targetSprintId) setSprintFilter(targetSprintId);
  };

  const handleMoveUnfinished = (targetSprintId) => {
    if (!targetSprintId) return;
    const inScopeIds = new Set(
      (board.tasks || [])
        .filter(t => {
          if (sprintFilter === SPRINT_FILTER_ALL) {/* all */}
          else if (sprintFilter === SPRINT_FILTER_NONE) { if (t.sprintId) return false; }
          else if (t.sprintId !== sprintFilter) return false;
          return (t.status || 'todo') !== 'done';
        })
        .map(t => t.id)
    );
    const next = board.tasks.map(t => inScopeIds.has(t.id) ? { ...t, sprintId: targetSprintId } : t);
    saveBoard({ tasks: next });
    setMoveUnfinishedModal(false);
    setSprintFilter(targetSprintId);
  };

  const handleCompleteSprint = (moveAction) => {
    const sprint = completeSprintModal;
    if (!sprint) return;
    const unfinished = board.tasks.filter(t => t.sprintId === sprint.id && t.status !== 'done');

    let nextSprints = (board.sprints || []).map(s => s.id === sprint.id ? { ...s, status: 'completed' } : s);
    let nextTasks = board.tasks;

    if (unfinished.length > 0) {
      if (moveAction === 'next') {
        const remaining = nextSprints.filter(s => s.id !== sprint.id && s.status !== 'completed');
        let target = remaining[0];
        if (!target) {
          const start = (sprint.endDate || Date.now()) + DAY_MS;
          target = {
            id: `sp-${Date.now()}`,
            name: `Sprint ${(board.sprints || []).length + 1}`,
            startDate: start,
            endDate: start + 6 * DAY_MS,
            status: 'active',
            createdAt: Date.now(),
          };
          nextSprints = [...nextSprints, target];
        }
        nextTasks = nextTasks.map(t => t.sprintId === sprint.id && t.status !== 'done' ? { ...t, sprintId: target.id } : t);
        setSprintFilter(target.id);
      } else if (moveAction === 'unschedule') {
        nextTasks = nextTasks.map(t => t.sprintId === sprint.id && t.status !== 'done' ? { ...t, sprintId: null } : t);
      }
    }

    saveBoard({ sprints: nextSprints, tasks: nextTasks });
    setCompleteSprintModal(null);
  };

  // ── Derived ──
  const sprints = board?.sprints || [];
  const activeSprint = sprintFilter !== SPRINT_FILTER_ALL && sprintFilter !== SPRINT_FILTER_NONE
    ? sprints.find(s => s.id === sprintFilter)
    : null;

  const filtered = useMemo(() => {
    if (!board) return [];
    return (board.tasks || []).filter(t => {
      if (sprintFilter === SPRINT_FILTER_NONE) {
        if (t.sprintId) return false;
      } else if (sprintFilter !== SPRINT_FILTER_ALL) {
        if (t.sprintId !== sprintFilter) return false;
      }
      const tStatus = t.status || 'todo';
      if (!filterStatus.includes(tStatus)) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [board, sprintFilter, filterStatus, filterPriority, search]);

  const sprintScoped = useMemo(() => {
    if (!board) return [];
    return (board.tasks || []).filter(t => {
      if (sprintFilter === SPRINT_FILTER_ALL) return true;
      if (sprintFilter === SPRINT_FILTER_NONE) return !t.sprintId;
      return t.sprintId === sprintFilter;
    });
  }, [board, sprintFilter]);

  const totalInScope = sprintScoped.length;
  const doneInScope = sprintScoped.filter(t => t.status === 'done').length;
  const unfinishedInScope = sprintScoped.filter(t => (t.status || 'todo') !== 'done').length;
  const pct = totalInScope ? Math.round((doneInScope / totalInScope) * 100) : 0;
  const targetableSprints = sprints.filter(s => s.status !== 'completed' && s.id !== (activeSprint?.id));
  const canMoveUnfinished = unfinishedInScope > 0 && targetableSprints.length > 0;

  if (loading) return (
    <div className="app-layout"><Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </main>
    </div>
  );
  if (!board) return null;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-inner">
          {/* Header — title, sprint selector, primary actions all in one row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 12, flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>{board.name}</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <SprintSelector sprints={sprints} value={sprintFilter} onChange={setSprintFilter} />
              {activeSprint && activeSprint.status !== 'completed' && (
                <button className="btn btn-ghost btn-sm" onClick={() => setCompleteSprintModal(activeSprint)} title="Mark sprint complete">
                  <CheckCircle2 size={13} /> Complete
                </button>
              )}
              {canMoveUnfinished && (
                <button className="btn btn-ghost btn-sm" onClick={() => setMoveUnfinishedModal(true)} title="Bulk-assign unfinished tasks in current view to a sprint">
                  Move {unfinishedInScope} → Sprint
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => setJsonModal(true)}>
                <FileJson size={14} /> Import
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setModal({ mode: 'create', initial: { ...EMPTY_FORM } })}>
                <Plus size={14} /> New Task
              </button>
            </div>
          </div>

          {/* Progress line under the header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <p className="page-subtitle" style={{ margin: 0, whiteSpace: 'nowrap' }}>
              {(board.tasks || []).length} tasks · {(board.tasks || []).filter(t => t.status === 'done').length} done
            </p>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, maxWidth: 360 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {doneInScope}/{totalInScope} in view
              </span>
              <div className="progress-bar" style={{ flex: 1, height: 6 }}>
                <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--accent-green)' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? 'var(--accent-green)' : 'var(--text-secondary)', minWidth: 36, textAlign: 'right' }}>
                {pct}%
              </span>
            </div>
          </div>

          {/* Toolbar */}
          <div className="toolbar" style={{ flexWrap: 'wrap' }}>
            <div className="search-box">
              <span style={{ color: 'var(--text-muted)' }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…" />
            </div>
            <select className="form-select" style={{ width: 'auto', minWidth: 140 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
              <option value="all">All priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>)}
            </select>
            <StatusFilter value={filterStatus} onChange={setFilterStatus} />
            <div style={{ flex: 1 }} />
            <div style={{ display: 'inline-flex', background: 'var(--bg-glass)', borderRadius: 8, padding: 2, border: '1px solid var(--border)' }}>
              <button type="button" className="btn btn-sm" onClick={() => setView('kanban')}
                style={{
                  background: view === 'kanban' ? 'var(--bg-card-hover)' : 'transparent',
                  color: view === 'kanban' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  fontWeight: 600, fontSize: 12, padding: '5px 10px',
                }}
                title="Kanban view">
                <LayoutGrid size={13} /> Kanban
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setView('list')}
                style={{
                  background: view === 'list' ? 'var(--bg-card-hover)' : 'transparent',
                  color: view === 'list' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  fontWeight: 600, fontSize: 12, padding: '5px 10px',
                }}
                title="List view">
                <ListIcon size={13} /> List
              </button>
            </div>
          </div>

          {/* Selection bar */}
          {selectedIds.size > 0 && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                padding: '10px 14px', marginBottom: 12,
                background: 'rgba(79,142,247,0.12)',
                border: '1px solid var(--accent-blue)',
                borderRadius: 10,
                position: 'sticky', top: 0, zIndex: 5,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)' }}>
                {selectedIds.size} task{selectedIds.size === 1 ? '' : 's'} selected
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedIds(new Set(filtered.map(t => t.id)))}
                style={{ fontSize: 12 }}
                title="Select every task visible in the current view"
              >
                Select all visible ({filtered.length})
              </button>
              <button className="btn btn-ghost btn-sm" onClick={clearSelection} style={{ fontSize: 12 }}>
                Clear
              </button>
              <div style={{ flex: 1 }} />
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setMoveSelectedModal(true)}
                disabled={sprints.length === 0}
                title={sprints.length === 0 ? 'Create a sprint in the sidebar first' : 'Move selected tasks to a sprint'}
              >
                <Calendar size={13} /> Move to Sprint…
              </button>
            </div>
          )}

          {/* Board */}
          {view === 'kanban' ? (
            <div className="kanban-board">
              {COLUMNS.filter(c => filterStatus.includes(c.id)).map(col => {
                const colTasks = filtered.filter(t => (t.status || 'todo') === col.id);
                return (
                  <div
                    key={col.id}
                    className={`kanban-column ${col.cls}${dragOverCol === col.id ? ' drag-over' : ''}`}
                    onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
                    onDrop={e => handleDropOnColumn(e, col.id)}
                    onDragLeave={() => setDragOverCol(null)}
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
                        <TaskCard
                          key={task.id}
                          task={task}
                          boardId={boardId}
                          selected={selectedIds.has(task.id)}
                          onToggleSelect={toggleSelect}
                          onEdit={t => setModal({ mode: 'edit', initial: { ...t, tags: t.tags?.join(', ') || '' } })}
                          onDelete={handleDelete}
                          onDragStart={handleDragStart}
                          onDragOver={(e, tid) => { e.preventDefault(); e.stopPropagation(); setDragOverTaskId(tid); }}
                          onDrop={handleDropOnTask}
                          isDraggedOver={dragOverTaskId === task.id}
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
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {COLUMNS.filter(c => filterStatus.includes(c.id)).map(col => {
                const colTasks = filtered.filter(t => (t.status || 'todo') === col.id);
                return (
                  <div
                    key={col.id}
                    onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
                    onDrop={e => handleDropOnColumn(e, col.id)}
                    onDragLeave={() => setDragOverCol(null)}
                    style={{
                      borderRadius: 12,
                      background: dragOverCol === col.id ? `${col.color}10` : 'transparent',
                      transition: 'background 0.15s',
                      padding: 4,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 10px' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                      <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{col.label}</h3>
                      <span className="column-count" style={{ background: `${col.color}22`, color: col.color }}>{colTasks.length}</span>
                      <div style={{ flex: 1 }} />
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setModal({ mode: 'create', initial: { ...EMPTY_FORM, status: col.id } })}>
                        <Plus size={11} /> Add
                      </button>
                    </div>
                    {colTasks.length === 0 ? (
                      <div style={{ padding: '14px 14px', color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic', borderRadius: 8, border: '1px dashed var(--border)' }}>
                        No tasks — drop here to set status to {col.label.toLowerCase()}.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {colTasks.map(task => (
                          <ListRow
                            key={task.id}
                            task={task}
                            boardId={boardId}
                            selected={selectedIds.has(task.id)}
                            onToggleSelect={toggleSelect}
                            onEdit={t => setModal({ mode: 'edit', initial: { ...t, tags: t.tags?.join(', ') || '' } })}
                            onDelete={handleDelete}
                            onDragStart={handleDragStart}
                            onDragOver={(e, tid) => { e.preventDefault(); e.stopPropagation(); setDragOverTaskId(tid); }}
                            onDrop={handleDropOnTask}
                            isDraggedOver={dragOverTaskId === task.id}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {modal && (
        <TaskModal
          initial={modal.initial}
          sprints={sprints}
          templates={board.templates}
          onSave={handleSaveTask}
          onClose={() => setModal(null)}
        />
      )}
      {jsonModal && <JsonImportModal onImport={handleImportJson} onClose={() => setJsonModal(false)} />}
      {completeSprintModal && (
        <CompleteSprintModal
          sprint={completeSprintModal}
          unfinished={board.tasks.filter(t => t.sprintId === completeSprintModal.id && t.status !== 'done')}
          onConfirm={handleCompleteSprint}
          onCancel={() => setCompleteSprintModal(null)}
        />
      )}
      {moveUnfinishedModal && (
        <MoveToSprintModal
          title="➡️ Move unfinished tasks"
          description={<>Move <strong>{unfinishedInScope}</strong> unfinished task{unfinishedInScope === 1 ? '' : 's'} (any status except <em>Done</em>) into:</>}
          count={unfinishedInScope}
          sprints={sprints}
          excludeSprintId={activeSprint?.id}
          onConfirm={handleMoveUnfinished}
          onCancel={() => setMoveUnfinishedModal(false)}
        />
      )}
      {moveSelectedModal && (
        <MoveToSprintModal
          title="➡️ Move selected tasks"
          description={<>Move <strong>{selectedIds.size}</strong> selected task{selectedIds.size === 1 ? '' : 's'} into:</>}
          count={selectedIds.size}
          sprints={sprints}
          excludeSprintId={activeSprint?.id}
          allowUnschedule
          onConfirm={handleMoveSelected}
          onCancel={() => setMoveSelectedModal(false)}
        />
      )}
    </div>
  );
}
