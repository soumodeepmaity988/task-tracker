// Storage backed by Turso (libSQL). Falls back to a local SQLite file when
// TURSO_DATABASE_URL is unset, so `npm run dev` keeps working offline.
//
// Schema is fully normalized (boards/sprints/tasks/subtasks/subjects/topics/
// contents/habits/habit_completions/goals/goal_tasks/journal). The exported
// helpers preserve the legacy "read all / write all" API used by the existing
// API routes, but internally we do hierarchical reads (3-4 queries per call)
// and transactional rewrites of just the affected entity tree.
//
// On first boot we run a one-time seed of `subjects`:
//   1. If a legacy `kv` row for `subjects` exists, migrate that.
//   2. Otherwise load from data/subjects.json on disk.
//   3. If neither, leave the table empty.

import { createClient } from '@libsql/client';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// ─── Connection ────────────────────────────────────────────────────────────
let _client = null;
function client() {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  // On serverless/production we MUST have Turso configured. The local-SQLite
  // fallback only works during `npm run dev` because Vercel's filesystem is
  // read-only at runtime.
  if (!url) {
    const isServerless = !!(process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
    if (isServerless || process.env.NODE_ENV === 'production') {
      throw new Error(
        'TURSO_DATABASE_URL is not set. Add it under Vercel → Settings → ' +
        'Environment Variables, then redeploy (uncheck "Use existing Build Cache").'
      );
    }
    // Local dev fallback — a SQLite file next to the project.
    _client = createClient({ url: 'file:./local.db', intMode: 'number' });
    return _client;
  }

  _client = createClient({ url, authToken, intMode: 'number' });
  return _client;
}

// ─── Schema ────────────────────────────────────────────────────────────────
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS migrations (
    name TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )`,
  // ── Boards / sprints / tasks / subtasks
  `CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    archived_at INTEGER
  )`,
  // NOTE: archived_at indexes are created inside the migration so they run
  // AFTER the ALTER TABLE that adds the column on legacy DBs.
  `CREATE TABLE IF NOT EXISTS sprints (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date INTEGER,
    end_date INTEGER,
    status TEXT NOT NULL DEFAULT 'active',
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    archived_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sprints_board ON sprints(board_id)`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    sprint_id TEXT REFERENCES sprints(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'todo',
    tags TEXT NOT NULL DEFAULT '[]',
    due_date INTEGER,
    recurring TEXT NOT NULL DEFAULT '',
    time_estimate INTEGER,
    time_spent INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER,
    source_subject_id TEXT,
    source_topic_id TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_board ON tasks(board_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON tasks(sprint_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date)`,
  `CREATE TABLE IF NOT EXISTS subtasks (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    video_url TEXT NOT NULL DEFAULT '',
    doc_url TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'not-started',
    source_content_id TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id)`,
  // ── Subjects / topics / contents
  `CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '📚',
    color TEXT NOT NULL DEFAULT '#4f8ef7',
    description TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id)`,
  `CREATE TABLE IF NOT EXISTS contents (
    id TEXT PRIMARY KEY,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT NOT NULL DEFAULT '',
    doc_url TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'not-started',
    notes TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_contents_topic ON contents(topic_id)`,
  // ── Habits + completions
  `CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '🔥',
    color TEXT NOT NULL DEFAULT '#22c55e',
    cadence TEXT NOT NULL DEFAULT 'daily',
    target INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS habit_completions (
    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    completed_on TEXT NOT NULL,
    PRIMARY KEY (habit_id, completed_on)
  )`,
  // ── Goals + linked tasks
  `CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '🎯',
    color TEXT NOT NULL DEFAULT '#4f8ef7',
    due_date INTEGER,
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS goal_tasks (
    goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,
    PRIMARY KEY (goal_id, task_id)
  )`,
  // ── Journal
  `CREATE TABLE IF NOT EXISTS journal (
    id TEXT PRIMARY KEY,
    week_of TEXT NOT NULL,
    did_well TEXT NOT NULL DEFAULT '',
    slipped TEXT NOT NULL DEFAULT '',
    next_week TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_journal_week ON journal(week_of)`,
];

