import { RULES as R, RED_SYMPTOMS, AMBER_SYMPTOMS, ASSESSMENT_VERSION } from './rules';
import { isNum, validateValue, LIMITS } from './validate';
import type { Assessment, NumKey, Observation, Profile, Reading, Source, Status } from './types';

/** Latest VALID value for a key. Implausible values are skipped (and reported by assess as ignored). */
export function latest(rs: Reading[], k: NumKey) {
  for (let i = rs.length - 1; i >= 0; i--) { const v = rs[i][k]; if (isNum(v) && !validateValue(k, v)) return { v, ts: rs[i].ts, src: rs[i].source as Source }; }
  return null;
}
export const series = (rs: Reading[], k: NumKey) => rs.filter((r) => isNum(r[k]) && !validateValue(k, r[k]));
/** Mean of valid values with timestamps in [from, to). Calendar-window based. */
export function windowMean(rs: Reading[], k: NumKey, from: number, to: number) {
  const v = series(rs, k).filter((r) => r.ts >= from && r.ts < to).map((r) => r[k] as number); return { n: v.length, mean: v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN };
}
const pct = (v: number, b: number) => ((v - b) / b) * 100;
const f1 = (n: number) => (Math.round(n * 10) / 10).toString();
const sg = (n: number) => (n > 0 ? '+' : '') + f1(n);
const bl = (n: number | undefined) => (isNum(n) && n > 0 ? n : undefined);
const hAgo = (ms: number) => Math.round(ms / 36e5);

const ENV_NOTE: Record<string, string> = {
  Spacecraft: 'Microgravity fluid shifts, cabin CO₂ and workload can all influence heart rate, blood pressure and how you feel.',
  'Space Station': 'Microgravity fluid shifts, cabin air quality and workload can influence cardiovascular readings and how you feel.',
  'Lunar Surface Base': 'Reduced gravity, dust exposure and surface workload can influence cardiovascular and respiratory readings.',
  'Mars Surface Base': 'Reduced gravity, dust, and strenuous surface activity can influence cardiovascular and respiratory readings.',
  'Rover / Surface Operations': 'Suit/rover thermal load, exertion and limited hydration access can influence heart rate, temperature and fatigue.',
};

