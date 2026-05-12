'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [boards, setBoards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [habits, setHabits] = useState([]);
  const [goals, setGoals] = useState([]);
  const [journal, setJournal] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingHabits, setLoadingHabits] = useState(true);
  const [loadingGoals, setLoadingGoals] = useState(true);

  // ---- Undo stack ----
  const [undoStack, setUndoStack] = useState([]); // [{ label, snapshot: { boards, subjects, ... } }]

  const pushUndo = useCallback((label, snapshot) => {
    setUndoStack(prev => {
      const next = [...prev, { label, snapshot, at: Date.now() }];
      // Keep last 20 entries
      return next.slice(-20);
    });
  }, []);

  const undo = useCallback(async () => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      const { snapshot } = last;
      (async () => {
        if (snapshot.boards) {
          setBoards(snapshot.boards);
          // persist each in parallel
          await Promise.all(snapshot.boards.map(b =>
            fetch(`/api/boards/${b.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
          ));
        }
        if (snapshot.subjects) {
          setSubjects(snapshot.subjects);
          await Promise.all(snapshot.subjects.map(s =>
            fetch(`/api/subjects/${s.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) })
          ));
        }
      })();
      return prev.slice(0, -1);
    });
  }, []);

  // Defensive fetch: returns parsed JSON array, or [] if the route errored / body
  // is not JSON. Logs the underlying problem to the browser console.
  async function safeFetchArray(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`[${url}] HTTP ${res.status}:`, text.slice(0, 500));
        return [];
      }
      const data = await res.json().catch(async () => {
        const text = await res.text().catch(() => '');
        console.error(`[${url}] response was not JSON:`, text.slice(0, 500));
        return [];
      });
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error(`[${url}] fetch failed:`, e);
      return [];
    }
  }

  const fetchBoards = useCallback(async () => {
    setLoadingBoards(true);
    setBoards(await safeFetchArray('/api/boards'));
    setLoadingBoards(false);
  }, []);

  const fetchSubjects = useCallback(async () => {
    setLoadingSubjects(true);
    setSubjects(await safeFetchArray('/api/subjects'));
    setLoadingSubjects(false);
  }, []);

  const fetchHabits = useCallback(async () => {
    setLoadingHabits(true);
    setHabits(await safeFetchArray('/api/habits'));
    setLoadingHabits(false);
  }, []);

  const fetchGoals = useCallback(async () => {
    setLoadingGoals(true);
    setGoals(await safeFetchArray('/api/goals'));
    setLoadingGoals(false);
  }, []);

  const fetchJournal = useCallback(async () => {
    setJournal(await safeFetchArray('/api/journal'));
  }, []);

  useEffect(() => {
    fetchBoards(); fetchSubjects(); fetchHabits(); fetchGoals(); fetchJournal();
  }, [fetchBoards, fetchSubjects, fetchHabits, fetchGoals, fetchJournal]);

  // ---- Board CRUD ----
  const createBoard = async (name) => {
    const res = await fetch('/api/boards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const created = await res.json();
    setBoards(prev => [...prev, created]);
    return created;
  };

  const updateBoard = async (id, patch) => {
    setBoards(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
    const res = await fetch(`/api/boards/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (!res.ok) { await fetchBoards(); return null; }
    const updated = await res.json();
    setBoards(prev => prev.map(b => b.id === id ? updated : b));
    return updated;
  };

  const deleteBoard = async (id) => {
    const snap = boards.find(b => b.id === id);
    if (snap) pushUndo(`Deleted board "${snap.name}"`, { boards: [snap] });
    await fetch(`/api/boards/${id}`, { method: 'DELETE' });
    setBoards(prev => prev.filter(b => b.id !== id));
  };

  // ---- Subject CRUD ----
  const createSubject = async (data) => {
    const res = await fetch('/api/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const created = await res.json();
    setSubjects(prev => [...prev, created]);
    return created;
  };

  const updateSubject = async (id, patch) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
    const res = await fetch(`/api/subjects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (!res.ok) { await fetchSubjects(); return null; }
    const updated = await res.json();
    setSubjects(prev => prev.map(s => s.id === id ? updated : s));
    return updated;
  };

  const deleteSubject = async (id) => {
    const snap = subjects.find(s => s.id === id);
    if (snap) pushUndo(`Deleted subject "${snap.name}"`, { subjects: [snap] });
    await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  // ---- Habit CRUD ----
  const createHabit = async (data) => {
    const res = await fetch('/api/habits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const created = await res.json();
    setHabits(prev => [...prev, created]);
    return created;
  };
  const updateHabit = async (id, patch) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...patch } : h));
    const res = await fetch(`/api/habits/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (!res.ok) { await fetchHabits(); return null; }
    const updated = await res.json();
    setHabits(prev => prev.map(h => h.id === id ? updated : h));
    return updated;
  };
  const deleteHabit = async (id) => {
    await fetch(`/api/habits/${id}`, { method: 'DELETE' });
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  // ---- Goal CRUD ----
  const createGoal = async (data) => {
    const res = await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const created = await res.json();
    setGoals(prev => [...prev, created]);
    return created;
  };
  const updateGoal = async (id, patch) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
    const res = await fetch(`/api/goals/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (!res.ok) { await fetchGoals(); return null; }
    const updated = await res.json();
    setGoals(prev => prev.map(g => g.id === id ? updated : g));
    return updated;
  };
  const deleteGoal = async (id) => {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  // ---- Journal CRUD ----
  const createJournalEntry = async (data) => {
    const res = await fetch('/api/journal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const created = await res.json();
    setJournal(prev => [...prev, created]);
    return created;
  };
  const updateJournalEntry = async (id, patch) => {
    setJournal(prev => prev.map(j => j.id === id ? { ...j, ...patch } : j));
    const res = await fetch(`/api/journal/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    if (!res.ok) { await fetchJournal(); return null; }
    const updated = await res.json();
    setJournal(prev => prev.map(j => j.id === id ? updated : j));
    return updated;
  };

  return (
    <AppContext.Provider value={{
      boards, subjects, habits, goals, journal,
      loadingBoards, loadingSubjects, loadingHabits, loadingGoals,
      fetchBoards, fetchSubjects, fetchHabits, fetchGoals, fetchJournal,
      createBoard, updateBoard, deleteBoard,
      createSubject, updateSubject, deleteSubject,
      createHabit, updateHabit, deleteHabit,
      createGoal, updateGoal, deleteGoal,
      createJournalEntry, updateJournalEntry,
      undoStack, undo, pushUndo,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