// ─── Migrations for existing databases ─────────────────────────────────────
//
// Each migration's `run()` must be idempotent. ALTER TABLE ADD COLUMN errors
// on fresh DBs where the column already exists (created by SCHEMA); swallow
// those. Indexes use IF NOT EXISTS — but they must run AFTER the ALTER, so we
// keep them here rather than in SCHEMA.
const MIGRATIONS = [
  {
    name: 'add_archived_at_v1',
    run: async () => {
      const tryExec = async (sql) => {
        try {
          await client().execute(sql);
          console.log('[migration]   ✓', sql);
        } catch (e) {
          console.log('[migration]   – skip', sql, '→', e?.message || e);
        }
      };
      await tryExec('ALTER TABLE boards  ADD COLUMN archived_at INTEGER');
      await tryExec('ALTER TABLE sprints ADD COLUMN archived_at INTEGER');
      await tryExec('CREATE INDEX IF NOT EXISTS idx_boards_archived  ON boards(archived_at)');
      await tryExec('CREATE INDEX IF NOT EXISTS idx_sprints_archived ON sprints(archived_at)');
    },
  },
];

async function applyMigrations() {
  for (const m of MIGRATIONS) {
    if (await isMigrationApplied(m.name)) continue;
    console.log('[migration] applying', m.name);
    await m.run();
    await markMigrationApplied(m.name);
    console.log('[migration] ✓', m.name);
  }
}

let _schemaReady = null;
async function ensureSchema() {
  if (_schemaReady) return _schemaReady;
  const p = (async () => {
    try {
      for (const stmt of SCHEMA) await client().execute(stmt);
      await applyMigrations();
      await maybeSeedSubjects();
    } catch (e) {
      _schemaReady = null; // allow retry on next call
      throw e;
    }
  })();
  _schemaReady = p;
  return p;
}

// ─── Seed subjects (once) ──────────────────────────────────────────────────
async function isMigrationApplied(name) {
  const res = await client().execute({
    sql: 'SELECT 1 FROM migrations WHERE name = ? LIMIT 1',
    args: [name],
  });
  return res.rows.length > 0;
}
async function markMigrationApplied(name) {
  await client().execute({
    sql: 'INSERT OR IGNORE INTO migrations (name, applied_at) VALUES (?, ?)',
    args: [name, Date.now()],
  });
}

async function maybeSeedSubjects() {
  const MIG = 'subjects_seeded_v1';
  if (await isMigrationApplied(MIG)) return;

  // 1) Try to migrate from legacy kv blob (previous storage scheme)
  let subjects = null;
  try {
    const res = await client().execute({
      sql: "SELECT data FROM kv WHERE key = 'subjects'",
    });
    if (res.rows.length > 0) {
      const parsed = JSON.parse(res.rows[0].data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        subjects = parsed;
        console.log(`[fileStore] Migrating ${subjects.length} subject(s) from legacy kv table…`);
      }
    }
  } catch {
    // kv table doesn't exist — fine, fall through
  }

  // 2) Fall back to bundled seed file
  if (!subjects) {
    const seedPath = path.join(process.cwd(), 'data', 'subjects.json');
    if (existsSync(seedPath)) {
      try {
        const raw = readFileSync(seedPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          subjects = parsed;
          console.log(`[fileStore] Seeding ${subjects.length} subject(s) from data/subjects.json…`);
        }
      } catch (e) {
        console.error('[fileStore] Failed to parse data/subjects.json:', e.message);
      }
    }
  }

  if (subjects && subjects.length > 0) {
    await writeSubjects(subjects, /* skipSchemaCheck */ true);
  }
  await markMigrationApplied(MIG);
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const nz = (v) => (v === undefined || v === null ? null : v);
const def = (v, fallback) => (v === undefined || v === null ? fallback : v);

// ─── Boards ────────────────────────────────────────────────────────────────
export async function readBoards() {
  await ensureSchema();
  const [bRes, spRes, tRes, stRes] = await Promise.all([
    client().execute('SELECT * FROM boards ORDER BY created_at'),
    client().execute('SELECT * FROM sprints ORDER BY position, created_at'),
    client().execute('SELECT * FROM tasks ORDER BY position, created_at'),
    client().execute('SELECT * FROM subtasks ORDER BY position, created_at'),
  ]);
  const sprintsByB = groupBy(spRes.rows, 'board_id');
  const tasksByB = groupBy(tRes.rows, 'board_id');
  const subtasksByT = groupBy(stRes.rows, 'task_id');
  return bRes.rows.map((b) => ({
    id: b.id,
    name: b.name,
    createdAt: b.created_at,
    archivedAt: b.archived_at,
    sprints: (sprintsByB[b.id] || []).map((s) => ({
      id: s.id,
      name: s.name,
      startDate: s.start_date,
      endDate: s.end_date,
      status: s.status,
      createdAt: s.created_at,
      archivedAt: s.archived_at,
    })),
    tasks: (tasksByB[b.id] || []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      tags: safeParse(t.tags, []),
      sprintId: t.sprint_id,
      dueDate: t.due_date,
      recurring: t.recurring || '',
      timeEstimate: t.time_estimate,
      timeSpent: t.time_spent,
      completedAt: t.completed_at,
      sourceRef: t.source_subject_id
        ? { subjectId: t.source_subject_id, topicId: t.source_topic_id }
        : undefined,
      createdAt: t.created_at,
      subtasks: (subtasksByT[t.id] || []).map((st) => ({
        id: st.id,
        title: st.title,
        notes: st.notes,
        videoUrl: st.video_url,
        docUrl: st.doc_url,
        priority: st.priority,
        status: st.status,
        sourceContentId: st.source_content_id || undefined,
        createdAt: st.created_at,
      })),
    })),
  }));
}