export function assess(p: Profile, rs: Reading[], sym: { ts: number; ids: string[] } | undefined, now = Date.now()): Assessment {
  const b = p.baseline ?? ({} as Profile['baseline']); const obs: Observation[] = []; const factors = new Set<string>(); const quality: string[] = []; const patterns: string[] = [];
  const staleMs = R.staleHours * 36e5; const symIds = sym?.ids ?? [];
  const add = (level: 0 | 1 | 2, label: string, detail: string, x: Partial<Observation> = {}) => obs.push({ level, label, detail, ...x });
  const fresh = (k: NumKey) => { const l = latest(rs, k); if (!l) return null; if (now - l.ts > staleMs) { quality.push(`Last ${LBL[k]} (${l.v}) was ${hAgo(now - l.ts)} h ago — too old to use for the current assessment.`); return null; } return l; };
  const LBL: Record<string, string> = { hr: 'heart rate', sys: 'blood pressure', spo2: 'SpO₂', temp: 'temperature', sleepH: 'sleep', fatigue: 'fatigue', mood: 'mood', hydration: 'hydration', stress: 'stress', cognition: 'mental clarity', glucose: 'glucose' };
  const NUMK = Object.keys(LIMITS) as NumKey[];
  const ignored = rs.reduce((n, r) => n + NUMK.filter((k) => r[k] !== undefined && validateValue(k, r[k]) !== null).length, 0);
  if (ignored) quality.push(`${ignored} implausible or invalid stored value(s) were ignored.`);

  for (const id of symIds) {
    if (RED_SYMPTOMS[id]) add(2, `Reported: ${RED_SYMPTOMS[id]}`, 'Treated as a potential emergency by the safety rules, whatever any measurement shows.', { key: 'symptom', at: sym!.ts, why: 'Emergency symptom rule (always overrides measurements and any explanatory text).' });
    else if (AMBER_SYMPTOMS[id]) add(1, `Reported: ${AMBER_SYMPTOMS[id]}`, 'A symptom you reported. Reassess and watch for changes.', { key: 'symptom', at: sym!.ts, why: 'Reported non-emergency symptom.' });
  }

  const hr = fresh('hr'); let hrUp = false;
  if (hr) {
    const base = bl(b.hr), d = base ? pct(hr.v, base) : NaN; const x = { key: 'hr' as NumKey, value: `${hr.v} BPM`, baseline: base ? `${base} BPM` : 'none set', deviation: base ? `${sg(d)}%` : 'n/a', at: hr.ts, source: hr.src };
    if (hr.v >= R.hrRed || hr.v <= R.hrLowRed) add(2, 'Heart rate outside general adult resting range', `${hr.v} BPM (prototype urgent thresholds ${R.hrLowRed}/${R.hrRed}).`, { ...x, why: 'Conservative prototype urgent escalation threshold; not a diagnosis.' });
    else if (base ? Math.abs(d) >= R.hrDevPctAmber : hr.v < R.hrAbsLow || hr.v > R.hrAbsHigh) { hrUp = base ? d > 0 : hr.v > R.hrAbsHigh; add(1, base ? `Heart rate ${d > 0 ? 'above' : 'below'} your baseline` : 'Heart rate outside general adult resting reference', `${hr.v} BPM${base ? ` vs your usual ${base} BPM (${sg(d)}%)` : ` (no personal baseline; general adult resting reference ${R.hrAbsLow}–${R.hrAbsHigh})`}.`, { ...x, why: base ? `Deviation ≥ ${R.hrDevPctAmber}% from personal baseline.` : 'No baseline: general adult resting reference used as a screening guide.' }); factors.add(ENV_NOTE[p.mission.env]); }
    else add(0, 'Heart rate near your baseline', `${hr.v} BPM${base ? ` vs usual ${base} BPM` : ''}.`, x);
    const h = series(rs, 'hr').slice(-R.hrRisingReadings);
    if (h.length === R.hrRisingReadings && h.every((r, i) => i === 0 || r.hr! > h[i - 1].hr!) && pct(h[h.length - 1].hr!, h[0].hr!) >= R.hrRisingTotalPct) {
      hrUp = true; add(1, 'Heart rate rising across recent readings', `${h.map((r) => r.hr).join(' → ')} BPM (${sg(pct(h[h.length - 1].hr!, h[0].hr!))}% over ${h.length} readings).`, { key: 'hr', at: hr.ts, source: hr.src, why: `Strictly rising over ${R.hrRisingReadings} readings and ≥ ${R.hrRisingTotalPct}% total.` });
      patterns.push('Steady upward heart-rate trend'); factors.add('Possible contributors include poor sleep, dehydration, stress, exertion, caffeine, cabin CO₂ or illness. This tool cannot tell which.');
    }
  }
  const sys = fresh('sys'), dia = fresh('dia'); const bpFresh = !!(sys && dia);
  if (sys && dia) {
    const bs = bl(b.sys), bd = bl(b.dia), d = bs ? pct(sys.v, bs) : NaN; const x = { key: 'sys' as NumKey, value: `${sys.v}/${dia.v} mmHg`, baseline: bs && bd ? `${bs}/${bd} mmHg` : 'none set', deviation: bs ? `${sg(d)}% (systolic)` : 'n/a', at: sys.ts, source: sys.src };
    if (sys.v > R.sysRed || dia.v > R.diaRed) add(2, 'Blood pressure in severe range — repeat and escalate', `${sys.v}/${dia.v} mmHg. Recheck after at least 1 minute and follow the mission medical protocol; symptoms such as chest pain, breathlessness, weakness or vision/speech change require urgent help.`, { ...x, why: 'Adult AHA severe-range screening threshold (>180 systolic or >120 diastolic); not a diagnosis.' });
    else if (sys.v >= R.sysAmber || dia.v >= R.diaAmber || (bs && d >= R.bpDevPctAmber)) { add(1, 'Blood pressure above adult reference category or personal baseline', `${sys.v}/${dia.v} mmHg${bs ? ` vs usual ${bs}/${bd}` : ''}.`, { ...x, why: `Adult AHA stage 1 threshold (≥130 systolic or ≥80 diastolic), or ≥ ${R.bpDevPctAmber}% above personal baseline.` }); factors.add(ENV_NOTE[p.mission.env]); }
    else if (sys.v >= 120 && sys.v <= 129 && dia.v < 80) add(0, 'Blood pressure in elevated adult category', `${sys.v}/${dia.v} mmHg. This is an elevated category, not hypertension; confirm using repeated properly taken readings.`, { ...x, why: 'AHA adult elevated category: systolic 120–129 and diastolic below 80 mmHg.' });
    else add(0, 'Blood pressure within adult reference category', `${sys.v}/${dia.v} mmHg${bs ? ` vs usual ${bs}/${bd}` : ''}.`, x);
  }
  const sp = fresh('spo2');
  if (sp) {
    const base = bl(b.spo2); const x = { key: 'spo2' as NumKey, value: `${sp.v}%`, baseline: base ? `${base}%` : 'none set', deviation: base ? `${sg(sp.v - base)} points` : 'n/a', at: sp.ts, source: sp.src };
    if (sp.v < R.spo2Red) add(2, 'Blood oxygen below urgent screening threshold', `${sp.v}% SpO₂.`, { ...x, why: `Below ${R.spo2Red}% screening threshold; repeat/check sensor and follow mission medical protocol.` });
    else if (sp.v < R.spo2Amber || (base && base - sp.v >= R.spo2BaselineDrop)) { add(1, 'Blood oxygen below your usual', `${sp.v}%${base ? ` vs usual ${base}%` : ''}.`, { ...x, why: `Below typical healthy adult reference ${R.spo2Amber}% or ≥ ${R.spo2BaselineDrop} points under personal baseline.` }); factors.add('Check sensor fit, cold fingers and motion first; also consider cabin air quality (CO₂, ventilation).'); }
    else add(0, 'Blood oxygen near your baseline', `${sp.v}%${base ? ` vs usual ${base}%` : ''}.`, x);
  }
  const tp = fresh('temp');
  if (tp) {
    const base = bl(b.temp); const x = { key: 'temp' as NumKey, value: `${f1(tp.v)} °C`, baseline: base ? `${f1(base)} °C` : 'none set', deviation: base ? `${sg(tp.v - base)} °C` : 'n/a', at: tp.ts, source: tp.src };
    if (tp.v >= R.tempRed) add(2, 'High temperature (illustrative limit)', `${f1(tp.v)} °C.`, { ...x, why: `≥ illustrative critical limit ${R.tempRed} °C.` });
    else if (tp.v >= R.tempAmber || (base && tp.v - base >= R.tempBaselineRise)) { add(1, 'Temperature above your usual', `${f1(tp.v)} °C${base ? ` vs usual ${f1(base)} °C` : ''}.`, { ...x, why: `≥ ${R.tempAmber} °C or ≥ ${R.tempBaselineRise} °C above baseline.` }); factors.add('Exercise, suit/rover heat load and thermometer technique can raise readings.'); }
    else add(0, 'Temperature near your baseline', `${f1(tp.v)} °C.`, x);
  }
  const gl = fresh('glucose');
  if (gl) { const x = { key: 'glucose' as NumKey, value: `${gl.v} mg/dL`, baseline: 'none (illustrative range)', at: gl.ts, source: gl.src };
    if (gl.v <= R.glucoseRedLow || gl.v >= R.glucoseRedHigh) add(2, 'Blood glucose far outside range (illustrative)', `${gl.v} mg/dL.`, { ...x, why: 'Illustrative critical limit.' });
    else if (gl.v < R.glucoseLow || gl.v > R.glucoseHigh) add(1, 'Blood glucose outside illustrative range', `${gl.v} mg/dL. Note whether you ate recently.`, { ...x, why: `Outside ${R.glucoseLow}–${R.glucoseHigh} mg/dL (illustrative).` });
    else add(0, 'Blood glucose within illustrative range', `${gl.v} mg/dL.`, x); }

  const sl = fresh('sleepH'), fa = fresh('fatigue'), mo = fresh('mood'); let sleepBad = false, fatBad = false, moodBad = false;
  if (sl) { const base = bl(b.sleepH); const x = { key: 'sleepH' as NumKey, value: `${f1(sl.v)} h`, baseline: base ? `${f1(base)} h` : 'none set', deviation: base ? `${sg(sl.v - base)} h` : 'n/a', at: sl.ts, source: sl.src };
    if (sl.v < R.sleepLowH || (base && base - sl.v >= R.sleepBaselineDropH)) { sleepBad = true; add(1, 'Short sleep', `${f1(sl.v)} h${base ? ` vs usual ${f1(base)} h` : ''}.`, { ...x, why: `Under ${R.sleepLowH} h or ≥ ${R.sleepBaselineDropH} h below baseline.` }); factors.add('Light/dark cycle, noise, workload and schedule shifts can disrupt sleep in spacecraft.'); } else add(0, 'Sleep close to usual', `${f1(sl.v)} h.`, x); }
  if (fa) { const f = series(rs, 'fatigue').slice(-4); const rising = f.length === 4 && f[3].fatigue! - f[0].fatigue! >= R.fatigueRise; const x = { key: 'fatigue' as NumKey, value: `${fa.v}/10`, at: fa.ts, source: fa.src };
    if (fa.v >= R.fatigueHigh || rising) { fatBad = true; add(1, rising ? 'Fatigue rising' : 'High fatigue', `Fatigue ${fa.v}/10${rising ? ` (was ${f[0].fatigue}/10 four check-ins ago)` : ''}. Fatigue affects judgment and safety.`, { ...x, why: `≥ ${R.fatigueHigh}/10 or rise ≥ ${R.fatigueRise} over 4 check-ins.` }); } else add(0, 'Fatigue manageable', `${fa.v}/10.`, x); }
  if (mo) { const x = { key: 'mood' as NumKey, value: `${mo.v}/10`, at: mo.ts, source: mo.src }; if (mo.v <= R.moodLow) { moodBad = true; add(1, 'Low mood', `Mood ${mo.v}/10. Talking with a crewmate or the support team can help.`, { ...x, why: `≤ ${R.moodLow}/10.` }); } else add(0, 'Mood reported', `${mo.v}/10.`, x); }
  const st = fresh('stress'); if (st && st.v >= R.stressHigh) add(1, 'High stress', `Stress ${st.v}/10.`, { key: 'stress', value: `${st.v}/10`, at: st.ts, source: st.src, why: `≥ ${R.stressHigh}/10.` });
  const hy = fresh('hydration'); if (hy && hy.v <= R.hydrationLow) { add(1, 'Low hydration (self-rated)', `${hy.v}/10.`, { key: 'hydration', value: `${hy.v}/10`, at: hy.ts, source: hy.src, why: `≤ ${R.hydrationLow}/10.` }); factors.add('Dehydration can raise heart rate and fatigue.'); }
  const cg = fresh('cognition'); if (cg && cg.v <= R.cognitionLow) add(1, 'Reduced mental clarity (self-rated)', `${cg.v}/10. Avoid critical tasks and consider reassessment.`, { key: 'cognition', value: `${cg.v}/10`, at: cg.ts, source: cg.src, why: `≤ ${R.cognitionLow}/10.` });

  // Multi-signal patterns: reported as ONE observation (severity is the max, never summed), correlation ≠ causation.
  const wb = [sleepBad && 'less sleep', fatBad && 'more fatigue', moodBad && 'lower mood'].filter(Boolean) as string[];
  if (hrUp && (sleepBad || fatBad)) { patterns.push(`Higher heart rate together with ${[sleepBad && 'less sleep', fatBad && 'more fatigue'].filter(Boolean).join(' and ')}`); add(1, 'Possible concerning pattern: heart rate up with sleep/fatigue change', 'These indicators moved together. This is an observation, not a cause or a diagnosis; related indicators are not counted twice in the status.', { key: 'pattern', why: 'Heart-rate rise + reduced sleep and/or higher fatigue in current data.' }); }
  if (wb.length >= 2) { patterns.push(`Combined change: ${wb.join(' + ')}`); factors.add('Sleep, fatigue and mood often move together under isolation, workload and circadian strain. This is an observation, not a diagnosis.'); }

  // Data sufficiency / quality
  const coreFresh = [!!hr, bpFresh, !!sp, !!tp].filter(Boolean).length;
  const w: [boolean, number][] = [[!!hr, 15], [bpFresh, 15], [!!sp, 15], [!!tp, 15], [!!sl, 10], [!!fa, 10], [!!mo, 10], [!!hy, 10]];
  let completeness = w.reduce((a, [ok, n]) => a + (ok ? n : 0), 0);
  if (!rs.length) quality.push('No measurements recorded yet.');
  if (rs.length && coreFresh < R.minFreshCoreSignals) quality.push(`Only ${coreFresh} of 4 core vital signs (heart rate, blood pressure, SpO₂, temperature) are recent (within ${R.staleHours} h); at least ${R.minFreshCoreSignals} are needed for a reliable assessment.`);
  (['hr', 'spo2', 'temp'] as NumKey[]).forEach((k) => { if (rs.length && !latest(rs, k)) quality.push(`No ${LBL[k]} reading has ever been recorded.`); });
  if (series(rs, 'hr').length < 5) { quality.push('Fewer than 5 heart-rate readings: trend and baseline comparison are weak.'); completeness = Math.max(0, completeness - 10); }
  (['hr', 'sys', 'dia', 'spo2', 'temp'] as const).forEach((k) => { if (!bl((b as any)[k]) && (k !== 'dia')) quality.push(`No personal baseline for ${LBL[k === 'sys' ? 'sys' : k]}: ${k === 'hr' ? 'generic illustrative range used' : 'absolute rules only'}.`); });
  const srcs = new Set(obs.filter((o) => o.source).map((o) => o.source)); if (srcs.has('simulated')) quality.push('Assessment uses SIMULATED demonstration data — not real sensor readings.'); if (srcs.has('manual')) quality.push('Manual entries depend on equipment accuracy and technique; they are not live sensor feeds.');

  const level = obs.reduce<number>((m, o) => Math.max(m, o.level), 0);
  let status: Status, statusReason: string;
  if (level === 2) { status = 'RED'; statusReason = obs.filter((o) => o.level === 2).map((o) => o.label).join('; ') + ' — a configured critical rule was triggered.'; }
  else if (level === 1) { status = 'AMBER'; statusReason = obs.filter((o) => o.level === 1 && o.key !== 'pattern').map((o) => o.label).join('; ') + ' — a warning rule was triggered.'; }
  else if (!rs.length) { status = 'UNKNOWN'; statusReason = 'No measurements are recorded for this astronaut, so no status can be given.'; }
  else if (coreFresh < R.minFreshCoreSignals) { status = 'UNKNOWN'; statusReason = `Not enough recent data: only ${coreFresh} of 4 core vital signs were measured in the last ${R.staleHours} h.`; }
  else { status = 'GREEN'; statusReason = `${coreFresh} of 4 core vital signs are recent and no configured warning rule was triggered.`; }
  const next: string[] = [], esc: string[] = [];
  if (status === 'RED') { next.push('Open the Emergency Center now and follow the on-screen steps.', 'Do not wait for further questions or repeat measurements before alerting crew.'); esc.push('Alert nearby crew immediately.', 'Follow the approved onboard medical checklist / flight rules.', 'Contact the flight surgeon / ground when a link is available (AETHRA does not transmit).'); }
  else if (status === 'AMBER') { next.push('Rest briefly, then repeat the flagged measurement and check sensor fit and technique.', 'Log any symptoms in Health Assessment.', 'Keep hydration, sleep and meals on schedule.'); esc.push('If the change persists or worsens, or new symptoms appear, tell the crew medical officer.', 'If any symptom becomes severe, use the Emergency Center.'); }
  else if (status === 'UNKNOWN') { next.push('Record a fresh heart rate, blood pressure, SpO₂ and temperature in Health Check.'); esc.push('UNKNOWN does not mean healthy. If you feel unwell, report symptoms or use the Emergency Center.'); }
  else { next.push('Continue routine monitoring and your daily health check.'); esc.push('If you feel unwell despite normal readings, report symptoms — readings do not override how you feel.'); }
  const reassess = status === 'RED' ? 'Immediately after alerting crew, as care allows.' : status === 'AMBER' ? 'Repeat in about 30–60 minutes after rest (illustrative), then at the next daily check.' : status === 'UNKNOWN' ? 'As soon as possible: take the missing measurements.' : 'At the next scheduled daily check.';
  obs.sort((a, c) => c.level - a.level);
  return { status, statusReason, observations: obs, factors: Array.from(factors), quality, reassess, next, escalation: esc, completeness: Math.round(completeness), patterns, version: ASSESSMENT_VERSION, asOf: now, freshSignals: coreFresh };
}

