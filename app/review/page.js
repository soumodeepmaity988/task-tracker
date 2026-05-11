'use client';
import { useState, useMemo, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import Markdown from '@/components/Markdown';
import { BookOpen, Save, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { DAY_MS, startOfDay, dateKey } from '@/lib/dateUtils';

function currentWeekOf() {
  const today = new Date();
  const day = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function autosummary(boards, weekOfKey) {
  const start = new Date(weekOfKey + 'T00:00:00').getTime();
  const end = start + 7 * DAY_MS;
  const done = [];
  boards.forEach(b => (b.tasks || []).forEach(t => {
    if (t.status === 'done' && t.completedAt && t.completedAt >= start && t.completedAt < end) {
      done.push(`- ✅ **${t.title}** _(${b.name})_`);
    }
  }));
  return done.length ? done.join('\n') : '_No tasks completed yet this week._';
}

export default function ReviewPage() {
  const { journal, boards, createJournalEntry, updateJournalEntry } = useApp();
  const [weekOf, setWeekOf] = useState(currentWeekOf());
  const [edit, setEdit] = useState({ didWell: '', slipped: '', nextWeek: '', notes: '' });
  const [expanded, setExpanded] = useState({});

  const entries = useMemo(() => [...journal].sort((a, b) => b.weekOf.localeCompare(a.weekOf)), [journal]);
  const existing = entries.find(e => e.weekOf === weekOf);
  useEffect(() => {
    if (existing) setEdit({ didWell: existing.didWell, slipped: existing.slipped, nextWeek: existing.nextWeek, notes: existing.notes || '' });
    else setEdit({ didWell: '', slipped: '', nextWeek: '', notes: '' });
  }, [existing?.id, weekOf]);

  const save = async () => {
    if (existing) await updateJournalEntry(existing.id, { ...edit });
    else await createJournalEntry({ weekOf, ...edit });
  };

  const summary = autosummary(boards, weekOf);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-inner" style={{ maxWidth: 880 }}>
          <div className="page-header">
            <h1 className="page-title"><BookOpen size={20} style={{ display: 'inline', marginRight: 8 }} /> Weekly Review</h1>
            <p className="page-subtitle">Friday-evening prompt: what worked, what slipped, next week.</p>
          </div>

          <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600 }}>Week of</label>
              <input type="date" className="form-input" value={weekOf} onChange={e => setWeekOf(e.target.value)} style={{ width: 'auto' }} />
              {existing && <span className="tag tag-green" style={{ fontSize: 10 }}>Saved</span>}
              <div style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" onClick={save}><Save size={12} /> Save</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>✅ Completed this week (auto)</h3>
              <Markdown compact>{summary}</Markdown>
            </div>

            <div className="form-group">
              <label className="form-label">🌱 What went well</label>
              <textarea className="form-textarea" value={edit.didWell} onChange={e => setEdit(p => ({ ...p, didWell: e.target.value }))} placeholder="Wins, momentum, surprises…" />
            </div>
            <div className="form-group">
              <label className="form-label">🪨 What slipped</label>
              <textarea className="form-textarea" value={edit.slipped} onChange={e => setEdit(p => ({ ...p, slipped: e.target.value }))} placeholder="What didn't get done, why…" />
            </div>
            <div className="form-group">
              <label className="form-label">🎯 Focus for next week</label>
              <textarea className="form-textarea" value={edit.nextWeek} onChange={e => setEdit(p => ({ ...p, nextWeek: e.target.value }))} placeholder="Top 3 priorities…" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">📝 Open notes</label>
              <textarea className="form-textarea" value={edit.notes} onChange={e => setEdit(p => ({ ...p, notes: e.target.value }))} placeholder="Anything else…" />
            </div>
          </div>

          {entries.length > 1 && (
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Past entries</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {entries.filter(e => e.weekOf !== weekOf).map(e => (
                  <div key={e.id} className="glass-card" style={{ padding: 12 }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                      onClick={() => setExpanded(prev => ({ ...prev, [e.id]: !prev[e.id] }))}
                    >
                      {expanded[e.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Week of {e.weekOf}</span>
                    </div>
                    {expanded[e.id] && (
                      <div style={{ marginTop: 10, paddingLeft: 18 }}>
                        {e.didWell && (<><h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>What went well</h4><Markdown compact>{e.didWell}</Markdown></>)}
                        {e.slipped && (<><h4 style={{ fontSize: 12, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>What slipped</h4><Markdown compact>{e.slipped}</Markdown></>)}
                        {e.nextWeek && (<><h4 style={{ fontSize: 12, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>Focus for next week</h4><Markdown compact>{e.nextWeek}</Markdown></>)}
                        {e.notes && (<><h4 style={{ fontSize: 12, fontWeight: 700, marginTop: 10, marginBottom: 4 }}>Notes</h4><Markdown compact>{e.notes}</Markdown></>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
