'use client';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { AppState, LabResult, Profile, Reading, Report, ScenarioId } from './types';
import { DEFAULT_SCENARIOS, DEMO_PROFILES, genReadings } from './demo';
import { assess } from './assess';
import { assessHybrid } from './hybrid';
import { EMPTY, loadState, saveState, sanitize } from './persist';
import { isDuplicateId } from './validate';
import type { LabFinding } from './labs';

export interface OSDLabReference { key: string; label: string; unit: string; min: number | null; max: number | null; study: string; matrix: string; sourceFile: string; referenceType: string }
export interface OSDAnalyte { value: number; unit: string; min: number | null; max: number | null; kind: string }
export interface OSDRecord { id: string; study: string; participant: string; sample: string; matrix: string; timepoint: string; recordType: 'sample-level' | 'group-comparison'; analytes?: Record<string, OSDAnalyte>; features?: { feature: string; logFC: number | null; pValue: number | null; adjustedPValue: number | null; averageExpression: number | null }[]; comparison?: string; dataType?: string }

export { EMPTY };

export function buildDemo(prev: AppState): AppState {
  const now = Date.now(); const readings: AppState['readings'] = {}, symptoms: AppState['symptoms'] = {};
  DEMO_PROFILES.forEach((p) => { const g = genReadings(p, DEFAULT_SCENARIOS[p.id], now); readings[p.id] = g.readings; if (g.symptoms.length) symptoms[p.id] = { ts: now, ids: g.symptoms }; });
  return { ...prev, labResults: {}, loaded: true, profiles: DEMO_PROFILES, activeId: 'AM-001', scenarios: { ...DEFAULT_SCENARIOS }, readings, symptoms, journal: [], reports: [], ops: {}, taskLog: {} };
}
export const todayKey = (id: string) => `${id}|${new Date().toISOString().slice(0, 10)}`;
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

interface Ctx {
  s: AppState; ready: boolean; online: boolean; set: (f: (s: AppState) => AppState) => void;
  profile?: Profile; readings: Reading[]; assessment?: ReturnType<typeof assess>; scenario?: ScenarioId;
  persistMsg: string | null; notice: string | null; dismissNotice: () => void;
  loadDemo: () => void; clearAll: () => void; setScenario: (sc: ScenarioId) => void;
  addReading: (r: Omit<Reading, 'id' | 'ts' | 'source'>, o?: { ts?: number; device?: string; forId?: string }) => void;
  addProfile: (p: Profile) => string | null; addReport: (r: Omit<Report, 'id' | 'ts' | 'transmitted'>) => Report;
  restore: (raw: string) => string | null;
  osdRecords: OSDRecord[]; osdReady: boolean; osdParticipant: string; setOSDParticipant: (id: string) => void;
  osdLabReferences: OSDLabReference[]; labResults: LabResult[]; labFindings: LabFinding[]; addLabResult: (r: Omit<LabResult, 'id' | 'source'>) => void;
}
const C = createContext<Ctx>(null as any);
export const useApp = () => useContext(C);