/** Per-reading flags (no trend, no staleness) for history filtering. 0 normal, 1 attention, 2 urgent. */
export function readingFlags(p: Profile, r: Reading): { key: NumKey; level: 1 | 2 }[] {
  const out: { key: NumKey; level: 1 | 2 }[] = []; const b = p.baseline; const ok = (k: NumKey) => isNum(r[k]) && !validateValue(k, r[k]);
  if (ok('hr')) { const base = bl(b.hr); if (r.hr! >= R.hrRed || r.hr! <= R.hrLowRed) out.push({ key: 'hr', level: 2 }); else if (base ? Math.abs(pct(r.hr!, base)) >= R.hrDevPctAmber : r.hr! < R.hrAbsLow || r.hr! > R.hrAbsHigh) out.push({ key: 'hr', level: 1 }); }
  if (ok('sys') && ok('dia')) { const bs = bl(b.sys); if (r.sys! > R.sysRed || r.dia! > R.diaRed) out.push({ key: 'sys', level: 2 }); else if (r.sys! >= R.sysAmber || r.dia! >= R.diaAmber || (bs && pct(r.sys!, bs) >= R.bpDevPctAmber)) out.push({ key: 'sys', level: 1 }); }
  if (ok('spo2')) { const base = bl(b.spo2); if (r.spo2! < R.spo2Red) out.push({ key: 'spo2', level: 2 }); else if (r.spo2! < R.spo2Amber || (base && base - r.spo2! >= R.spo2BaselineDrop)) out.push({ key: 'spo2', level: 1 }); }
  if (ok('temp')) { const base = bl(b.temp); if (r.temp! >= R.tempRed) out.push({ key: 'temp', level: 2 }); else if (r.temp! >= R.tempAmber || (base && r.temp! - base >= R.tempBaselineRise)) out.push({ key: 'temp', level: 1 }); }
  if (ok('glucose')) { if (r.glucose! <= R.glucoseRedLow || r.glucose! >= R.glucoseRedHigh) out.push({ key: 'glucose', level: 2 }); else if (r.glucose! < R.glucoseLow || r.glucose! > R.glucoseHigh) out.push({ key: 'glucose', level: 1 }); }
  if (ok('sleepH') && (r.sleepH! < R.sleepLowH || (bl(b.sleepH) && b.sleepH - r.sleepH! >= R.sleepBaselineDropH))) out.push({ key: 'sleepH', level: 1 });
  if (ok('fatigue') && r.fatigue! >= R.fatigueHigh) out.push({ key: 'fatigue', level: 1 });
  if (ok('mood') && r.mood! <= R.moodLow) out.push({ key: 'mood', level: 1 });
  return out;
}
