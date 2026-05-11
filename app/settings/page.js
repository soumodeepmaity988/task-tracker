'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { Check, Copy, FileJson, BookOpen, Kanban, Database } from 'lucide-react';

const TASK_IMPORT_JSON = JSON.stringify(
  [
    {
      title: 'Task title (required)',
      description: 'Optional description',
      priority: 'high',
      tags: ['Design', 'Bug'],
      status: 'todo',
    },
    {
      title: 'Another task — only title is required',
      priority: 'medium',
    },
  ],
  null,
  2,
);

const TASK_STORED_JSON = JSON.stringify(
  {
    id: 'board-1778492275119',
    name: 'My Board',
    createdAt: 1778492275119,
    sprints: [
      {
        id: 'sp-1778492280000',
        name: 'Sprint 1',
        startDate: 1778500000000,
        endDate: 1779100000000,
        status: 'active',
        createdAt: 1778492280000,
      },
    ],
    tasks: [
      {
        id: 't-1778492300000',
        title: 'Design login screen',
        description: 'Wireframes + final mocks',
        priority: 'high',
        tags: ['Design', 'Auth'],
        status: 'in-progress',
        sprintId: 'sp-1778492280000',
        createdAt: 1778492300000,
        subtasks: [
          { id: 'st-1', title: 'Wireframe', status: 'done' },
          { id: 'st-2', title: 'High-fidelity mock', status: 'todo' },
        ],
      },
    ],
  },
  null,
  2,
);

const SUBJECT_IMPORT_JSON = JSON.stringify(
  {
    name: 'Dynamic Programming',
    icon: '🧮',
    color: '#8b5cf6',
    description: 'DP patterns and problems',
    topics: [
      {
        title: '1D DP',
        contents: [
          {
            title: 'Fibonacci / Climbing Stairs',
            videoUrl: 'https://youtube.com/watch?v=...',
            docUrl: 'https://leetcode.com/problems/climbing-stairs',
            priority: 'high',
            status: 'not-started',
            notes: 'Base case + recurrence',
          },
        ],
      },
      {
        title: '2D DP',
        contents: [
          {
            title: 'Longest Common Subsequence',
            priority: 'medium',
            status: 'not-started',
          },
        ],
      },
    ],
  },
  null,
  2,
);

const SUBJECT_STORED_JSON = JSON.stringify(
  {
    id: 's-1778492275119',
    name: 'Dynamic Programming',
    icon: '🧮',
    color: '#8b5cf6',
    description: 'DP patterns and problems',
    createdAt: 1778492275119,
    topics: [
      {
        id: 'tp-1778492300000',
        title: '1D DP',
        contents: [
          {
            id: 'c-1778492400000',
            title: 'Fibonacci / Climbing Stairs',
            videoUrl: 'https://youtube.com/watch?v=...',
            docUrl: 'https://leetcode.com/problems/climbing-stairs',
            priority: 'high',
            status: 'not-started',
            notes: 'Base case + recurrence',
            createdAt: 1778492400000,
          },
        ],
      },
    ],
  },
  null,
  2,
);

function CodeBlock({ code, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div style={{ position: 'relative', marginTop: 10 }}>
      {label && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </div>
      )}
      <pre style={{
        fontSize: 12, lineHeight: 1.55,
        color: 'var(--accent-green)',
        background: 'var(--bg-primary)',
        padding: '14px 16px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        overflow: 'auto',
        maxHeight: 420,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      }}>{code}</pre>
      <button
        onClick={copy}
        className="btn btn-ghost btn-sm"
        style={{ position: 'absolute', top: label ? 28 : 8, right: 8, fontSize: 11, padding: '4px 8px' }}
        title="Copy to clipboard"
      >
        {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
      </button>
    </div>
  );
}

