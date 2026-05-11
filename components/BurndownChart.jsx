'use client';
import { useMemo } from 'react';
import { startOfDay, DAY_MS } from '@/lib/dateUtils';

// tasks: sprint tasks; sprint: { startDate, endDate }
export default function BurndownChart({ tasks, sprint, width = 320, height = 80 }) {
  const data = useMemo(() => {
    if (!sprint?.startDate || !sprint?.endDate) return null;
    const start = startOfDay(sprint.startDate);
    const end = startOfDay(sprint.endDate);
    const days = Math.max(1, Math.round((end - start) / DAY_MS)) + 1;
    const total = tasks.length;
    // ideal line: total -> 0 across days
    const ideal = Array.from({ length: days }, (_, i) => total * (1 - i / Math.max(1, days - 1)));
    // actual line: for each day, count tasks NOT completed before/at that day's end
    const today = startOfDay(Date.now());
    const actual = Array.from({ length: days }, (_, i) => {
      const day = start + i * DAY_MS;
      if (day > today) return null;
      let remaining = 0;
      tasks.forEach(t => {
        const completedAt = t.status === 'done' ? (t.completedAt || t.createdAt) : null;
        if (!completedAt || startOfDay(completedAt) > day) remaining++;
      });
      return remaining;
    });
    return { days, total, ideal, actual };
  }, [tasks, sprint]);

  if (!data) return null;
  const { days, total, ideal, actual } = data;
  const padL = 24, padR = 8, padT = 6, padB = 16;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const xAt = (i) => padL + (i / Math.max(1, days - 1)) * innerW;
  const yAt = (v) => padT + (1 - v / Math.max(1, total)) * innerH;

  const idealPath = ideal.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)} ${yAt(v)}`).join(' ');
  const actualPoints = actual
    .map((v, i) => (v === null ? null : `${xAt(i)},${yAt(v)}`))
    .filter(Boolean);
  const actualPath = actualPoints.length
    ? 'M ' + actualPoints.join(' L ')
    : '';

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {/* Axes */}
      <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="var(--border)" />
      <line x1={padL} y1={padT + innerH} x2={padL + innerW} y2={padT + innerH} stroke="var(--border)" />
      {/* Ideal */}
      <path d={idealPath} stroke="var(--text-muted)" strokeDasharray="4 4" fill="none" />
      {/* Actual */}
      {actualPath && <path d={actualPath} stroke="var(--accent-blue)" strokeWidth="2" fill="none" />}
      {/* Total label */}
      <text x={padL - 4} y={padT + 4} fontSize="9" textAnchor="end" fill="var(--text-muted)">{total}</text>
      <text x={padL - 4} y={padT + innerH + 4} fontSize="9" textAnchor="end" fill="var(--text-muted)">0</text>
    </svg>
  );
}
