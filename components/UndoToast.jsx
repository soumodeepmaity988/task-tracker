'use client';
import { useApp } from '@/contexts/AppContext';
import { useEffect, useState } from 'react';
import { Undo2, X } from 'lucide-react';

const VISIBLE_MS = 8000;

export default function UndoToast() {
  const { undoStack, undo } = useApp();
  const latest = undoStack[undoStack.length - 1];
  const [dismissed, setDismissed] = useState(null);

  useEffect(() => {
    if (!latest) return;
    setDismissed(null);
    const t = setTimeout(() => setDismissed(latest.at), VISIBLE_MS);
    return () => clearTimeout(t);
  }, [latest]);

  if (!latest || dismissed === latest.at) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 18, left: 18, zIndex: 1500,
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: 'var(--shadow)', fontSize: 12.5,
      animation: 'slideUp 0.2s ease',
    }}>
      <span style={{ color: 'var(--text-secondary)' }}>{latest.label}</span>
      <button
        onClick={() => undo()}
        className="btn btn-ghost btn-sm"
        style={{ fontSize: 12, padding: '3px 10px', color: 'var(--accent-blue)', fontWeight: 600 }}
      >
        <Undo2 size={12} /> Undo
      </button>
      <button
        onClick={() => setDismissed(latest.at)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}
      >
        <X size={13} />
      </button>
    </div>
  );
}
