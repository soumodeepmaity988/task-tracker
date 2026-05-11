'use client';
import { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { useApp } from '@/contexts/AppContext';
import { Video, FileText, BookText, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function QueuePage() {
  const { subjects } = useApp();
  const [filter, setFilter] = useState('unread'); // unread | all
  const [type, setType] = useState('all'); // all | video | doc

  const items = useMemo(() => {
    const out = [];
    subjects.forEach(s => {
      (s.topics || []).forEach(topic => {
        (topic.contents || []).forEach(c => {
          if (!c.videoUrl && !c.docUrl) return;
          if (type === 'video' && !c.videoUrl) return;
          if (type === 'doc' && !c.docUrl) return;
          if (filter === 'unread' && c.status === 'done') return;
          out.push({ ...c, _subject: s, _topic: topic });
        });
      });
    });
    return out;
  }, [subjects, filter, type]);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-inner">
          <div className="page-header">
            <h1 className="page-title"><BookText size={20} style={{ display: 'inline', marginRight: 8 }} /> Reading & Watch Queue</h1>
            <p className="page-subtitle">Everything from your subjects with a video or doc URL.</p>
          </div>

          <div className="toolbar" style={{ marginBottom: 14 }}>
            <select className="form-select" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
              <option value="unread">Unread / In progress</option>
              <option value="all">All</option>
            </select>
            <select className="form-select" value={type} onChange={e => setType(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
              <option value="all">All types</option>
              <option value="video">🎬 Videos</option>
              <option value="doc">📄 Docs</option>
            </select>
          </div>

          {items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📚</div>
              <h3>Nothing in your queue</h3>
              <p>Add a video or doc URL to any subject content.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map(c => (
                <div key={c.id} className="glass-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{c._subject.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: c.status === 'done' ? 'line-through' : 'none', opacity: c.status === 'done' ? 0.6 : 1 }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      <Link href={`/subjects/${c._subject.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{c._subject.name}</Link>
                      {' · '}{c._topic.title}
                    </div>
                  </div>
                  {c.videoUrl && (
                    <a href={c.videoUrl} target="_blank" rel="noopener noreferrer" title="Watch"
                      style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(255,68,68,0.12)', color: '#ff4444', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                      <Video size={14} />
                    </a>
                  )}
                  {c.docUrl && (
                    <a href={c.docUrl} target="_blank" rel="noopener noreferrer" title="Open"
                      style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(79,142,247,0.12)', color: '#4f8ef7', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                      <FileText size={14} />
                    </a>
                  )}
                  <Link href={`/subjects/${c._subject.id}`} title="Open subject" style={{ color: 'var(--text-muted)', display: 'flex' }}>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
