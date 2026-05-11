'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Plus, Pencil, Trash2, Check, X, LayoutDashboard, BookOpen, Kanban } from 'lucide-react';

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
  const { boards, subjects, createBoard, updateBoard, deleteBoard, createSubject, updateSubject, deleteSubject } = useApp();

  const [renamingBoard, setRenamingBoard] = useState(null);
  const [renamingSubject, setRenamingSubject] = useState(null);

  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const newBoardRef = useRef(null);

  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const newSubjectRef = useRef(null);

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
      <div style={{ padding: '0 10px', marginBottom: 8 }}>
        <Link href="/" className={`sidebar-link${pathname === '/' ? ' active' : ''}`}>
          <LayoutDashboard size={15} /> Dashboard
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
        {boards.map(board => {
          const active = pathname === `/tasks/${board.id}`;
          return (
            <div key={board.id} style={{ position: 'relative' }} className="sidebar-item-wrap">
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
                  <Kanban size={14} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{board.name}</span>
                  <span className="sidebar-item-actions">
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setRenamingBoard(board.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 3, display: 'flex' }}
                      title="Rename"
                    ><Pencil size={11} /></button>
                    <button
                      onClick={e => handleDeleteBoard(board.id, e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, borderRadius: 3, display: 'flex' }}
                      title="Delete"
                    ><Trash2 size={11} /></button>
                  </span>
                </Link>
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

      <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>TaskFlow v2.0 · File Storage</div>
      </div>
    </aside>
  );
}
