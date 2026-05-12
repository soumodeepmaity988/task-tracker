'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Plus, Pencil, Trash2, Check, X, LayoutDashboard, BookOpen, Kanban, Settings, ChevronDown, ChevronRight, Calendar, CheckCircle2, Flame, Target, BookText, Moon, Sun, CalendarDays, Archive } from 'lucide-react';

const DAY_MS = 86400000;

function ThemeToggle() {
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    const saved = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme');
    setTheme(saved === 'light' ? 'light' : 'dark');
  }, []);
  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    if (next === 'dark') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', 'light');
    try { localStorage.setItem('tf:theme', next); } catch {}
  };
  return (
    <button onClick={toggle} className="sidebar-link" style={{ cursor: 'pointer' }} title="Toggle theme">
      {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
      {theme === 'light' ? 'Dark mode' : 'Light mode'}
    </button>
  );
}

function fmtShortDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function RenameInput({ value, onSave, onCancel }) {
  const [val, setVal] = useState(value);
  return (
    <form
      onSubmit={e => { e.preventDefault(); if (val.trim()) onSave(val.trim()); }}
      style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}
    >
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Escape' && onCancel()}
        style={{
          flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--accent-blue)',
          color: 'var(--text-primary)', borderRadius: 6, padding: '3px 7px',
          fontSize: 12, outline: 'none', minWidth: 0,
        }}
      />
      <button type="submit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-green)', padding: 2 }}>
        <Check size={13} />
      </button>
      <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
        <X size={13} />
      </button>
    </form>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSprintId = searchParams.get('sprint') || null;
  const { boards, subjects, createBoard, updateBoard, deleteBoard, createSubject, updateSubject, deleteSubject } = useApp();

  const [renamingBoard, setRenamingBoard] = useState(null);
  const [renamingSubject, setRenamingSubject] = useState(null);

  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const newBoardRef = useRef(null);

  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const newSubjectRef = useRef(null);

  // Expanded boards (showing nested sprints)
  const [expandedBoards, setExpandedBoards] = useState({});
  const [addingSprintTo, setAddingSprintTo] = useState(null); // boardId
  const [newSprintName, setNewSprintName] = useState('');
  const newSprintRef = useRef(null);

  // Auto-expand the board the user is currently viewing
  useEffect(() => {
    const m = pathname.match(/^\/tasks\/([^/]+)/);
    if (m) setExpandedBoards(prev => prev[m[1]] ? prev : { ...prev, [m[1]]: true });
  }, [pathname]);

  const toggleExpand = (boardId, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setExpandedBoards(prev => ({ ...prev, [boardId]: !prev[boardId] }));
  };

  const beginAddSprint = (boardId, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setExpandedBoards(prev => ({ ...prev, [boardId]: true }));
    setAddingSprintTo(boardId);
    setNewSprintName('');
    setTimeout(() => newSprintRef.current?.focus(), 50);
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    const name = newSprintName.trim();
    const boardId = addingSprintTo;
    if (!name || !boardId) return;
    const board = boards.find(b => b.id === boardId);
    if (!board) return;
    const existing = board.sprints || [];
    const lastEnd = existing.length > 0 ? Math.max(...existing.map(s => s.endDate || 0)) : 0;
    const start = lastEnd ? lastEnd + DAY_MS : Date.now();
    const sprint = {
      id: `sp-${Date.now()}`,
      name,
      startDate: start,
      endDate: start + 6 * DAY_MS,
      status: 'active',
      createdAt: Date.now(),
    };
    const patch = { sprints: [...existing, sprint] };
    await updateBoard(boardId, patch);
    setAddingSprintTo(null);
    setNewSprintName('');
    router.push(`/tasks/${boardId}?sprint=${sprint.id}`);
  };

  const handleArchiveBoard = async (id, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    await updateBoard(id, { archivedAt: Date.now() });
    if (pathname === `/tasks/${id}`) router.push('/');
  };

  const handleArchiveSprint = async (boardId, sprintId, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const board = boards.find(b => b.id === boardId);
    if (!board) return;
    const sprints = (board.sprints || []).map(s =>
      s.id === sprintId ? { ...s, archivedAt: Date.now() } : s
    );
    await updateBoard(boardId, { sprints });
    if (pathname === `/tasks/${boardId}` && activeSprintId === sprintId) {
      router.replace(`/tasks/${boardId}`);
    }
  };

  const handleDeleteSprint = async (boardId, sprintId, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const board = boards.find(b => b.id === boardId);
    if (!board) return;
    const sprints = (board.sprints || []).filter(s => s.id !== sprintId);
    // Unschedule tasks that were in this sprint
    const tasks = (board.tasks || []).map(t => t.sprintId === sprintId ? { ...t, sprintId: null } : t);
    await updateBoard(boardId, { sprints, tasks });
    if (pathname === `/tasks/${boardId}` && activeSprintId === sprintId) {
      router.replace(`/tasks/${boardId}`);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    if (!newBoardName.trim()) return;
    const board = await createBoard(newBoardName.trim());
    setNewBoardName('');
    setAddingBoard(false);
    router.push(`/tasks/${board.id}`);
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    const subject = await createSubject({ name: newSubjectName.trim() });
    setNewSubjectName('');
    setAddingSubject(false);
    router.push(`/subjects/${subject.id}`);
  };

  const handleRenameBoard = async (id, name) => {
    await updateBoard(id, { name });
    setRenamingBoard(null);
  };

  const handleDeleteBoard = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteBoard(id);
    if (pathname === `/tasks/${id}`) router.push('/');
  };

  const handleRenameSubject = async (id, name) => {
    await updateSubject(id, { name });
    setRenamingSubject(null);
  };

  const handleDeleteSubject = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteSubject(id);
    if (pathname.startsWith(`/subjects/${id}`)) router.push('/subjects');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🚀</div>
        <div>
          <div className="sidebar-logo-text">TaskFlow</div>
          <div className="sidebar-logo-sub">Personal Workspace</div>
        </div>
      </div>

      {/* Main nav */}
      <div style={{ padding: '0 10px', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Link href="/" className={`sidebar-link${pathname === '/' ? ' active' : ''}`}>
          <LayoutDashboard size={15} /> Dashboard
        </Link>
        <Link href="/today" className={`sidebar-link${pathname === '/today' ? ' active' : ''}`}>
          <Calendar size={15} /> Today
        </Link>
        <Link href="/calendar" className={`sidebar-link${pathname === '/calendar' ? ' active' : ''}`}>
          <CalendarDays size={15} /> Calendar
        </Link>
        <Link href="/habits" className={`sidebar-link${pathname === '/habits' ? ' active' : ''}`}>
          <Flame size={15} /> Habits
        </Link>
        <Link href="/goals" className={`sidebar-link${pathname === '/goals' ? ' active' : ''}`}>
          <Target size={15} /> Goals
        </Link>
        <Link href="/review" className={`sidebar-link${pathname === '/review' ? ' active' : ''}`}>
          <BookOpen size={15} /> Weekly Review
        </Link>
        <Link href="/archive" className={`sidebar-link${pathname === '/archive' ? ' active' : ''}`}>
          <Archive size={15} /> Archive
        </Link>
      </div>

      <div className="divider" style={{ margin: '4px 0' }} />

      {/* Task Boards */}
      <div style={{ padding: '10px 20px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="sidebar-section-label" style={{ padding: 0 }}>Task Boards</span>
          <button
            onClick={() => { setAddingBoard(true); setTimeout(() => newBoardRef.current?.focus(), 50); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center' }}
            title="New board"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <nav className="sidebar-nav" style={{ padding: '0 10px' }}>
        {boards.filter(b => !b.archivedAt).map(board => {
          const onBoardPage = pathname === `/tasks/${board.id}`;
          const active = onBoardPage && !activeSprintId;
          const expanded = !!expandedBoards[board.id];
          const sprints = (board.sprints || []).filter(s => !s.archivedAt);
          return (
            <div key={board.id} style={{ position: 'relative' }}>
              <div className="sidebar-item-wrap" style={{ position: 'relative' }}>
                {renamingBoard === board.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', gap: 6 }}>
                    <Kanban size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <RenameInput
                      value={board.name}
                      onSave={name => handleRenameBoard(board.id, name)}
                      onCancel={() => setRenamingBoard(null)}
                    />
                  </div>
                ) : (
                  <Link href={`/tasks/${board.id}`} className={`sidebar-link${active ? ' active' : ''}`}>
                    <button
                      onClick={(e) => toggleExpand(board.id, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex', alignItems: 'center', marginRight: -2 }}
                      title={expanded ? 'Collapse' : 'Expand'}
                    >
                      {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                    <Kanban size={14} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{board.name}</span>
                    <span className="sidebar-item-actions">
                      <button
                        onClick={(e) => beginAddSprint(board.id, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 3, display: 'flex' }}
                        title="New sprint"
                      ><Plus size={11} /></button>
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setRenamingBoard(board.id); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 3, display: 'flex' }}
                        title="Rename"
                      ><Pencil size={11} /></button>
                      <button
                        onClick={(e) => handleArchiveBoard(board.id, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 3, display: 'flex' }}
                        title="Archive (hides from main UI, keeps in history)"
                      ><Archive size={11} /></button>
                      <button
                        onClick={e => handleDeleteBoard(board.id, e)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 3, display: 'flex' }}
                        title="Delete (permanent — removes from charts)"
                      ><Trash2 size={11} /></button>
                    </span>
                  </Link>
                )}
              </div>

              {/* Nested sprints */}
              {expanded && (
                <div style={{ paddingLeft: 18, marginTop: 1, marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {sprints.length === 0 && addingSprintTo !== board.id && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 12px', fontStyle: 'italic' }}>
                      No sprints yet
                    </div>
                  )}
                  {sprints.map(sp => {
                    const isActive = onBoardPage && activeSprintId === sp.id;
                    const completed = sp.status === 'completed';
                    return (
                      <div key={sp.id} className="sidebar-item-wrap" style={{ position: 'relative' }}>
                        <Link
                          href={`/tasks/${board.id}?sprint=${sp.id}`}
                          className={`sidebar-link${isActive ? ' active' : ''}`}
                          style={{
                            padding: '5px 10px', fontSize: 12,
                            color: completed ? 'var(--text-muted)' : undefined,
                            opacity: completed ? 0.75 : 1,
                          }}
                        >
                          {completed ? <CheckCircle2 size={11} color="var(--accent-green)" /> : <Calendar size={11} />}
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: completed ? 'line-through' : 'none' }}>
                            {sp.name}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {fmtShortDate(sp.startDate)}–{fmtShortDate(sp.endDate)}
                          </span>
                          <span className="sidebar-item-actions">
                            <button
                              onClick={(e) => handleArchiveSprint(board.id, sp.id, e)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 3, display: 'flex' }}
                              title="Archive sprint"
                            ><Archive size={10} /></button>
                            <button
                              onClick={(e) => handleDeleteSprint(board.id, sp.id, e)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 3, display: 'flex' }}
                              title="Delete sprint (permanent)"
                            ><Trash2 size={10} /></button>
                          </span>
                        </Link>
                      </div>
                    );
                  })}

                  {addingSprintTo === board.id ? (
                    <form onSubmit={handleCreateSprint} style={{ padding: '4px 10px' }}>
                      <input
                        ref={newSprintRef}
                        autoFocus
                        value={newSprintName}
                        onChange={e => setNewSprintName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Escape') { setAddingSprintTo(null); setNewSprintName(''); } }}
                        placeholder={`Sprint ${sprints.length + 1}…`}
                        style={{
                          width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--accent-blue)',
                          color: 'var(--text-primary)', borderRadius: 6, padding: '4px 8px',
                          fontSize: 11, outline: 'none',
                        }}
                      />
                    </form>
                  ) : (
                    <button
                      onClick={(e) => beginAddSprint(board.id, e)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 10px', background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', fontSize: 11, borderRadius: 6,
                        textAlign: 'left', width: '100%',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-blue)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Plus size={11} /> New Sprint
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {addingBoard && (
          <form onSubmit={handleCreateBoard} style={{ padding: '4px 10px' }}>
            <input
              ref={newBoardRef}
              autoFocus
              value={newBoardName}
              onChange={e => setNewBoardName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setAddingBoard(false); setNewBoardName(''); } }}
              placeholder="Board name…"
              style={{
                width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--accent-blue)',
                color: 'var(--text-primary)', borderRadius: 6, padding: '5px 9px',
                fontSize: 12, outline: 'none',
              }}
            />
          </form>
        )}
      </nav>

      <div className="divider" style={{ margin: '4px 0' }} />

      {/* Subjects */}
      <div style={{ padding: '10px 20px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="sidebar-section-label" style={{ padding: 0 }}>Subjects</span>
          <button
            onClick={() => { setAddingSubject(true); setTimeout(() => newSubjectRef.current?.focus(), 50); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center' }}
            title="New subject"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <nav className="sidebar-nav" style={{ padding: '0 10px' }}>
        <Link href="/subjects" className={`sidebar-link${pathname === '/subjects' ? ' active' : ''}`}>
          <BookOpen size={14} />
          <span>All Subjects</span>
        </Link>
        {subjects.map(s => {
          const active = pathname === `/subjects/${s.id}`;
          return (
            <div key={s.id} className="sidebar-item-wrap">
              {renamingSubject === s.id ? (
                <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', gap: 6 }}>
                  <span style={{ fontSize: 13 }}>{s.icon}</span>
                  <RenameInput
                    value={s.name}
                    onSave={name => handleRenameSubject(s.id, name)}
                    onCancel={() => setRenamingSubject(null)}
                  />
                </div>
              ) : (
                <Link href={`/subjects/${s.id}`} className={`sidebar-link${active ? ' active' : ''}`}>
                  <span style={{ fontSize: 13 }}>{s.icon}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <span className="sidebar-item-actions">
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setRenamingSubject(s.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 3, display: 'flex' }}
                      title="Rename"
                    ><Pencil size={11} /></button>
                    <button
                      onClick={e => handleDeleteSubject(s.id, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 3, display: 'flex' }}
                      title="Delete"
                    ><Trash2 size={11} /></button>
                  </span>
                </Link>
              )}
            </div>
          );
        })}

        {addingSubject && (
          <form onSubmit={handleCreateSubject} style={{ padding: '4px 10px' }}>
            <input
              ref={newSubjectRef}
              autoFocus
              value={newSubjectName}
              onChange={e => setNewSubjectName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setAddingSubject(false); setNewSubjectName(''); } }}
              placeholder="Subject name…"
              style={{
                width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--accent-blue)',
                color: 'var(--text-primary)', borderRadius: 6, padding: '5px 9px',
                fontSize: 12, outline: 'none',
              }}
            />
          </form>
        )}
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <div className="divider" style={{ margin: '4px 0' }} />
        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <ThemeToggle />
          <Link href="/settings" className={`sidebar-link${pathname === '/settings' ? ' active' : ''}`}>
            <Settings size={15} /> Settings & JSON
          </Link>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>TaskFlow v2.0 · File Storage</div>
        </div>
      </div>
    </aside>
  );
}
