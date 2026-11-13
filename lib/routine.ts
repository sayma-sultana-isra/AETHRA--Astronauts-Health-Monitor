import type { AppState } from './types';
export const TASKS = [
  { id: 'health', label: 'Daily health check', href: '/check', key: 'health' }, { id: 'wellness', label: 'Wellness check-in', href: '/wellness', key: 'wellness' },
  { id: 'hydration', label: 'Hydration — drink per mission plan', href: '', key: 'hydration' }, { id: 'exercise', label: 'Exercise countermeasure session', href: '', key: 'exercise' },
  { id: 'sleep', label: 'Sleep log & wind-down', href: '/check', key: 'sleep' }, { id: 'medication', label: 'Medication as prescribed (per your own plan)', href: '', key: 'medication' },
];
const day = (off: number) => new Date(Date.now() - off * 864e5).toISOString().slice(0, 10);
export const doneToday = (s: AppState) => s.taskLog[`${s.activeId}|${day(0)}`] ?? [];
export function streak(s: AppState) { let n = 0; for (let i = 0; i < 365; i++) { const l = s.taskLog[`${s.activeId}|${day(i)}`] ?? []; if (l.includes('health')) n++; else if (i > 0) break; else continue; } return n; }
export function weekCompletion(s: AppState) { let d = 0; for (let i = 0; i < 7; i++) d += (s.taskLog[`${s.activeId}|${day(i)}`] ?? []).length; return Math.round((d / (7 * TASKS.length)) * 100); }
export const activeTasks = (s: AppState) => TASKS.filter((t) => s.settings.reminders[t.key] !== false);
