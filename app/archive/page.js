'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { Archive, RotateCcw, Kanban, Calendar, Trash2 } from 'lucide-react';
import { fmtRange, fmtDateShort } from '@/lib/dateUtils';

export default function ArchivePage() {
  const { boards, updateBoard, deleteBoard } = useApp();

  const archivedBoards = useMemo(
    () => boards.filter(b => b.archivedAt).sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0)),
    [boards]
  );

  // Sprints archived inside currently-active boards
  const archivedSprints = useMemo(() => {
    const out = [];
    boards.filter(b => !b.archivedAt).forEach(b => {
      (b.sprints || []).filter(s => s.archivedAt).forEach(s => {
        const sprintTaskCount = (b.tasks || []).filter(t => t.sprintId === s.id).length;
        const sprintDone = (b.tasks || []).filter(t => t.sprintId === s.id && t.status === 'done').length;
        out.push({ ...s, _board: b, _total: sprintTaskCount, _done: sprintDone });
      });
    });
    return out.sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
  }, [boards]);

  const restoreBoard = (id) => updateBoard(id, { archivedAt: null });

  const restoreSprint = (boardId, sprintId) => {
    const b = boards.find(x => x.id === boardId);
    if (!b) return;
    const sprints = (b.sprints || []).map(s =>
      s.id === sprintId ? { ...s, archivedAt: null } : s
    );
    updateBoard(boardId, { sprints });
  };

  const deleteSprintPermanently = (boardId, sprintId) => {
    if (!confirm('Permanently delete this sprint? Tasks will be unscheduled.')) return;
    const b = boards.find(x => x.id === boardId);
    if (!b) return;
    const sprints = (b.sprints || []).filter(s => s.id !== sprintId);
    const tasks = (b.tasks || []).map(t => t.sprintId === sprintId ? { ...t, sprintId: null } : t);
    updateBoard(boardId, { sprints, tasks });
  };

  const empty = archivedBoards.length === 0 && archivedSprints.length === 0;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-inner" style={{ maxWidth: 1000 }}>
          <div className="page-header">
            <h1 className="page-title"><Archive size={20} style={{ display: 'inline', marginRight: 8 }} /> Archive</h1>
            <p className="page-subtitle">
              Boards and sprints you archived. They're hidden from the sidebar and main views,
              but their data still feeds the dashboard charts and activity heatmap.
            </p>
          </div>

          {empty && (
            <div className="empty-state">
              <div className="empty-state-icon">📦</div>
              <h3>Nothing archived</h3>
              <p>Archive a board or sprint from its hover menu to clean up the sidebar without losing history.</p>
            </div>
          )}

          {/* Archived boards */}
          {archivedBoards.length > 0 && (
            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>
                <Kanban size={14} style={{ display: 'inline', marginRight: 6, color: 'var(--accent-blue)' }} />
                Archived boards ({archivedBoards.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {archivedBoards.map(b => {
                  const total = (b.tasks || []).length;
                  const done = (b.tasks || []).filter(t => t.status === 'done').length;
                  return (
                    <div key={b.id} className="glass-card" style={{ padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <Kanban size={16} color="var(--text-muted)" />
                        <span style={{ fontWeight: 600, fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                        Archived {fmtDateShort(b.archivedAt)} · {done}/{total} tasks done
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: 11, flex: 1 }}
                          onClick={() => restoreBoard(b.id)}
                          title="Move back to the active list"
                        >
                          <RotateCcw size={12} /> Restore
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 11, color: 'var(--accent-red)' }}
                          onClick={() => {
                            if (confirm(`Permanently delete "${b.name}"? This removes its tasks from charts forever.`)) {
                              deleteBoard(b.id);
                            }
                          }}
                          title="Permanent delete (loses history)"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Archived sprints */}
          {archivedSprints.length > 0 && (
            <section>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>
                <Calendar size={14} style={{ display: 'inline', marginRight: 6, color: 'var(--accent-blue)' }} />
                Archived sprints ({archivedSprints.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {archivedSprints.map(s => (
                  <div
                    key={s.id}
                    className="glass-card"
                    style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8, fontWeight: 400 }}>
                          · {s._done}/{s._total} done · {fmtRange(s.startDate, s.endDate)}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        in <Link href={`/tasks/${s._board.id}`} style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>{s._board.name}</Link>
                        {' · '}archived {fmtDateShort(s.archivedAt)}
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: 11 }}
                      onClick={() => restoreSprint(s._board.id, s.id)}
                    >
                      <RotateCcw size={12} /> Restore
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, color: 'var(--accent-red)' }}
                      onClick={() => deleteSprintPermanently(s._board.id, s.id)}
                      title="Permanently delete this sprint"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
