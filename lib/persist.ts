import type { AppState } from './types';
export const DB_NAME = 'aethra', STORE = 'kv', KEY = 'state-v2', SCHEMA = 2;
export const LEGACY = { db: 'astra-med', key: 'state-v1' }; // pre-rebrand database: read for migration, NEVER deleted automatically
export const EMPTY: AppState = { schema: SCHEMA, loaded: false, onboarded: false, profiles: [], activeId: '', scenarios: {}, readings: {}, labResults: {}, symptoms: {}, journal: [], reports: [], ops: {}, taskLog: {}, settings: { largeText: false, reduceMotion: false, viewerRole: 'astronaut', reminders: { health: true, sleep: true, hydration: true, exercise: true, medication: false, wellness: true } } };

function open(name: string): Promise<IDBDatabase> { return new Promise((res, rej) => { const r = indexedDB.open(name, 1); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onblocked = () => rej(new Error('blocked')); }); }
async function get(name: string, key: string): Promise<unknown> { const db = await open(name); try { return await new Promise((res, rej) => { const t = db.transaction(STORE).objectStore(STORE).get(key); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error); }); } finally { db.close(); } }
async function put(name: string, key: string, v: unknown) { const db = await open(name); try { await new Promise<void>((res, rej) => { const t = db.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(v, key); t.oncomplete = () => res(); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); } finally { db.close(); } }

const isObj = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);
/** Defensive validation of stored/imported data. Throws if it is not recognisably an AETHRA/ASTRA state. Drops malformed items instead of crashing. */
export function sanitize(v: unknown): AppState {
  if (!isObj(v) || !Array.isArray(v.profiles)) throw new Error('Not a valid AETHRA data file');
  const seen = new Set<string>(); const profiles = v.profiles.filter((p: any) => isObj(p) && typeof p.id === 'string' && p.id && isObj(p.baseline) && isObj(p.mission) && !seen.has(p.id.trim().toUpperCase()) && (seen.add(p.id.trim().toUpperCase()), true));
  const ids = new Set(profiles.map((p: any) => p.id)); const readings: AppState['readings'] = {};
  if (isObj(v.readings)) for (const [id, arr] of Object.entries(v.readings)) if (ids.has(id) && Array.isArray(arr)) readings[id] = (arr as any[]).filter((r) => isObj(r) && Number.isFinite(r.ts) && typeof r.id === 'string').sort((a, b) => a.ts - b.ts);
  const labResults: AppState['labResults'] = {}; if (isObj(v.labResults)) for (const [id, arr] of Object.entries(v.labResults)) if (ids.has(id) && Array.isArray(arr)) labResults[id] = (arr as any[]).filter((r) => isObj(r) && typeof r.id === 'string' && typeof r.key === 'string' && Number.isFinite(r.value) && Number.isFinite(r.ts) && typeof r.unit === 'string' && r.source === 'manual').sort((a, b) => a.ts - b.ts);
  return { ...EMPTY, ...(v as any), schema: SCHEMA, profiles, readings, labResults, activeId: ids.has(v.activeId) ? v.activeId : profiles[0]?.id ?? '', loaded: profiles.length > 0 && !!v.loaded,
    scenarios: isObj(v.scenarios) ? v.scenarios : {}, symptoms: isObj(v.symptoms) ? v.symptoms : {}, journal: Array.isArray(v.journal) ? v.journal : [], reports: Array.isArray(v.reports) ? v.reports : [], ops: isObj(v.ops) ? v.ops : {}, taskLog: isObj(v.taskLog) ? v.taskLog : {},
    onboarded: v.onboarded === true || (v.onboarded === undefined && profiles.length > 0), settings: { ...EMPTY.settings, ...(isObj(v.settings) ? v.settings : {}), reminders: { ...EMPTY.settings.reminders, ...(isObj(v.settings?.reminders) ? v.settings.reminders : {}) } } };
}
export interface LoadResult { state: AppState | null; migrated: boolean; error?: string }
/** Loads current DB; if absent, copies the legacy pre-rebrand DB into the new one (legacy left untouched). */
export async function loadState(): Promise<LoadResult> {
  try {
    const cur = await get(DB_NAME, KEY); if (cur) return { state: sanitize(cur), migrated: false };
    let legacy: unknown; try { legacy = await get(LEGACY.db, LEGACY.key); } catch { legacy = undefined; }
    if (legacy) { const s = sanitize(legacy); await put(DB_NAME, KEY, s); const back = await get(DB_NAME, KEY); if (!back) throw new Error('Migration verification failed'); return { state: s, migrated: true }; }
    return { state: null, migrated: false };
  } catch (e: any) { return { state: null, migrated: false, error: e?.message ?? String(e) }; }
}
export async function saveState(s: AppState): Promise<{ ok: boolean; error?: string; quota?: boolean }> {
  try { await put(DB_NAME, KEY, s); return { ok: true }; } catch (e: any) { return { ok: false, error: e?.message ?? String(e), quota: e?.name === 'QuotaExceededError' }; }
}
