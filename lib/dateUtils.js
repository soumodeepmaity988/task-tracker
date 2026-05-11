export const DAY_MS = 86400000;

export function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function dateKey(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

export function dateInputToMs(value) {
  if (!value) return null;
  return new Date(value + 'T00:00:00').getTime();
}

export function msToDateInput(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fmtDateShort(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function fmtDateLong(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtRange(start, end) {
  if (!start || !end) return '';
  return `${fmtDateShort(start)} – ${fmtDateShort(end)}`;
}

export function isToday(ts) {
  if (!ts) return false;
  return startOfDay(ts) === startOfDay(Date.now());
}

export function isOverdue(ts) {
  if (!ts) return false;
  return startOfDay(ts) < startOfDay(Date.now());
}

export function isThisWeek(ts) {
  if (!ts) return false;
  const today = startOfDay(Date.now());
  const dow = new Date(today).getDay(); // 0 = Sun
  const monday = today - ((dow + 6) % 7) * DAY_MS;
  const sundayNext = monday + 7 * DAY_MS;
  const t = startOfDay(ts);
  return t >= monday && t < sundayNext;
}

export function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY_MS);
}

export function fmtRelative(ts) {
  if (!ts) return '';
  const diff = daysBetween(Date.now(), ts);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${-diff}d overdue`;
  if (diff < 7) return `in ${diff}d`;
  return fmtDateShort(ts);
}

export function fmtDuration(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
