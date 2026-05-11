'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import Link from 'next/link';
import { Plus, X, Pencil, Trash2, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';

const COLORS = ['#4f8ef7', '#8b5cf6', '#2dd4bf', '#ec4899', '#f97316', '#22c55e', '#eab308', '#ef4444'];
const ICONS = ['📚', '⚛️', '🧮', '🗄️', '🎨', '🔐', '🧪', '📐', '🌐', '🤖', '📊', '🔧'];
const EMPTY = { name: '', description: '', icon: '📚', color: '#4f8ef7' };

const EXAMPLE_JSON = `{
  "name": "Dynamic Programming",
  "icon": "🧮",
  "color": "#8b5cf6",
  "description": "DP patterns and problems",
  "topics": [
    {
      "title": "1D DP",
      "contents": [
        {
          "title": "Fibonacci / Climbing Stairs",
          "videoUrl": "https://youtube.com/watch?v=...",
          "docUrl": "https://leetcode.com/problems/climbing-stairs",
          "priority": "high",
          "status": "not-started",
          "notes": "Base case + recurrence"
        }
      ]
    },
    {
      "title": "2D DP",
      "contents": [
        {
          "title": "Longest Common Subsequence",
          "videoUrl": "",
          "docUrl": "",
          "priority": "medium",
          "status": "not-started",
          "notes": ""
        }
      ]
    }
  ]
}`;

function SubjectModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => { e.preventDefault(); if (!form.name.trim()) return; onSave(form); };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{initial?.id ? 'Edit Subject' : 'New Subject'}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. React & Next.js" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description} onChange={e => set('description', e.target.value)} placeholder="What topics does this cover?" />
            </div>
            <div className="form-group">
              <label className="form-label">Icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => set('icon', ic)}
                    style={{ fontSize: 20, padding: 5, borderRadius: 8, cursor: 'pointer', background: form.icon === ic ? 'var(--bg-glass)' : 'none', border: form.icon === ic ? '2px solid var(--accent-blue)' : '2px solid transparent' }}
                  >{ic}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('color', c)}
                    style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid white' : '3px solid transparent', outline: form.color === c ? `2px solid ${c}` : 'none' }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary"><Plus size={14} /> {initial?.id ? 'Save' : 'Create Subject'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── JSON Import Modal ─────────────────────────────────────────