function FieldTable({ rows }) {
  return (
    <div style={{ overflowX: 'auto', marginTop: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--text-muted)', width: 140 }}>Field</th>
            <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--text-muted)', width: 110 }}>Type</th>
            <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--text-muted)', width: 90 }}>Required</th>
            <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--text-muted)' }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '8px 10px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: 'var(--accent-blue)' }}>{r.name}</td>
              <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{r.type}</td>
              <td style={{ padding: '8px 10px' }}>
                <span className={`tag ${r.required ? 'tag-red' : 'tag-gray'}`} style={{ fontSize: 10 }}>
                  {r.required ? 'required' : 'optional'}
                </span>
              </td>
              <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>{r.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TASK_FIELDS = [
  { name: 'title', type: 'string', required: true, notes: 'Shown on the card.' },
  { name: 'description', type: 'string', required: false, notes: 'Free-form text.' },
  { name: 'priority', type: 'enum', required: false, notes: 'low · medium · high · critical (default: medium).' },
  { name: 'tags', type: 'string[]', required: false, notes: 'Rendered as pills on the card.' },
  { name: 'status', type: 'enum', required: false, notes: 'backlog · todo · in-progress · done (default: todo).' },
  { name: 'sprintId', type: 'string|null', required: false, notes: 'Assigns the task to a sprint. Defaults to the currently-selected sprint on import.' },
];

const SPRINT_FIELDS = [
  { name: 'id', type: 'string', required: true, notes: 'e.g. "sp-1778492280000".' },
  { name: 'name', type: 'string', required: true, notes: 'e.g. "Sprint 1".' },
  { name: 'startDate', type: 'number', required: true, notes: 'Unix ms timestamp.' },
  { name: 'endDate', type: 'number', required: true, notes: 'Unix ms timestamp.' },
  { name: 'status', type: 'enum', required: false, notes: 'active · completed (default: active).' },
];

const SUBJECT_FIELDS = [
  { name: 'name', type: 'string', required: true, notes: 'Subject display name.' },
  { name: 'icon', type: 'emoji', required: false, notes: 'Single emoji (default: 📚).' },
  { name: 'color', type: 'hex', required: false, notes: 'e.g. "#8b5cf6" (default: #4f8ef7).' },
  { name: 'description', type: 'string', required: false, notes: 'Short summary.' },
  { name: 'topics', type: 'Topic[]', required: false, notes: 'Nested topics — see below.' },
];

const TOPIC_FIELDS = [
  { name: 'title', type: 'string', required: true, notes: 'Topic display name.' },
  { name: 'contents', type: 'Content[]', required: false, notes: 'Items inside the topic.' },
];

const CONTENT_FIELDS = [
  { name: 'title', type: 'string', required: true, notes: 'Content item name.' },
  { name: 'videoUrl', type: 'url', required: false, notes: 'YouTube/Loom link — shows red 🎬 icon.' },
  { name: 'docUrl', type: 'url', required: false, notes: 'LeetCode/Docs link — shows blue 📄 icon.' },
  { name: 'priority', type: 'enum', required: false, notes: 'low · medium · high · critical.' },
  { name: 'status', type: 'enum', required: false, notes: 'not-started · learning · done.' },
  { name: 'notes', type: 'string', required: false, notes: 'Free-form notes.' },
];

export default function SettingsPage() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-inner">
          <div className="page-header">
            <h1 className="page-title">⚙️ Settings & JSON Reference</h1>
            <p className="page-subtitle">Schemas for importing tasks and subjects via JSON, and where TaskFlow stores data.</p>
          </div>

          {/* Storage info */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Database size={16} color="var(--accent-teal)" />
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>File storage</h2>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              All data lives on disk under the project's <code style={{ background: 'var(--bg-glass)', padding: '1px 6px', borderRadius: 4, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: 'var(--accent-blue)' }}>data/</code> directory:
            </p>
            <ul style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 8, paddingLeft: 20, lineHeight: 1.8 }}>
              <li><code style={{ color: 'var(--accent-blue)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>data/boards.json</code> — array of board objects (each containing its own tasks).</li>
              <li><code style={{ color: 'var(--accent-blue)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>data/subjects.json</code> — array of subject objects (each containing topics → contents).</li>
            </ul>
          </div>

          {/* Tasks */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Kanban size={16} color="var(--accent-blue)" />
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Task JSON</h2>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 4 }}>
              Use the <strong>Import JSON</strong> button on any board. Paste a single task object or an array.
              The board assigns <code style={{ color: 'var(--accent-blue)' }}>id</code>, <code style={{ color: 'var(--accent-blue)' }}>createdAt</code>, and defaults missing fields.
            </p>

            <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 18 }}>Fields</h3>
            <FieldTable rows={TASK_FIELDS} />

            <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 18 }}>Sprint fields</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Each board has a <code style={{ color: 'var(--accent-blue)' }}>sprints</code> array. Sprints are created from the board page; tasks reference them via <code style={{ color: 'var(--accent-blue)' }}>sprintId</code>.
            </p>
            <FieldTable rows={SPRINT_FIELDS} />

            <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileJson size={13} color="var(--accent-blue)" /> Import example
            </h3>
            <CodeBlock code={TASK_IMPORT_JSON} />

            <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 20 }}>Stored shape (boards.json)</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              How a board with one task looks on disk. <code style={{ color: 'var(--accent-blue)' }}>subtasks</code> is optional and managed from the task detail page.
            </p>
            <CodeBlock code={TASK_STORED_JSON} />
          </div>

          {/* Subjects */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <BookOpen size={16} color="var(--accent-teal)" />
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Subject JSON</h2>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 4 }}>
              Use <strong>Import JSON</strong> on the Subjects page. Paste a single subject or an array of subjects.
              Topics and contents get IDs assigned on import.
            </p>

            <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 18 }}>Subject fields</h3>
            <FieldTable rows={SUBJECT_FIELDS} />

            <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 18 }}>Topic fields</h3>
            <FieldTable rows={TOPIC_FIELDS} />

            <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 18 }}>Content fields</h3>
            <FieldTable rows={CONTENT_FIELDS} />

            <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileJson size={13} color="var(--accent-teal)" /> Import example
            </h3>
            <CodeBlock code={SUBJECT_IMPORT_JSON} />

            <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 20 }}>Stored shape (subjects.json)</h3>
            <CodeBlock code={SUBJECT_STORED_JSON} />
          </div>

          {/* Tips */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 40 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>💡 Tips</h2>
            <ul style={{ fontSize: 12.5, color: 'var(--text-secondary)', paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Only fields marked <strong>required</strong> must be present — everything else is optional and gets sensible defaults.</li>
              <li>Unknown <code style={{ color: 'var(--accent-blue)' }}>priority</code> or <code style={{ color: 'var(--accent-blue)' }}>status</code> values fall back to defaults (<code>medium</code> / <code>todo</code> for tasks, <code>not-started</code> for content).</li>
              <li>You can hand-edit <code style={{ color: 'var(--accent-blue)' }}>data/boards.json</code> and <code style={{ color: 'var(--accent-blue)' }}>data/subjects.json</code> directly — restart not required, just refresh the page.</li>
              <li>From a Subject detail page, <em>Move to Tasks</em> generates a new board where topics become tasks and contents become subtasks.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
