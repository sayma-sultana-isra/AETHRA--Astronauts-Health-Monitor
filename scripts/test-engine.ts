import 'fake-indexeddb/auto';
import { assess, readingFlags } from '../lib/assess';
import { DEMO_PROFILES, genReadings } from '../lib/demo';
import { csvCell, parseCsv, toCsv } from '../lib/csv';
import { isDuplicateId, validateEntry } from '../lib/validate';
import { buildEmergencyReport } from '../lib/emergency';
import { buildDemo } from '../lib/store';
import { EMPTY, LEGACY, loadState, saveState, sanitize, STORE } from '../lib/persist';
import { reportSections } from '../lib/export';
import { isolationIndicator } from '../lib/isolation';
import { canView } from '../lib/access';
import { commsStatus } from '../lib/adapters';
import { assessLabResults, currentOutOfRange, type LabReference } from '../lib/labs';
import { assessHybrid } from '../lib/hybrid';
import { readFileSync } from 'node:fs';
import type { LabResult } from '../lib/types';
import type { Profile, Reading, ScenarioId } from '../lib/types';

const now = Date.now(); let fail = 0, n = 0;
const ok = (c: boolean, m: string) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const run = (sc: ScenarioId, pi = 1) => { const p = DEMO_PROFILES[pi]; const g = genReadings(p, sc, now); return assess(p, g.readings, g.symptoms.length ? { ts: now, ids: g.symptoms } : undefined, now); };
const P: Profile = DEMO_PROFILES[0];
const R = (o: Partial<Reading>, ageH = 1): Reading => ({ id: Math.random().toString(36), ts: now - ageH * 36e5, source: 'manual', ...o });

