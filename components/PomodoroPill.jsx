'use client';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { Pause, Play, Square } from 'lucide-react';
import Link from 'next/link';

export default function PomodoroPill() {
  const { session, stop, now } = usePomodoro();
  if (!session) return null;
  const remaining = Math.max(0, session.endsAt - now);
  const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
  return (
    <div className={`pomo-pill running`}>
      <span style={{ fontSize: 14 }}>{session.mode === 'focus' ? '🍅' : '☕'}</span>
      <span className="pomo-time">{mm}:{ss}</span>
      <Link
        href={`/tasks/${session.boardId}/${session.taskId}`}
        style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}
        title={session.taskTitle}
      >
        {session.taskTitle}
      </Link>
      <button
        onClick={() => stop(true)}
        title="Stop & log time"
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}
      >
        <Square size={13} />
      </button>
    </div>
  );
}