export function Provider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<AppState>(EMPTY); const [ready, setReady] = useState(false); const [online, setOnline] = useState(true);
  const [osdRecords, setOSDRecords] = useState<OSDRecord[]>([]); const [osdLabReferences, setOSDLabReferences] = useState<OSDLabReference[]>([]); const [osdReady, setOSDReady] = useState(false); const [osdParticipant, setOSDParticipant] = useState('C001');
  const [persistMsg, setPM] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null); const blocked = useRef(false); const first = useRef(true);
  useEffect(() => {
    let alive = true;
    Promise.all([fetch('/data/osd/records.json').then((r) => { if (!r.ok) throw new Error(`OSD data request failed (${r.status})`); return r.json(); }), fetch('/data/osd/reference-ranges.json').then((r) => { if (!r.ok) throw new Error(`OSD reference request failed (${r.status})`); return r.json(); })]).then(([d, refs]) => { if (!alive) return; if (Array.isArray(d.records)) setOSDRecords(d.records); if (Array.isArray(refs.references)) setOSDLabReferences(refs.references); }).catch(() => { if (alive) { setOSDRecords([]); setOSDLabReferences([]); } }).finally(() => alive && setOSDReady(true));
    loadState().then((r) => { if (!alive) return; if (r.error) { blocked.current = true; setPM(`Saved data could not be read (${r.error}). To protect it, AETHRA will not overwrite it this session. You can export a backup from Settings after fixing the problem or restore a backup file.`); } else if (r.state) { setS(r.state); if (r.migrated) setNotice('Your existing data from the previous ASTRA MED version was found and copied into AETHRA. The old copy was left untouched.'); } })
      .catch((e) => { blocked.current = true; setPM('Local storage is unavailable in this browser; data will not persist after refresh. ' + (e?.message ?? '')); }).finally(() => alive && setReady(true));
    setOnline(navigator.onLine); const on = () => setOnline(true), off = () => setOnline(false); window.addEventListener('online', on); window.addEventListener('offline', off);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => { alive = false; window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  useEffect(() => { if (!ready || blocked.current) return; if (first.current) { first.current = false; return; }
    const t = setTimeout(() => saveState(s).then((r) => { if (!r.ok) setPM(r.quota ? 'Browser storage is full — new data is NOT being saved. Export a backup and free space (delete old reports or journal entries).' : 'Saving to local storage failed: ' + r.error); else setPM((m) => (m && /full|failed/.test(m) ? null : m)); }), 200); return () => clearTimeout(t); }, [s, ready]);
  useEffect(() => { document.documentElement.classList.toggle('large-text', s.settings.largeText); document.documentElement.classList.toggle('reduce-motion', s.settings.reduceMotion); }, [s.settings.largeText, s.settings.reduceMotion]);
  const set = useCallback((f: (s: AppState) => AppState) => setS(f), []);
  const profile = s.profiles.find((p) => p.id === s.activeId);
  const readings = useMemo(() => (profile ? s.readings[profile.id] ?? [] : []), [s.readings, profile]);
  const labResults = useMemo(() => (profile ? s.labResults?.[profile.id] ?? [] : []), [s.labResults, profile]);
  const hybrid = useMemo(() => profile ? assessHybrid(profile, readings, s.symptoms[profile.id], labResults, osdLabReferences) : undefined, [profile, readings, s.symptoms, labResults, osdLabReferences]);
  const labFindings = hybrid?.labFindings ?? []; const assessment = hybrid?.assessment;
  const value: Ctx = {
    s, ready, online, set, profile, readings, assessment, scenario: profile ? s.scenarios[profile.id] : undefined, persistMsg, notice, dismissNotice: () => setNotice(null),
    loadDemo: () => set((x) => buildDemo(x)), clearAll: () => set((x) => ({ ...EMPTY, onboarded: x.onboarded, settings: x.settings })),
    setScenario: (sc) => set((x) => { const p = x.profiles.find((q) => q.id === x.activeId); if (!p) return x; const g = genReadings(p, sc, Date.now()); const sy = { ...x.symptoms }; if (g.symptoms.length) sy[p.id] = { ts: Date.now(), ids: g.symptoms }; else delete sy[p.id];
      return { ...x, scenarios: { ...x.scenarios, [p.id]: sc }, readings: { ...x.readings, [p.id]: g.readings }, symptoms: sy }; }),
    addReading: (r, o = {}) => set((x) => { const id = o.forId ?? x.activeId; const rec: Reading = { ...r, id: uid(), ts: o.ts ?? Date.now(), source: 'manual', device: o.device || undefined, recordedBy: x.activeId };
      return { ...x, readings: { ...x.readings, [id]: [...(x.readings[id] ?? []), rec].sort((a, b) => a.ts - b.ts) } }; }),
    addProfile: (p) => { if (isDuplicateId(s.profiles.map((q) => q.id), p.id)) return `The astronaut ID “${p.id}” is already used. Choose a different ID.`; set((x) => ({ ...x, loaded: true, profiles: [...x.profiles, p], activeId: p.id, scenarios: { ...x.scenarios, [p.id]: 'stable' }, readings: { ...x.readings, [p.id]: [] }, labResults: { ...x.labResults, [p.id]: [] } })); return null; },
    addLabResult: (r) => set((x) => { const id = x.activeId; const rec: LabResult = { ...r, id: uid(), source: 'manual' }; return { ...x, labResults: { ...x.labResults, [id]: [...(x.labResults?.[id] ?? []), rec].sort((a, b) => a.ts - b.ts) } }; }),
    addReport: (r) => { const rep: Report = { ...r, id: 'R-' + uid().slice(0, 8).toUpperCase(), ts: Date.now(), transmitted: false }; set((x) => ({ ...x, reports: [rep, ...x.reports] })); return rep; },
    restore: (raw) => { try { const st = sanitize(JSON.parse(raw)); blocked.current = false; setS(st); setPM(null); return null; } catch (e: any) { return e?.message ?? 'Invalid file'; } },
    osdRecords, osdReady, osdParticipant, setOSDParticipant, osdLabReferences, labResults, labFindings,
  };
  return <C.Provider value={value}>{children}</C.Provider>;
}
