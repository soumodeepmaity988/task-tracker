'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [boards, setBoards] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const fetchBoards = useCallback(async () => {
    setLoadingBoards(true);
    const res = await fetch('/api/boards');
    const data = await res.json();
    setBoards(data);
    setLoadingBoards(false);
  }, []);

  const fetchSubjects = useCallback(async () => {
    setLoadingSubjects(true);
    const res = await fetch('/api/subjects');
    const data = await res.json();
    setSubjects(data);
    setLoadingSubjects(false);
  }, []);

  useEffect(() => { fetchBoards(); fetchSubjects(); }, [fetchBoards, fetchSubjects]);

  // ---- Board CRUD ----
  const createBoard = async (name) => {
    const res = await fetch('/api/boards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    const created = await res.json();
    setBoards(prev => [...prev, created]);
    return created;
  };

  const updateBoard = async (id, patch) => {
    const res = await fetch(`/api/boards/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const updated = await res.json();
    setBoards(prev => prev.map(b => b.id === id ? updated : b));
    return updated;
  };

  const deleteBoard = async (id) => {
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
    const res = await fetch(`/api/subjects/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const updated = await res.json();
    setSubjects(prev => prev.map(s => s.id === id ? updated : s));
    return updated;
  };

  const deleteSubject = async (id) => {
    await fetch(`/api/subjects/${id}`, { method: 'DELETE' });
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  return (
    <AppContext.Provider value={{
      boards, subjects,
      loadingBoards, loadingSubjects,
      fetchBoards, fetchSubjects,
      createBoard, updateBoard, deleteBoard,
      createSubject, updateSubject, deleteSubject,
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
