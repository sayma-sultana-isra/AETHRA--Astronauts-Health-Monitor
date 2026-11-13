import type { NumKey, Profile, Reading } from './types';
import { series } from './assess';
export interface IsolationResult { level: 'Not enough data' | 'Low' | 'Moderate' | 'High'; count: number; of: number; flags: string[]; checked: string[]; note: string }
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
/** Transparent count of concerning self-report/sleep indicators over the last 3 readings vs. earlier. Not a diagnosis, not a probability. */
export function isolationIndicator(p: Profile, rs: Reading[]): IsolationResult {
  const flags: string[] = [], checked: string[] = [];
  const last3 = (k: NumKey) => series(rs, k).slice(-3).map((r) => r[k] as number);
  const mood = last3('mood'), stress = last3('stress'), fat = last3('fatigue'), soc = last3('social'), sl = last3('sleepH'), sq = last3('sleepQ');
  if (mood.length >= 2) { checked.push('mood'); if (avg(mood) <= 4) flags.push(`Mood averaging ${avg(mood).toFixed(1)}/10 (≤ 4)`); const prior = series(rs, 'mood').slice(-10, -3).map((r) => r.mood as number); if (prior.length >= 3 && avg(prior) - avg(mood) >= 2) flags.push(`Mood fell ${(avg(prior) - avg(mood)).toFixed(1)} points vs earlier`); }
  if (stress.length >= 2) { checked.push('stress'); if (avg(stress) >= 7) flags.push(`Stress averaging ${avg(stress).toFixed(1)}/10 (≥ 7)`); }
  if (fat.length >= 2) { checked.push('fatigue'); if (avg(fat) >= 7) flags.push(`Fatigue averaging ${avg(fat).toFixed(1)}/10 (≥ 7)`); }
  if (soc.length >= 2) { checked.push('social connection'); if (avg(soc) <= 4) flags.push(`Social connection averaging ${avg(soc).toFixed(1)}/10 (≤ 4)`); }
  if (sl.length >= 2 || sq.length >= 2) { checked.push('sleep'); if ((sl.length >= 2 && p.baseline.sleepH - avg(sl) >= 1.5) || (sq.length >= 2 && avg(sq) <= 4)) flags.push('Sleep well below usual or poor quality'); }
  const note = 'Counts how many wellbeing indicators are currently concerning. Indicators are related (e.g. poor sleep affects mood), so this is a prompt to check in — not a probability, a cause, or a psychiatric assessment.';
  if (checked.length < 3) return { level: 'Not enough data', count: flags.length, of: checked.length, flags, checked, note };
  return { level: flags.length >= 4 ? 'High' : flags.length >= 2 ? 'Moderate' : 'Low', count: flags.length, of: checked.length, flags, checked, note };
}
