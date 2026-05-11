import { DAY_MS, startOfDay } from './dateUtils';

export const RECURRENCE_OPTIONS = [
  { id: '',         label: 'No repeat' },
  { id: 'daily',    label: 'Every day' },
  { id: 'weekdays', label: 'Weekdays (Mon–Fri)' },
  { id: 'weekly',   label: 'Every week' },
  { id: 'biweekly', label: 'Every 2 weeks' },
  { id: 'monthly',  label: 'Every month' },
];

export function nextOccurrence(recurring, fromTs) {
  if (!recurring) return null;
  const base = startOfDay(fromTs || Date.now());
  switch (recurring) {
    case 'daily':    return base + DAY_MS;
    case 'weekdays': {
      const dow = new Date(base).getDay(); // 0=Sun, 6=Sat
      let add = 1;
      if (dow === 5) add = 3;       // Fri → Mon
      else if (dow === 6) add = 2;  // Sat → Mon
      return base + add * DAY_MS;
    }
    case 'weekly':   return base + 7 * DAY_MS;
    case 'biweekly': return base + 14 * DAY_MS;
    case 'monthly': {
      const d = new Date(base);
      d.setMonth(d.getMonth() + 1);
      return d.getTime();
    }
    default: return null;
  }
}

export function recurrenceLabel(recurring) {
  return RECURRENCE_OPTIONS.find(o => o.id === recurring)?.label || '';
}
