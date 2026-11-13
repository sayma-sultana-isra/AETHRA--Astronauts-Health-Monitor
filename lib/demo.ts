import type { Profile, Reading, ScenarioId } from './types';

export const SCENARIOS: { id: ScenarioId; label: string; desc: string }[] = [
  { id: 'stable', label: 'Stable health', desc: 'All values near personal baseline.' },
  { id: 'fatigue', label: 'Increasing fatigue', desc: 'Fatigue rises while sleep and mood decline over a week.' },
  { id: 'hrtrend', label: 'Unusual heart rate trend', desc: 'Resting heart rate climbs over four days.' },
  { id: 'sleep', label: 'Sleep disruption', desc: 'Sleep duration and quality fall; fatigue follows.' },
  { id: 'chest', label: 'Chest pain emergency', desc: 'Sudden chest pain with abnormal readings.' },
];
const mission = { name: 'Mars Transit Simulation', day: 184, durationDays: 520, destination: 'Mars (transit)', env: 'Spacecraft' as const };
export const DEMO_PROFILES: Profile[] = [
  { id: 'AM-001', name: 'Cmdr. Amara Okoye', age: 41, history: 'No chronic conditions (simulated).', allergies: 'None known (simulated)', meds: 'None (simulated)', baseline: { hr: 62, sys: 118, dia: 76, spo2: 98, temp: 36.6, sleepH: 7 }, mission, simulated: true },
  { id: 'AM-002', name: 'Dr. Kenji Mori', age: 38, history: 'Mild seasonal allergic rhinitis (simulated).', allergies: 'Pollen (simulated)', meds: 'None (simulated)', baseline: { hr: 70, sys: 122, dia: 79, spo2: 97, temp: 36.7, sleepH: 6.8 }, mission, simulated: true },
  { id: 'AM-003', name: 'Lt. Sofia Reyes', age: 45, history: 'Previous lower-back strain (simulated).', allergies: 'None known (simulated)', meds: 'Over-the-counter pain relief as needed (simulated)', baseline: { hr: 66, sys: 126, dia: 82, spo2: 97, temp: 36.5, sleepH: 7.2 }, mission, simulated: true },
];
export const DEFAULT_SCENARIOS: Record<string, ScenarioId> = { 'AM-001': 'stable', 'AM-002': 'sleep', 'AM-003': 'stable' };

function rng(seed: number) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = (s: string) => Array.from(s).reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
const r1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, a: number, z: number) => Math.min(z, Math.max(a, n));

/** Deterministic SIMULATED 14-day history for demonstration. Not real sensor data. */
export function genReadings(p: Profile, sc: ScenarioId, now: number): { readings: Reading[]; symptoms: string[] } {
  const r = rng(hash(p.id + sc)); const j = (a: number) => (r() - 0.5) * 2 * a; const b = p.baseline;
  const out: Reading[] = []; let symptoms: string[] = [];
  for (let i = 0; i < 14; i++) {
    const d = 13 - i; let hr = b.hr + j(2), sys = b.sys + j(3), dia = b.dia + j(2), spo2 = b.spo2 + j(0.6), temp = b.temp + j(0.15);
    let sleepH = b.sleepH + j(0.4), sleepQ = 7 + j(1), mood = 7 + j(1), fatigue = 3 + j(1), stress = 3 + j(1), hydration = 7 + j(1), cognition = 8 + j(0.8), exercise = 60 + j(15), social = 7 + j(1);
    if (sc === 'fatigue' && i >= 7) { const q = (i - 6) / 7; fatigue += 5 * q; sleepH -= 1.5 * q; mood -= 3 * q; stress += 2 * q; exercise -= 25 * q; social -= 3 * q; }
    if (sc === 'sleep' && i >= 8) { const q = (i - 7) / 6; sleepH -= 2.8 * q; sleepQ -= 3.5 * q; fatigue += 3 * q; mood -= 2 * q; exercise -= 10 * q; social -= 1.5 * q; }
    if (sc === 'hrtrend' && i >= 10) hr = b.hr + [2, 11, 20, 28][i - 10];
    if (sc === 'chest' && i === 13) { hr = b.hr + 42; sys = b.sys + 36; dia = b.dia + 18; spo2 = b.spo2 - 3; symptoms = ['chest_pain']; }
    out.push({
      id: `sim-${p.id}-${i}`, ts: now - d * 864e5 - 15 * 6e4, source: 'simulated',
      hr: Math.round(hr), sys: Math.round(sys), dia: Math.round(dia), spo2: Math.round(clamp(spo2, 80, 100)), temp: r1(temp),
      glucose: i % 2 === 0 ? Math.round(90 + j(6)) : undefined,
      sleepH: r1(clamp(sleepH, 2, 10)), sleepQ: Math.round(clamp(sleepQ, 1, 10)), mood: Math.round(clamp(mood, 1, 10)), fatigue: Math.round(clamp(fatigue, 1, 10)),
      stress: Math.round(clamp(stress, 1, 10)), hydration: Math.round(clamp(hydration, 1, 10)), cognition: Math.round(clamp(cognition, 1, 10)), exerciseMin: Math.round(clamp(exercise, 0, 300)), social: Math.round(clamp(social, 1, 10)),
    });
  }
  return { readings: out, symptoms };
}