function JsonImportModal({ onImport, onClose }) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');

  const handleImport = () => {
    setError('');
    try {
      const data = JSON.parse(jsonText);

      // Support single object or array of objects
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (!item.name || typeof item.name !== 'string') {
          setError('Each subject must have a "name" field (string).');
          return;
        }
      }

      // Normalize topics and contents with IDs
      const normalized = items.map(item => ({
        name: item.name,
        icon: item.icon || '📚',
        color: item.color || '#4f8ef7',
        description: item.description || '',
        topics: (item.topics || []).map((topic, ti) => ({
          id: `tp-${Date.now()}-${ti}`,
          title: topic.title || `Topic ${ti + 1}`,
          contents: (topic.contents || []).map((content, ci) => ({
            id: `c-${Date.now()}-${ti}-${ci}`,
            title: content.title || `Content ${ci + 1}`,
            videoUrl: content.videoUrl || '',
            docUrl: content.docUrl || '',
            priority: content.priority || 'medium',
            status: content.status || 'not-started',
            notes: content.notes || '',
            createdAt: Date.now(),
          })),
        })),
      }));

      onImport(normalized);
    } catch (e) {
      setError(`Invalid JSON: ${e.message}`);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <span className="modal-title">📥 Import Subject from JSON</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
            Paste a JSON object (or array) to create subjects with topics and contents.
            Each content can have <code style={{ color: 'var(--accent-blue)' }}>videoUrl</code>, <code style={{ color: 'var(--accent-blue)' }}>docUrl</code>, <code style={{ color: 'var(--accent-blue)' }}>priority</code>, and <code style={{ color: 'var(--accent-blue)' }}>status</code>.
          </p>
          <textarea
            className="json-editor"
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
            placeholder={EXAMPLE_JSON}
            style={{ minHeight: 280 }}
          />
          {error && <div className="json-error">{error}</div>}

          <details style={{ marginTop: 12 }}>
            <summary style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}>📋 Show Example JSON</summary>
            <pre style={{ fontSize: 11, color: 'var(--accent-green)', background: 'var(--bg-primary)', padding: 12, borderRadius: 8, marginTop: 8, overflow: 'auto', maxHeight: 200, border: '1px solid var(--border)' }}>
              {EXAMPLE_JSON}
            </pre>
          </details>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleImport} disabled={!jsonText.trim()}>
            <Upload size={14} /> Import & Create
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SubjectsPage() {
  const { subjects, createSubject, updateSubject, deleteSubject, fetchSubjects } = useApp();
  const router = useRouter();
  const [modal, setModal] = useState(null);
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [search, setSearch] = useState('');

  const handleSave = async (form) => {
    if (modal.initial?.id) {
      await updateSubject(modal.initial.id, form);
    } else {
      const created = await createSubject(form);
      router.push(`/subjects/${created.id}`);
    }
    setModal(null);
  };

  const handleJsonImport = async (items) => {
    for (const item of items) {
      await createSubject(item);
    }
    setShowJsonImport(false);
    // If single subject, navigate to it
    if (items.length === 1) {
      // Refetch to get the latest subjects list with IDs
      await fetchSubjects();
    }
  };

  const filtered = subjects.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="page-header" style={{ marginBottom: 0 }}>
              <h1 className="page-title">📚 Subject Store</h1>
              <p className="page-subtitle">Organize your learning by subjects and topics</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowJsonImport(true)}>
                <Upload size={14} /> Import JSON
              </button>
              <button className="btn btn-primary" onClick={() => setModal({ initial: null })}>
                <Plus size={15} /> New Subject
              </button>
            </div>
          </div>

          <div className="toolbar">
            <div className="search-box">
              <span style={{ color: 'var(--text-muted)' }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subjects…" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📖</div>
              <h3>No subjects yet</h3>
              <p>Create your first subject or import from JSON</p>
              <br />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn btn-ghost" onClick={() => setShowJsonImport(true)}>
                  <Upload size={14} /> Import JSON
                </button>
                <button className="btn btn-primary" onClick={() => setModal({ initial: null })}>
                  <Plus size={14} /> Create Subject
                </button>
              </div>
            </div>
          ) : (
            <div className="subjects-grid">
              {filtered.map(s => {
                const total = s.topics?.length || 0;
                const done = s.topics?.filter(t => t.status === 'done').length || 0;
                const pct = total ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={s.id} style={{ position: 'relative' }}>
                    <Link href={`/subjects/${s.id}`} className="subject-card">
                      <div className="subject-card-header">
                        <div className="subject-icon" style={{ background: `${s.color}22` }}>{s.icon}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="task-card-action-btn" onClick={e => { e.preventDefault(); setModal({ initial: s }); }}><Pencil size={12} /></button>
                          <button className="task-card-action-btn" onClick={e => { e.preventDefault(); deleteSubject(s.id); }}><Trash2 size={12} /></button>
                        </div>
                      </div>
                      <div className="subject-card-title">{s.name}</div>
                      <div className="subject-card-desc">{s.description || 'No description'}</div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: s.color }} />
                      </div>
                      <div className="progress-text">
                        <span>{done}/{total} topics done</span>
                        <span style={{ color: s.color, fontWeight: 600 }}>{pct}%</span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      {modal && <SubjectModal initial={modal.initial} onSave={handleSave} onClose={() => setModal(null)} />}
      {showJsonImport && <JsonImportModal onImport={handleJsonImport} onClose={() => setShowJsonImport(false)} />}
    </div>
  );
}
