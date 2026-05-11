'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { Plus, X, Trash2, Flame, Check } from 'lucide-react';
import { startOfDay, DAY_MS, dateKey, todayKey } from '@/lib/dateUtils';

const COLORS = ['#22c55e', '#4f8ef7', '#ec4899', '#f97316', '#8b5cf6', '#2dd4bf', '#eab308', '#ef4444'];
const ICONS = ['🔥', '💪', '🧘', '📖', '🏃', '💧', '🥗', '✍️', '☕', '🎯', '🛌', '🌱'];

function HabitModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', icon: '🔥', color: '#22c55e', cadence: 'daily' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const submit = (e) => { e.preventDefault(); if (!form.name.trim()) return; onSave(form); };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{initial?.id ? 'Edit Habit' : 'New Habit'}</span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Meditate 10 min" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Cadence</label>
              <select className="form-select" value={form.cadence} onChange={e => set('cadence', e.target.value)}>
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => set('icon', ic)}
                    style={{ fontSize: 20, padding: 5, borderRadius: 8, cursor: 'pointer', background: form.icon === ic ? 'var(--bg-glass)' : 'none', border: form.icon === ic ? '2px solid var(--accent-blue)' : '2px solid transparent' }}
                  >{ic}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('color', c)}
                    style={{ width: 26, height: 26, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid white' : '3px solid transparent', outline: form.color === c ? `2px solid ${c}` : 'none' }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{initial?.id ? 'Save' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function streakOf(habit) {
  const set = new Set(habit.completions || []);
  let n = 0;
  let cursor = startOfDay(Date.now());
  // If today missing but yesterday hit, streak still counts (start from yesterday)
  if (!set.has(dateKey(cursor))) cursor -= DAY_MS;
  while (set.has(dateKey(cursor))) {
    n++;
    cursor -= DAY_MS;
  }
  return n;
}

export default function HabitsPage() {
  const { habits, createHabit, updateHabit, deleteHabit } = useApp();
  const [modal, setModal] = useState(null);
  const tk = todayKey();

  const toggle = (h, key) => {
    const completions = h.completions || [];
    const next = completions.includes(key) ? completions.filter(d => d !== key) : [...completions, key];
    updateHabit(h.id, { completions: next });
  };

  // Last 14 days
  const days = [];
  const today = startOfDay(Date.now());
  for (let i = 13; i >= 0; i--) days.push(today - i * DAY_MS);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="page-header" style={{ marginBottom: 0 }}>
              <h1 className="page-title"><Flame size={20} style={{ display: 'inline', marginRight: 8, color: 'var(--accent-orange)' }} /> Habits</h1>
              <p className="page-subtitle">Daily checkboxes with streaks. {habits.length} habit{habits.length === 1 ? '' : 's'}.</p>
            </div>
            <button className="btn btn-primary" onClick={() => setModal({})}><Plus size={14} /> New Habit</button>
          </div>

          {habits.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🌱</div>
              <h3>No habits yet</h3>
              <p>Add a habit and check in daily.</p>
              <br />
              <button className="btn btn-primary" onClick={() => setModal({})}><Plus size={14} /> Add First Habit</button>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 16, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)' }}>Habit</th>
                    {days.map(ts => {
                      const d = new Date(ts);
                      const isToday = ts === today;
                      return (
                        <th key={ts} style={{ padding: '4px 2px', fontSize: 9, color: isToday ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: isToday ? 700 : 500, textAlign: 'center' }}>
                          {d.getDate()}
                        </th>
                      );
                    })}
                    <th style={{ padding: '4px 10px', fontSize: 11, color: 'var(--text-muted)' }}>Streak</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {habits.map(h => {
                    const streak = streakOf(h);
                    const set = new Set(h.completions || []);
                    return (
                      <tr key={h.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{h.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{h.name}</span>
                          </div>
                        </td>
                        {days.map(ts => {
                          const key = dateKey(ts);
                          const done = set.has(key);
                          return (
                            <td key={key} style={{ padding: '2px', textAlign: 'center' }}>
                              <button
                                onClick={() => toggle(h, key)}
                                style={{
                                  width: 22, height: 22, borderRadius: 6,
                                  background: done ? h.color : 'var(--bg-glass)',
                                  border: `1px solid ${done ? h.color : 'var(--border)'}`,
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                                title={key}
                              >
                                {done && <Check size={12} color="white" />}
                              </button>
                            </td>
                          );
                        })}
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontSize: 12, color: streak > 0 ? 'var(--accent-orange)' : 'var(--text-muted)', fontWeight: 700 }}>
                          {streak > 0 ? `🔥 ${streak}` : '—'}
                        </td>
                        <td style={{ padding: '4px' }}>
                          <button className="task-card-action-btn" onClick={() => { if (confirm(`Delete "${h.name}"?`)) deleteHabit(h.id); }}><Trash2 size={12} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      {modal && (
        <HabitModal
          initial={modal.id ? modal : null}
          onSave={async (form) => { if (modal.id) await updateHabit(modal.id, form); else await createHabit(form); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
