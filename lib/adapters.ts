import type { Profile, Reading } from './types';
import { series } from './assess';
/** Provenance of every displayed number. 'sensor' and 'public-dataset' are reserved for FUTURE real adapters; none are connected today. */
export type Provenance = 'sensor' | 'public-dataset' | 'manual' | 'simulated' | 'missing';
export interface Point { ts: number; v: number }
export interface MetricSeries { id: string; label: string; unit: string; provenance: Provenance; source: string; points: Point[]; note?: string; cautionAbove?: number; cautionNote?: string }
export interface AdapterCtx { profile: Profile; readings: Reading[]; now: number }
export interface HazardAdapter { id: string; hazard: 'radiation' | 'isolation' | 'distance' | 'gravity' | 'environment'; name: string; read(c: AdapterCtx): MetricSeries[] }

function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = (s: string) => Array.from(s).reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 11);
const days = (now: number, n = 14) => Array.from({ length: n }, (_, i) => ({ i, ts: now - (n - 1 - i) * 864e5 }));
const missing = (id: string, label: string, unit: string, why: string): MetricSeries => ({ id, label, unit, provenance: 'missing', source: why, points: [] });

export const radiationAdapter: HazardAdapter = { id: 'radiation-sim', hazard: 'radiation', name: 'Simulated deep-space dosimetry', read({ profile, now }) {
  if (profile.mission.env !== 'Spacecraft') return [missing('dose', 'Dose-equivalent rate', 'mSv/day', 'No dosimeter adapter for this environment (none connected).')];
  const r = rng(hash(profile.mission.name)); const d = profile.mission.day;
  const rate = days(now).map(({ i, ts }) => ({ ts, v: Math.round((1.8 + (r() - 0.5) * 0.3) * 100) / 100 }));
  const cum = days(now).map(({ i, ts }) => ({ ts, v: Math.round(1.8 * (d - 13 + i)) }));
  const source = 'SIMULATED by AETHRA. Scaled around ~1.8 mSv/day, the average galactic-cosmic-ray dose-equivalent rate reported for the Mars Science Laboratory cruise (Zeitlin et al., 2013). Not this crew’s measurements.';
  return [{ id: 'dose', label: 'Dose-equivalent rate', unit: 'mSv/day', provenance: 'simulated', source, points: rate }, { id: 'cum', label: 'Cumulative mission dose (estimate)', unit: 'mSv', provenance: 'simulated', source, points: cum, note: 'No approved personal limit is displayed because none was verified for this prototype.' }];
} };
export const environmentAdapter: HazardAdapter = { id: 'env-sim', hazard: 'environment', name: 'Simulated cabin environment', read({ profile, now }) {
  if (!['Spacecraft', 'Space Station'].includes(profile.mission.env)) return ['co2', 'temp', 'rh', 'pm'].map((k) => missing(k, k.toUpperCase(), '', 'No environmental sensor adapter for this environment (none connected).'));
  const r = rng(hash(profile.id + 'env')); const s = 'SIMULATED by AETHRA; no cabin sensors are connected.';
  const mk = (id: string, label: string, unit: string, base: number, amp: number, dp: number, extra: Partial<MetricSeries> = {}): MetricSeries => ({ id, label, unit, provenance: 'simulated', source: s, points: days(now).map(({ ts }) => ({ ts, v: Math.round((base + (r() - 0.5) * 2 * amp) * dp) / dp })), ...extra });
  return [mk('co2', 'Cabin CO₂', 'ppm', 2800, 250, 1, { cautionAbove: 5000, cautionNote: 'Illustrative caution level only — not an approved exposure limit.' }), mk('temp', 'Cabin temperature', '°C', 22.5, 0.6, 10), mk('rh', 'Relative humidity', '%', 45, 4, 1), mk('pm', 'Airborne particles (PM2.5)', 'µg/m³', 6, 2, 10)];
} };
export const gravityAdapter: HazardAdapter = { id: 'gravity-readings', hazard: 'gravity', name: 'Exercise log (from health readings)', read({ readings }) {
  const pts = series(readings, 'exerciseMin'); if (!pts.length) return [missing('ex', 'Exercise', 'min/day', 'No exercise entries recorded.')];
  const prov = pts.some((r) => r.source === 'manual') ? 'manual' : 'simulated';
  return [{ id: 'ex', label: 'Exercise countermeasure time', unit: 'min', provenance: prov, source: prov === 'manual' ? 'Manual entries (some points may be simulated).' : 'SIMULATED by AETHRA.', points: pts.map((r) => ({ ts: r.ts, v: r.exerciseMin as number })) }];
} };
export const ADAPTERS: HazardAdapter[] = [radiationAdapter, environmentAdapter, gravityAdapter];
export const readAdapters = (c: AdapterCtx) => ADAPTERS.flatMap((a) => a.read(c).map((m) => ({ ...m, adapter: a.id, hazard: a.hazard })));

export interface Comms { oneWayMin: number; roundTripMin: number; open: boolean; provenance: Provenance; note: string }
/** SIMULATED communication geometry. Real delay depends on actual planetary positions (range ≈ 3–22 light-minutes for Mars). */
export function commsStatus(p: Profile, now: number): Comms {
  const d = p.mission.destination.toLowerCase(); let oneWay = 0, note = 'Simulated.';
  if (d.includes('mars')) { oneWay = 3 + 19 * (0.5 - 0.5 * Math.cos((2 * Math.PI * (p.mission.day % 780)) / 780)); note = 'Simulated approximation: Mars–Earth one-way light time varies between roughly 3 and 22 minutes.'; }
  else if (d.includes('moon') || d.includes('lunar')) { oneWay = 1.3 / 60; note = 'Simulated: Earth–Moon one-way light time is about 1.3 seconds.'; }
  else note = 'Low Earth orbit: negligible light-time delay (relay scheduling not simulated).';
  const open = Math.floor(now / (30 * 60e3)) % 8 !== 0; // deterministic fake link outage 1 of 8 half-hour slots
  return { oneWayMin: Math.round(oneWay * 10) / 10, roundTripMin: Math.round(oneWay * 20) / 10, open, provenance: 'simulated', note };
}