export async function writeBoards(boards) {
  await ensureSchema();
  const stmts = [{ sql: 'DELETE FROM boards', args: [] }];
  for (const b of boards) {
    stmts.push({
      sql: 'INSERT INTO boards (id, name, created_at, archived_at) VALUES (?, ?, ?, ?)',
      args: [b.id, b.name, def(b.createdAt, Date.now()), nz(b.archivedAt)],
    });
    // sprints first so tasks can FK
    (b.sprints || []).forEach((s, i) => {
      stmts.push({
        sql: `INSERT INTO sprints (id, board_id, name, start_date, end_date, status, position, created_at, archived_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          s.id, b.id, s.name,
          nz(s.startDate), nz(s.endDate),
          def(s.status, 'active'), i, def(s.createdAt, Date.now()),
          nz(s.archivedAt),
        ],
      });
    });
    (b.tasks || []).forEach((t, i) => {
      stmts.push({
        sql: `INSERT INTO tasks
          (id, board_id, sprint_id, title, description, priority, status, tags,
           due_date, recurring, time_estimate, time_spent, completed_at,
           source_subject_id, source_topic_id, position, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          t.id, b.id, nz(t.sprintId),
          t.title, def(t.description, ''),
          def(t.priority, 'medium'), def(t.status, 'todo'),
          JSON.stringify(t.tags || []),
          nz(t.dueDate), def(t.recurring, ''),
          nz(t.timeEstimate), def(t.timeSpent, 0), nz(t.completedAt),
          nz(t.sourceRef?.subjectId), nz(t.sourceRef?.topicId),
          i, def(t.createdAt, Date.now()),
        ],
      });
      (t.subtasks || []).forEach((st, j) => {
        stmts.push({
          sql: `INSERT INTO subtasks
            (id, task_id, title, notes, video_url, doc_url, priority, status,
             source_content_id, position, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            st.id, t.id, st.title, def(st.notes, ''),
            def(st.videoUrl, ''), def(st.docUrl, ''),
            def(st.priority, 'medium'), def(st.status, 'not-started'),
            nz(st.sourceContentId), j, def(st.createdAt, Date.now()),
          ],
        });
      });
    });
  }
  await client().batch(stmts, 'write');
}

// ─── Subjects ──────────────────────────────────────────────────────────────
export async function readSubjects() {
  await ensureSchema();
  const [sRes, tRes, cRes] = await Promise.all([
    client().execute('SELECT * FROM subjects ORDER BY created_at'),
    client().execute('SELECT * FROM topics ORDER BY position'),
    client().execute('SELECT * FROM contents ORDER BY position'),
  ]);
  const topicsByS = groupBy(tRes.rows, 'subject_id');
  const contentsByT = groupBy(cRes.rows, 'topic_id');
  return sRes.rows.map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    color: s.color,
    description: s.description,
    createdAt: s.created_at,
    topics: (topicsByS[s.id] || []).map((t) => ({
      id: t.id,
      title: t.title,
      contents: (contentsByT[t.id] || []).map((c) => ({
        id: c.id,
        title: c.title,
        videoUrl: c.video_url,
        docUrl: c.doc_url,
        priority: c.priority,
        status: c.status,
        notes: c.notes,
        createdAt: c.created_at,
      })),
    })),
  }));
}

export async function writeSubjects(subjects, skipSchemaCheck = false) {
  if (!skipSchemaCheck) await ensureSchema();
  const stmts = [{ sql: 'DELETE FROM subjects', args: [] }];
  for (const s of subjects) {
    stmts.push({
      sql: `INSERT INTO subjects (id, name, icon, color, description, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        s.id, s.name, def(s.icon, '📚'), def(s.color, '#4f8ef7'),
        def(s.description, ''), def(s.createdAt, Date.now()),
      ],
    });
    (s.topics || []).forEach((t, i) => {
      stmts.push({
        sql: 'INSERT INTO topics (id, subject_id, title, position) VALUES (?, ?, ?, ?)',
        args: [t.id, s.id, t.title, i],
      });
      (t.contents || []).forEach((c, j) => {
        stmts.push({
          sql: `INSERT INTO contents
            (id, topic_id, title, video_url, doc_url, priority, status, notes, position, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            c.id, t.id, c.title,
            def(c.videoUrl, ''), def(c.docUrl, ''),
            def(c.priority, 'medium'), def(c.status, 'not-started'),
            def(c.notes, ''), j, def(c.createdAt, Date.now()),
          ],
        });
      });
    });
  }
  await client().batch(stmts, 'write');
}

// ─── Habits ────────────────────────────────────────────────────────────────
export async function readHabits() {
  await ensureSchema();
  const [hRes, cRes] = await Promise.all([
    client().execute('SELECT * FROM habits ORDER BY created_at'),
    client().execute('SELECT habit_id, completed_on FROM habit_completions'),
  ]);
  const compByH = {};
  for (const row of cRes.rows) (compByH[row.habit_id] ||= []).push(row.completed_on);
  return hRes.rows.map((h) => ({
    id: h.id,
    name: h.name,
    icon: h.icon,
    color: h.color,
    cadence: h.cadence,
    target: h.target,
    createdAt: h.created_at,
    completions: compByH[h.id] || [],
  }));
}

export async function writeHabits(habits) {
  await ensureSchema();
  const stmts = [{ sql: 'DELETE FROM habits', args: [] }];
  for (const h of habits) {
    stmts.push({
      sql: `INSERT INTO habits (id, name, icon, color, cadence, target, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        h.id, h.name, def(h.icon, '🔥'), def(h.color, '#22c55e'),
        def(h.cadence, 'daily'), def(h.target, 1), def(h.createdAt, Date.now()),
      ],
    });
    for (const date of h.completions || []) {
      stmts.push({
        sql: 'INSERT INTO habit_completions (habit_id, completed_on) VALUES (?, ?)',
        args: [h.id, date],
      });
    }
  }
  await client().batch(stmts, 'write');
}

// ─── Goals ─────────────────────────────────────────────────────────────────
export async function readGoals() {
  await ensureSchema();
  const [gRes, lRes] = await Promise.all([
    client().execute('SELECT * FROM goals ORDER BY created_at'),
    client().execute('SELECT goal_id, task_id FROM goal_tasks'),
  ]);
  const linksByG = {};
  for (const row of lRes.rows) (linksByG[row.goal_id] ||= []).push(row.task_id);
  return gRes.rows.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    icon: g.icon,
    color: g.color,
    dueDate: g.due_date,
    status: g.status,
    createdAt: g.created_at,
    linkedTaskIds: linksByG[g.id] || [],
  }));
}

export async function writeGoals(goals) {
  await ensureSchema();
  const stmts = [{ sql: 'DELETE FROM goals', args: [] }];
  for (const g of goals) {
    stmts.push({
      sql: `INSERT INTO goals (id, name, description, icon, color, due_date, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        g.id, g.name, def(g.description, ''), def(g.icon, '🎯'),
        def(g.color, '#4f8ef7'), nz(g.dueDate), def(g.status, 'active'),
        def(g.createdAt, Date.now()),
      ],
    });
    for (const tid of g.linkedTaskIds || []) {
      stmts.push({
        sql: 'INSERT INTO goal_tasks (goal_id, task_id) VALUES (?, ?)',
        args: [g.id, tid],
      });
    }
  }
  await client().batch(stmts, 'write');
}

// ─── Journal ───────────────────────────────────────────────────────────────
export async function readJournal() {
  await ensureSchema();
  const res = await client().execute('SELECT * FROM journal ORDER BY week_of');
  return res.rows.map((j) => ({
    id: j.id,
    weekOf: j.week_of,
    didWell: j.did_well,
    slipped: j.slipped,
    nextWeek: j.next_week,
    notes: j.notes,
    createdAt: j.created_at,
  }));
}

export async function writeJournal(entries) {
  await ensureSchema();
  const stmts = [{ sql: 'DELETE FROM journal', args: [] }];
  for (const e of entries) {
    stmts.push({
      sql: `INSERT INTO journal (id, week_of, did_well, slipped, next_week, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        e.id, e.weekOf, def(e.didWell, ''), def(e.slipped, ''),
        def(e.nextWeek, ''), def(e.notes, ''), def(e.createdAt, Date.now()),
      ],
    });
  }
  await client().batch(stmts, 'write');
}

// ─── Utils ─────────────────────────────────────────────────────────────────
function groupBy(rows, key) {
  const out = {};
  for (const row of rows) (out[row[key]] ||= []).push(row);
  return out;
}
function safeParse(json, fallback) {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