(async () => {
  // 1 no data
  ok(assess(P, [], undefined, now).status === 'UNKNOWN', '1. no data -> UNKNOWN (never GREEN)');
  ok(assess(P, [R({ hr: 62 })], undefined, now).status === 'UNKNOWN', '1b. only 1 core signal -> UNKNOWN');
  // 2 normal
  ok(run('stable', 0).status === 'GREEN', '2. normal recent readings -> GREEN');
  // 3 amber
  ok(run('hrtrend').status === 'AMBER' && run('hrtrend').patterns.some((x) => /heart-rate/.test(x)), '3. concerning HR deviation/trend -> AMBER with pattern');
  ok(run('sleep').status === 'AMBER', '3b. sleep disruption -> AMBER');
  const hrObs = run('hrtrend').observations.find((o) => o.key === 'hr' && o.level === 1)!;
  ok(!!(hrObs.value && hrObs.baseline && hrObs.deviation && hrObs.at && hrObs.source && hrObs.why), '3c. observation explains value, baseline, deviation, time, source, reason');
  // 4 red
  ok(run('chest').status === 'RED', '4. chest-pain scenario -> RED');
  ok(assess(P, [R({ hr: 140 }), R({ spo2: 98 }), R({ temp: 36.6 })], undefined, now).status === 'RED', '4b. HR 140 (illustrative critical) -> RED');
  ok(assess(P, [], { ts: now, ids: ['chest_pain'] }, now).status === 'RED', '4c. red-flag symptom with NO data -> RED');
  // 5 stale
  const old = [R({ hr: 62 }, 80), R({ sys: 118, dia: 76 }, 80), R({ spo2: 98 }, 80), R({ temp: 36.6 }, 80)];
  const st = assess(P, old, undefined, now); ok(st.status === 'UNKNOWN' && st.quality.some((q) => /too old/.test(q)), '5. stale data -> UNKNOWN with explanation');
  // 6 invalid
  const inv = validateEntry({ hr: 999, sys: 100, dia: 120 }); ok(!!inv.hr && !!inv.dia, '6. impossible HR and diastolic>=systolic rejected');
  ok(!validateEntry({ hr: 70, sys: 120, dia: 80 }).hr, '6b. valid entry accepted'); ok(!!validateEntry({ hr: 70 }, now, now + 3600e3).ts, '6c. future timestamp rejected');
  const bad = assess(P, [R({ hr: 5000 }), R({ spo2: 98 }), R({ temp: 36.6 })], undefined, now); ok(bad.status !== 'RED' && bad.quality.some((q) => /implausible/.test(q)), '6d. implausible stored value ignored, not treated as real');
  // 7 missing baseline
  const nb: Profile = { ...P, baseline: { hr: NaN, sys: NaN, dia: NaN, spo2: NaN, temp: NaN, sleepH: NaN } };
  const nbA = assess(nb, [R({ hr: 62 }), R({ sys: 118, dia: 76 }), R({ spo2: 98 }), R({ temp: 36.6 })], undefined, now);
  ok(nbA.status === 'GREEN' && nbA.quality.some((q) => /No personal baseline/.test(q)), '7. missing baseline -> transparent fallback note');
  ok(assess(nb, [R({ hr: 120 }), R({ spo2: 98 }), R({ temp: 36.6 })], undefined, now).status === 'AMBER', '7b. generic range used when no baseline');
  // multi-signal
  const ms: Profile = { ...P, baseline: { ...P.baseline, hr: 65, sleepH: 7 } };
  const msA = assess(ms, [R({ hr: 92, fatigue: 8, sleepH: 4.5, sys: 118, dia: 76, spo2: 98, temp: 36.6 })], undefined, now);
  ok(msA.status === 'AMBER' && msA.observations.some((o) => o.key === 'pattern'), '7c. HR 92 vs 65 + short sleep + fatigue -> single pattern observation');
  // 8 duplicate ids
  ok(isDuplicateId(['AM-001'], ' am-001 ') && !isDuplicateId(['AM-001'], 'AM-009'), '8. duplicate astronaut ID detected (case/space-insensitive)');
  const dd = sanitize({ profiles: [P, { ...P, name: 'dup' }], readings: {} }); ok(dd.profiles.length === 1, '8b. restore/import drops duplicate IDs');
  // 9 emergency attribution
  const st9 = buildDemo(EMPTY); const rep = buildEmergencyReport(st9, { reporterId: 'AM-001', subjectId: 'AM-002', emergencyId: 'chest_pain', severity: 'Urgent', timeline: [{ at: now, text: 'x' }], notes: '', ackBy: '', startedAt: now - 60e3, now });
  const subjHr = st9.readings['AM-002'].filter((r) => r.hr !== undefined).slice(-1)[0].hr; const repHr = st9.readings['AM-001'].filter((r) => r.hr !== undefined).slice(-1)[0].hr;
  ok(rep.astroId === 'AM-002' && rep.body.astronaut.id === 'AM-002', '9. other-crew emergency report is about the selected person');
  ok(rep.body.vitals.hr.value === subjHr && subjHr !== repHr, '9b. report vitals are the subject’s own (not the reporter’s)');
  const un = buildEmergencyReport(st9, { reporterId: 'AM-001', subjectId: 'UNLISTED', unlistedName: 'Visitor', emergencyId: 'chest_pain', severity: 'Urgent', timeline: [], notes: '', ackBy: '', startedAt: now, now });
  ok(un.body.vitals.hr === 'NOT AVAILABLE' && un.body.astronaut.id === 'UNLISTED', '9c. unlisted person -> vitals NOT AVAILABLE');
  const noData = { ...st9, readings: { ...st9.readings, 'AM-003': [] } }; ok(buildEmergencyReport(noData, { reporterId: 'AM-001', subjectId: 'AM-003', emergencyId: 'chest_pain', severity: 'Urgent', timeline: [], notes: '', ackBy: '', startedAt: now, now }).body.vitals.hr === 'NOT AVAILABLE', '9d. subject with no data -> NOT AVAILABLE');
  ok(reportSections({ id: 'R', ts: now, astroId: 'AM-002', kind: 'emergency', title: 't', body: rep.body, transmitted: false }).some((s) => s.h === 'Emergency'), '14. report sections render with correct astronaut and timestamps');
  ok(typeof rep.body.generatedAt === 'string' && rep.body.reportGeneratedAt && rep.body.communicationStatus.includes('no alert or report was transmitted'), '14b. report timestamps present and says nothing was transmitted');
  // 9e hybrid laboratory assessment: exact analyte/unit match only; OSD intervals never create RED.
  const labRef: LabReference = { key: 'white_blood_cell_count', label: 'White Blood Cell Count', unit: 'thousand_per_microliter', min: 3.8, max: 10.8, study: 'OSD-569', matrix: 'whole-blood', sourceFile: 'CBC', referenceType: 'source-supplied-laboratory-interval' };
  const lab: LabResult = { id: 'lab1', key: labRef.key, value: 2.9, unit: labRef.unit, ts: now, source: 'manual' };
  const labLow = assessLabResults([lab], [labRef], now);
  ok(labLow[0].flag === 'LOW' && currentOutOfRange(labLow).length === 1, '9e. lab value below exact OSD interval -> LOW attention finding');
  const labHigh = assessLabResults([{ ...lab, id: 'lab2', value: 12 }], [labRef], now);
  ok(labHigh[0].flag === 'HIGH', '9f. lab value above OSD interval -> HIGH attention finding');
  const labUnit = assessLabResults([{ ...lab, unit: 'cells_per_microliter' }], [labRef], now);
  ok(labUnit[0].flag === 'UNIT_MISMATCH', '9g. unit mismatch is not classified');
  const labOld = assessLabResults([{ ...lab, ts: now - 100 * 864e5 }], [labRef], now);
  ok(labOld[0].flag === 'STALE' && currentOutOfRange(labOld).length === 0, '9h. laboratory results older than 90 days do not affect current status');
  const labUnknown = assessLabResults([{ ...lab, key: 'unknown_marker' }], [labRef], now);
  ok(labUnknown[0].flag === 'NO_REFERENCE', '9i. analyte without source interval remains unclassified');
  const hybridA = assessHybrid(P, genReadings(P, 'stable', now).readings, undefined, [lab], [labRef], now).assessment;
  ok(hybridA.status === 'AMBER' && /laboratory result/.test(hybridA.statusReason), '9j. out-of-range recent lab result combines into overall AMBER status');
  const refFile = JSON.parse(readFileSync('public/data/osd/reference-ranges.json', 'utf8'));
  ok(refFile.references.length === 27 && refFile.references.every((r: any) => r.study === 'OSD-569' || r.study === 'OSD-575'), '9k. bundled NASA reference catalog contains 27 CBC/CMP intervals');
  // 10 CSV
  const tricky = ['a,b', 'say "hi"', 'line1\nline2', '=SUM(A1)', 'plain', '-5', '-abc'];
  const back = parseCsv(toCsv([tricky]))[0]; ok(back[0] === 'a,b' && back[1] === 'say "hi"' && back[2] === 'line1\nline2' && back[4] === 'plain' && back[5] === '-5', '10. CSV escapes commas, quotes, newlines (round-trip)');
  ok(csvCell('=SUM(A1)').startsWith("'") && csvCell('-abc').startsWith("'"), '10b. CSV neutralises formula injection');
  // 11 persistence + migration (fake IndexedDB)
  const demo = buildDemo(EMPTY); demo.onboarded = true; demo.labResults['AM-001'] = [{ id: 'lab-persist', key: 'white_blood_cell_count', value: 6.1, unit: 'thousand_per_microliter', ts: now, source: 'manual' }]; const sv = await saveState(demo); const ld = await loadState();
  ok(sv.ok && !!ld.state && ld.state.profiles.length === 3 && ld.state.readings['AM-001'].length === 14 && ld.state.labResults['AM-001'].length === 1 && ld.state.onboarded, '11. data persists and reloads from IndexedDB (simulated refresh)');
  await new Promise<void>((res) => { const r = indexedDB.deleteDatabase('aethra'); r.onsuccess = () => res(); r.onerror = () => res(); });
  const legacyDb: IDBDatabase = await new Promise((res) => { const r = indexedDB.open(LEGACY.db, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => res(r.result); });
  const oldState = { loaded: true, profiles: demo.profiles, activeId: 'AM-002', scenarios: {}, readings: demo.readings, symptoms: {}, journal: [{ id: 'j', ts: now, astroId: 'AM-001', text: 'private' }], reports: [], taskLog: {}, settings: { largeText: true, reminders: {} } };
  await new Promise<void>((res) => { const t = legacyDb.transaction(STORE, 'readwrite'); t.objectStore(STORE).put(oldState, LEGACY.key); t.oncomplete = () => res(); }); legacyDb.close();
  const mig = await loadState(); ok(mig.migrated && mig.state!.activeId === 'AM-002' && mig.state!.journal.length === 1 && mig.state!.settings.largeText && mig.state!.profiles.length === 3, '11b. legacy ASTRA MED database migrated into AETHRA with data intact');
  const again = await loadState(); ok(!again.migrated && !!again.state, '11c. after migration the new database is used');
  const still: boolean = await new Promise((res) => { const r = indexedDB.open(LEGACY.db, 1); r.onsuccess = () => { const g = r.result.transaction(STORE).objectStore(STORE).get(LEGACY.key); g.onsuccess = () => res(!!g.result); }; }); ok(still, '11d. legacy database left untouched');
  let threw = false; try { sanitize({ nope: 1 }); } catch { threw = true; } ok(threw, '11e. invalid stored/imported data is rejected');
  // misc
  ok(readingFlags(P, { id: 'x', ts: now, source: 'manual', hr: 130 }).some((f) => f.level === 2), 'history flags: critical reading flagged');
  const iso = isolationIndicator(P, genReadings(P, 'fatigue', now).readings); ok(['Moderate', 'High'].includes(iso.level) && iso.flags.length >= 2, 'isolation indicator reflects declining wellbeing with named flags');
  ok(isolationIndicator(P, genReadings(P, 'stable', now).readings).level === 'Low', 'isolation indicator Low for stable data');
  ok(isolationIndicator(P, []).level === 'Not enough data', 'isolation indicator: no data -> Not enough data');
  ok(!canView('crew', 'AM-001', 'AM-002', 'vitals') && canView('astronaut', 'AM-002', 'AM-002', 'vitals') && !canView('medical', 'AM-001', 'AM-002', 'journal'), 'access policy: crew cannot see vitals; journal never visible to others');
  ok(commsStatus(P, now).oneWayMin > 2 && commsStatus(P, now).provenance === 'simulated', 'comms delay is simulated and labelled');
  console.log(`\n${n - fail}/${n} passed`); process.exit(fail ? 1 : 0);
})();
