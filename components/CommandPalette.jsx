'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { Search, ArrowRight, LayoutDashboard, BookOpen, Kanban, Calendar, Flame, Target, Settings, BookText } from 'lucide-react';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const router = useRouter();
  const { boards, subjects, habits, goals, createBoard } = useApp();

  // Global Cmd+K listener
  useEffect(() => {
    const onKey = (e) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      if (((isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Build result list
  const sections = useMemo(() => {
    const lc = q.trim().toLowerCase();
    const navItems = [
      { id: 'nav-dash',    icon: <LayoutDashboard size={14} />, label: 'Dashboard',         href: '/' },
      { id: 'nav-today',   icon: <Calendar size={14} />,        label: 'Today',             href: '/today' },
      { id: 'nav-cal',     icon: <Calendar size={14} />,        label: 'Calendar',          href: '/calendar' },
      { id: 'nav-habits',  icon: <Flame size={14} />,           label: 'Habits',            href: '/habits' },
      { id: 'nav-goals',   icon: <Target size={14} />,          label: 'Goals',             href: '/goals' },
      { id: 'nav-queue',   icon: <BookText size={14} />,        label: 'Reading & Watch Queue', href: '/queue' },
      { id: 'nav-review',  icon: <BookOpen size={14} />,        label: 'Weekly Review',     href: '/review' },
      { id: 'nav-subs',    icon: <BookOpen size={14} />,        label: 'Subjects',          href: '/subjects' },
      { id: 'nav-settings',icon: <Settings size={14} />,        label: 'Settings & JSON',   href: '/settings' },
    ].filter(n => !lc || n.label.toLowerCase().includes(lc));

    const boardItems = (boards || [])
      .filter(b => !lc || b.name.toLowerCase().includes(lc))
      .map(b => ({ id: `b-${b.id}`, icon: <Kanban size={14} />, label: b.name, hint: 'Board', href: `/tasks/${b.id}` }));

    const taskItems = lc ? (boards || []).flatMap(b =>
      (b.tasks || [])
        .filter(t => t.title?.toLowerCase().includes(lc))
        .slice(0, 8)
        .map(t => ({ id: `t-${t.id}`, icon: <Kanban size={14} />, label: t.title, hint: b.name, href: `/tasks/${b.id}/${t.id}` }))
    ) : [];

    const subjectItems = (subjects || [])
      .filter(s => !lc || s.name.toLowerCase().includes(lc))
      .map(s => ({ id: `s-${s.id}`, icon: <span style={{ fontSize: 14 }}>{s.icon || '📚'}</span>, label: s.name, hint: 'Subject', href: `/subjects/${s.id}` }));

    const habitItems = (habits || [])
      .filter(h => !lc || h.name.toLowerCase().includes(lc))
      .slice(0, 5)
      .map(h => ({ id: `h-${h.id}`, icon: <span style={{ fontSize: 14 }}>{h.icon || '🔥'}</span>, label: h.name, hint: 'Habit', href: `/habits` }));

    const goalItems = (goals || [])
      .filter(g => !lc || g.name.toLowerCase().includes(lc))
      .slice(0, 5)
      .map(g => ({ id: `g-${g.id}`, icon: <span style={{ fontSize: 14 }}>{g.icon || '🎯'}</span>, label: g.name, hint: 'Goal', href: `/goals` }));

    const actionItems = lc.length >= 2
      ? [{ id: 'act-newboard', icon: <Kanban size={14} />, label: `Create new board "${q.trim()}"`, hint: 'Action', _action: 'newboard' }]
      : [];

    const out = [];
    if (actionItems.length) out.push({ label: 'Actions', items: actionItems });
    if (navItems.length)    out.push({ label: 'Go to', items: navItems });
    if (boardItems.length)  out.push({ label: 'Boards', items: boardItems });
    if (taskItems.length)   out.push({ label: 'Tasks', items: taskItems });
    if (subjectItems.length)out.push({ label: 'Subjects', items: subjectItems });
    if (habitItems.length)  out.push({ label: 'Habits', items: habitItems });
    if (goalItems.length)   out.push({ label: 'Goals', items: goalItems });
    return out;
  }, [q, boards, subjects, habits, goals]);

  const flatItems = useMemo(() => sections.flatMap(s => s.items), [sections]);

  useEffect(() => { setActiveIdx(0); }, [q]);

  const choose = async (item) => {
    if (item._action === 'newboard') {
      const board = await createBoard(q.trim());
      setOpen(false);
      router.push(`/tasks/${board.id}`);
      return;
    }
    setOpen(false);
    router.push(item.href);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(flatItems.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') {
      const item = flatItems[activeIdx];
      if (item) choose(item);
    }
  };

  if (!open) return null;
  let idx = -1;
  return (
    <div className="cmdk-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="cmdk-panel">
        <input
          ref={inputRef}
          className="cmdk-input"
          placeholder="Search or create…   (Ctrl/Cmd + K)"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="cmdk-list">
          {sections.length === 0 ? (
            <div className="cmdk-empty">Nothing matched. Try a different query, or type a name to create a board.</div>
          ) : sections.map(sec => (
            <div key={sec.label}>
              <div className="cmdk-section-label">{sec.label}</div>
              {sec.items.map(item => {
                idx++;
                const isActive = idx === activeIdx;
                const myIdx = idx;
                return (
                  <div
                    key={item.id}
                    className={`cmdk-item${isActive ? ' active' : ''}`}
                    onMouseEnter={() => setActiveIdx(myIdx)}
                    onClick={() => choose(item)}
                  >
                    {item.icon}
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                    {item.hint && <span className="cmdk-kbd">{item.hint}</span>}
                    <ArrowRight size={12} style={{ opacity: 0.4 }} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
