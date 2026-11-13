import type { NumKey } from './types';
/** Input-sanity limits only (can a human reading plausibly be this number?). NOT clinical thresholds. */
export const LIMITS: Record<NumKey, { min: number; max: number; label: string; unit: string }> = {
  hr: { min: 25, max: 220, label: 'Heart rate', unit: 'BPM' }, sys: { min: 60, max: 260, label: 'Systolic pressure', unit: 'mmHg' }, dia: { min: 30, max: 160, label: 'Diastolic pressure', unit: 'mmHg' },
  spo2: { min: 50, max: 100, label: 'SpO₂', unit: '%' }, temp: { min: 30, max: 43, label: 'Temperature', unit: '°C' }, glucose: { min: 20, max: 600, label: 'Glucose', unit: 'mg/dL' },
  sleepH: { min: 0, max: 16, label: 'Sleep', unit: 'h' }, sleepQ: { min: 1, max: 10, label: 'Sleep quality', unit: '/10' }, mood: { min: 1, max: 10, label: 'Mood', unit: '/10' },
  fatigue: { min: 1, max: 10, label: 'Fatigue', unit: '/10' }, stress: { min: 1, max: 10, label: 'Stress', unit: '/10' }, hydration: { min: 1, max: 10, label: 'Hydration', unit: '/10' },
  cognition: { min: 1, max: 10, label: 'Mental clarity', unit: '/10' }, social: { min: 1, max: 10, label: 'Social connection', unit: '/10' }, exerciseMin: { min: 0, max: 600, label: 'Exercise', unit: 'min' },
};
export const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
export function validateValue(k: NumKey, v: unknown): string | null {
  const L = LIMITS[k]; if (!isNum(v)) return `${L.label}: enter a number`;
  if (v < L.min || v > L.max) return `${L.label}: expected ${L.min}–${L.max} ${L.unit}. Check the unit.`; return null;
}
/** Validates a set of fields entered together (cross-checks included). Returns map of key -> message. */
export function validateEntry(vals: Partial<Record<NumKey, unknown>>, now = Date.now(), ts?: number): Record<string, string> {
  const e: Record<string, string> = {};
  (Object.keys(vals) as NumKey[]).forEach((k) => { const m = validateValue(k, vals[k]); if (m) e[k] = m; });
  if (isNum(vals.sys) && isNum(vals.dia) && !e.sys && !e.dia && vals.dia >= vals.sys) e.dia = 'Diastolic must be lower than systolic (did you swap them?)';
  if (isNum(vals.sys) && isNum(vals.dia) && !e.sys && !e.dia && vals.sys - vals.dia < 10) e.dia = e.dia ?? 'Pulse pressure is very small; please re-check both numbers';
  if (ts !== undefined) { if (!isNum(ts)) e.ts = 'Enter a valid date and time'; else if (ts > now + 60_000) e.ts = 'Time cannot be in the future'; else if (now - ts > 30 * 864e5) e.ts = 'Time is more than 30 days ago'; }
  return e;
}
export const fToC = (f: number) => Math.round(((f - 32) * 5) / 9 * 10) / 10;
export const mmolToMgdl = (m: number) => Math.round(m * 18.016);
export const normId = (s: string) => s.trim().toUpperCase();
export const isDuplicateId = (existing: string[], id: string) => existing.some((x) => normId(x) === normId(id));
