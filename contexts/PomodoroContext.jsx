'use client';
import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const PomodoroContext = createContext(null);

const FOCUS_MIN = 25;
const BREAK_MIN = 5;

export function PomodoroProvider({ children }) {
  // session: { taskId, boardId, taskTitle, mode: 'focus' | 'break', endsAt }
  const [session, setSession] = useState(null);
  const [now, setNow] = useState(Date.now());
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // When focus timer ends, log time onto the task and switch to break
  useEffect(() => {
    if (!session) return;
    if (now < session.endsAt) return;
    if (session.mode === 'focus') {
      // Add 25 min to task.timeSpent
      logTimeToTask(session.boardId, session.taskId, FOCUS_MIN);
      setSession({
        ...session,
        mode: 'break',
        endsAt: Date.now() + BREAK_MIN * 60000,
      });
      try { new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=').play().catch(() => {}); } catch {}
    } else {
      // Break over — end session
      setSession(null);
    }
  }, [now, session]);

  const start = useCallback((task, board) => {
    setSession({
      taskId: task.id,
      boardId: board.id,
      taskTitle: task.title,
      mode: 'focus',
      endsAt: Date.now() + FOCUS_MIN * 60000,
    });
  }, []);

  const stop = useCallback((logPartial = true) => {
    if (session && session.mode === 'focus' && logPartial) {
      const elapsedMs = (FOCUS_MIN * 60000) - (session.endsAt - Date.now());
      const minutes = Math.max(0, Math.round(elapsedMs / 60000));
      if (minutes > 0) logTimeToTask(session.boardId, session.taskId, minutes);
    }
    setSession(null);
  }, [session]);

  return (
    <PomodoroContext.Provider value={{ session, start, stop, now, FOCUS_MIN, BREAK_MIN }}>
      {children}
    </PomodoroContext.Provider>
  );
}

async function logTimeToTask(boardId, taskId, minutes) {
  try {
    const res = await fetch(`/api/boards/${boardId}`);
    if (!res.ok) return;
    const board = await res.json();
    const tasks = (board.tasks || []).map(t => t.id === taskId ? { ...t, timeSpent: (t.timeSpent || 0) + minutes } : t);
    await fetch(`/api/boards/${boardId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tasks }) });
  } catch {}
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoro must be used within PomodoroProvider');
  return ctx;
}
