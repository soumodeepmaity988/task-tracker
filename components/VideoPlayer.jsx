'use client';
import { useEffect, useState } from 'react';
import { Play, X, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────
export function getYoutubeId(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
export function thumbUrl(url) {
  const id = getYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}
function normalizeList(urls) {
  return (urls || []).map(u => (u || '').trim()).filter(Boolean);
}

// ─── Player modal ───────────────────────────────────────────────────────────
// Plays one video; if `urls` has multiple, header buttons + ←/→ keys navigate.
export function VideoPlayerModal({ urls, startUrl, title, onClose }) {
  const list = normalizeList(urls);
  const initialIdx = Math.max(0, startUrl ? list.indexOf(startUrl) : 0);
  const [idx, setIdx] = useState(initialIdx >= 0 ? initialIdx : 0);
  const current = list[idx];
  const id = getYoutubeId(current);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && idx > 0) setIdx(i => i - 1);
      if (e.key === 'ArrowRight' && idx < list.length - 1) setIdx(i => i + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, idx, list.length]);

  if (list.length === 0) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 960, width: '92%' }}>
        <div className="modal-header">
          <span className="modal-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 12 }}>
            {title}
            {list.length > 1 && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8, fontWeight: 500 }}>
                Video {idx + 1} of {list.length}
              </span>
            )}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {list.length > 1 && (
              <>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setIdx(i => Math.max(0, i - 1))}
                  disabled={idx === 0}
                  title="Previous video (←)"
                ><ChevronLeft size={14} /></button>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setIdx(i => Math.min(list.length - 1, i + 1))}
                  disabled={idx === list.length - 1}
                  title="Next video (→)"
                ><ChevronRight size={14} /></button>
              </>
            )}
            <a href={current} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-icon btn-sm" title="Open on YouTube">
              <ExternalLink size={14} />
            </a>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} title="Close"><X size={16} /></button>
          </div>
        </div>
        <div style={{ aspectRatio: '16/9', background: 'black', width: '100%' }}>
          {id ? (
            <iframe
              key={current}
              src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ border: 0, width: '100%', height: '100%', display: 'block' }}
            />
          ) : (
            <div style={{ padding: 40, color: 'var(--text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 13 }}>Can't embed this URL inline.</p>
              <a className="btn btn-primary btn-sm" href={current} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={12} /> Open in new tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── One thumbnail card ────────────────────────────────────────────────────
function ThumbCard({ url, index, total, width, onClick }) {
  const thumb = thumbUrl(url);
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(url); }}
      title={url}
      style={{
        position: 'relative', display: 'block', padding: 0,
        width, aspectRatio: '16/9', flexShrink: 0,
        border: '1px solid var(--border)', borderRadius: 10,
        overflow: 'hidden', cursor: 'pointer', background: 'black',
        transition: 'transform 0.12s, border-color 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {thumb ? (
        <img src={thumb} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
          Video {index}
        </div>
      )}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45) 100%)',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(255,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}>
          <Play size={16} color="white" fill="white" style={{ marginLeft: 2 }} />
        </div>
      </div>
      {total > 1 && (
        <span style={{
          position: 'absolute', bottom: 4, right: 4,
          background: 'rgba(0,0,0,0.75)', color: 'white',
          fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
        }}>
          {index}/{total}
        </span>
      )}
    </button>
  );
}

// ─── Thumbnail strip — single preview if 1 video, horizontal carousel if N ──
// `onPick(url)` is called with the chosen URL. Parent should open the player.
export function VideoThumbnailStrip({ urls, onPick }) {
  const list = normalizeList(urls);
  if (list.length === 0) return null;
  const w = list.length === 1 ? 320 : 180;
  return (
    <div
      style={{
        display: 'flex', gap: 8, marginTop: 10,
        overflowX: 'auto', paddingBottom: 4,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {list.map((url, i) => (
        <ThumbCard
          key={`${i}-${url}`}
          url={url}
          index={i + 1}
          total={list.length}
          width={w}
          onClick={(u) => onPick(u)}
        />
      ))}
    </div>
  );
}

// ─── Small play icon button (for compact rows) ──────────────────────────────
// Emits onPlay() — parent opens the modal. No internal state.
export function VideoIconButton({ urls, onPlay }) {
  const list = normalizeList(urls);
  if (list.length === 0) return null;
  const click = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onPlay(list[0]);
  };
  return (
    <button
      type="button"
      onClick={click}
      title={list.length === 1 ? 'Play video' : `${list.length} videos — click to play`}
      style={{
        position: 'relative',
        width: 28, height: 28, borderRadius: 6,
        background: 'rgba(255,68,68,0.12)', color: '#ff4444',
        border: 'none', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,68,68,0.22)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,68,68,0.12)'}
    >
      <Play size={13} fill="#ff4444" />
      {list.length > 1 && (
        <span style={{
          position: 'absolute', top: -4, right: -4,
          background: 'var(--bg-secondary)', color: '#ff4444',
          border: '1px solid #ff4444', borderRadius: 99,
          fontSize: 9, fontWeight: 700, lineHeight: 1,
          padding: '1px 4px', minWidth: 14, textAlign: 'center',
        }}>{list.length}</span>
      )}
    </button>
  );
}
