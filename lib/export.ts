import type { Assessment, Profile, Reading, Report } from './types';
import { latest } from './assess';
import { ALL_SYMPTOMS } from './rules';
import { toCsv } from './csv';

export const BRAND = { name: 'AETHRA', full: 'Astronaut Health Monitoring & Decision Support System', tagline: 'Beyond Earth, Beyond Limits.' };
export const REPORT_REFS = [
  'Patel ZS et al. (2020) Red risks for a journey to the red planet. npj Microgravity 6:33. doi:10.1038/s41526-020-00124-6',
  'Stepanek J, Blue RS, Parazynski S (2019) Space Medicine in the Era of Civilian Spaceflight. N Engl J Med 380(11):1053-1060. doi:10.1056/NEJMra1609012',
  'NASA Human Research Program — Five Hazards of Human Spaceflight. https://www.nasa.gov/hrp/hazards',
];
const NA = 'NOT AVAILABLE';
const slug = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
export const missionId = (p: Profile) => 'MSN-' + slug(p.mission.name);
const VITALS = ['hr', 'sys', 'dia', 'spo2', 'temp', 'glucose', 'sleepH', 'mood', 'fatigue', 'stress', 'hydration'] as const;

export interface ReportInput { subject: Profile | null; unlistedName?: string; readings: Reading[]; symIds: string[]; a: Assessment | null; extra?: Record<string, any> }
/** Report content is built ONLY from the subject's own data. If there is none, fields say NOT AVAILABLE. */
export function buildReportBody({ subject: p, unlistedName, readings: rs, symIds, a, extra = {} }: ReportInput): Record<string, any> {
  const vitals: Record<string, any> = {}; VITALS.forEach((k) => { const l = p ? latest(rs, k) : null; vitals[k] = l ? { value: l.v, recordedAt: new Date(l.ts).toISOString(), source: l.src } : NA; });
  return {
    product: BRAND.name, productFull: BRAND.full, generatedAt: new Date().toISOString(),
    notice: 'AETHRA is a research prototype, not a certified medical device and not endorsed by NASA or any agency. Not approved flight-surgeon guidance. Nothing in this report was transmitted anywhere by AETHRA.',
    astronaut: p ? { id: p.id, name: p.name, age: p.age, allergies: p.allergies, medications: p.meds, history: p.history, simulatedProfile: p.simulated } : { id: 'UNLISTED', name: unlistedName || 'Crew member not in roster', note: 'No health data held by AETHRA for this person.' },
    mission: p ? { id: missionId(p), name: p.mission.name, day: p.mission.day, destination: p.mission.destination, environment: p.mission.env } : NA,
    status: a ? a.status : 'UNKNOWN', statusReason: a ? a.statusReason : 'No data held for this person.',
    assessmentVersion: a?.version ?? NA, dataCompletenessPercent: a ? a.completeness : NA, assessmentAsOf: a ? new Date(a.asOf).toISOString() : NA,
    symptoms: symIds.map((i) => ALL_SYMPTOMS[i] ?? i), vitals, baseline: p ? p.baseline : NA,
    findings: a ? a.observations.map((o) => ({ finding: o.label, level: ['OK', 'ATTENTION', 'URGENT'][o.level], value: o.value ?? '', personalBaseline: o.baseline ?? '', deviation: o.deviation ?? '', recordedAt: o.at ? new Date(o.at).toISOString() : '', source: o.source ?? '', whyFlagged: o.why ?? '' })) : [],
    patterns: a?.patterns ?? [], dataQuality: a?.quality ?? [], nextSteps: a?.next ?? [], escalation: a?.escalation ?? [],
    references: REPORT_REFS, ...extra,
  };
}
export function download(name: string, mime: string, data: string | Blob) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime }); const u = URL.createObjectURL(blob);
  const el = document.createElement('a'); el.href = u; el.download = name; document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000);
}
export const toJSON = (r: Report) => download(`aethra-${r.id}.json`, 'application/json', JSON.stringify({ aethraReportId: r.id, kind: r.kind, createdAt: new Date(r.ts).toISOString(), ...r.body }, null, 2));
export function flat(o: any, pre = ''): [string, string][] {
  return Object.entries(o ?? {}).flatMap(([k, v]) => v && typeof v === 'object' && !Array.isArray(v) ? flat(v, pre + k + '.') : Array.isArray(v) ? [[pre + k, v.map((x) => (x && typeof x === 'object' ? Object.entries(x).map(([a, b]) => `${a}=${b}`).join('; ') : String(x))).join(' | ')] as [string, string]] : [[pre + k, String(v)] as [string, string]]);
}
export const toCSV = (r: Report) => download(`aethra-${r.id}.csv`, 'text/csv;charset=utf-8', '\uFEFF' + toCsv([['field', 'value'], ['reportId', r.id], ['kind', r.kind], ['createdAt', new Date(r.ts).toISOString()], ...flat(r.body)]));
export interface Section { h: string; lines: string[] }
export function reportSections(r: Report): Section[] {
  const b = r.body; const S: Section[] = []; const vit = Object.entries(b.vitals ?? {}).map(([k, v]: any) => `${k}: ${v === NA ? NA : `${v.value} (${v.recordedAt}, ${v.source})`}`);
  S.push({ h: 'Summary', lines: [`Report ID: ${r.id}  •  Type: ${r.kind}  •  Created: ${new Date(r.ts).toISOString()}`, `Astronaut: ${b.astronaut?.name} (${b.astronaut?.id})`, `Mission: ${b.mission === NA ? NA : `${b.mission.name} — ${b.mission.id}, day ${b.mission.day}, ${b.mission.environment}`}`, `Status: ${b.status} — ${b.statusReason}`, `Assessment version: ${b.assessmentVersion}  •  Data completeness: ${b.dataCompletenessPercent}${typeof b.dataCompletenessPercent === 'number' ? '%' : ''}`] });
  if (b.emergencyType) S.push({ h: 'Emergency', lines: [`Type: ${b.emergencyType}  •  Severity (self-assessed): ${b.severity}`, `Reported by: ${b.reportedBy}  •  Affected: ${b.affectedPerson}`, `Event started: ${b.eventStartedAt}`, `Crew acknowledgement: ${b.acknowledgedBy || 'not recorded'}`, b.communicationStatus] });
  S.push({ h: 'Symptoms', lines: b.symptoms?.length ? b.symptoms : ['None recorded'] }, { h: 'Latest measurements (own data only)', lines: vit });
  S.push({ h: 'Findings', lines: b.findings?.length ? b.findings.map((f: any) => `[${f.level}] ${f.finding} — ${f.value}${f.personalBaseline ? ` (baseline ${f.personalBaseline}, deviation ${f.deviation})` : ''}${f.recordedAt ? `, recorded ${f.recordedAt}` : ''}${f.source ? `, source ${f.source}` : ''}`) : ['No findings'] });
  if (b.nasaOSD?.laboratoryAssessment) S.push({ h: 'Astronaut-entered laboratory results and hybrid comparison', lines: b.nasaOSD.laboratoryAssessment.map((x: any) => `${x.analyte}: ${x.value} ${x.unit} — ${x.flag}; ${x.detail}; recorded ${x.recordedAt}`) });
  if (b.nasaOSD) { const osdLines = [`Source: ${b.nasaOSD.source}`, `Participant: ${b.nasaOSD.selectedAnonymizedParticipant}`, b.nasaOSD.note, ...(b.nasaOSD.samples ?? []).map((x: any) => `${x.study} ${x.sample}: ${Object.entries(x.biomarkers ?? {}).map(([k,v]: any) => `${k}=${v.value} ${v.unit} (reference ${v.referenceMin ?? '—'}–${v.referenceMax ?? '—'})`).join('; ')}`)]; S.push({ h: 'NASA OSD research laboratory context (separate from current astronaut vitals)', lines: osdLines }); }
  if (b.timeline?.length) S.push({ h: 'Event timeline', lines: b.timeline.map((t: any) => `${t.time}  ${t.text}`) });
  S.push({ h: 'Data quality', lines: b.dataQuality?.length ? b.dataQuality : ['No issues noted'] }, { h: 'Next steps & escalation', lines: [...(b.nextSteps ?? []), ...(b.escalation ?? [])] });
  if (b.notes) S.push({ h: 'Notes', lines: [b.notes] });
  S.push({ h: 'References', lines: b.references ?? [] }, { h: 'Notice', lines: [b.notice] }); return S;
}
export async function toPDF(r: Report) {
  const { jsPDF } = await import('jspdf'); const d = new jsPDF({ unit: 'pt', format: 'a4' }); let y = 54; const W = 495;
  const line = (t: string, size = 10, bold = false, color: [number, number, number] = [15, 27, 45]) => { d.setFont('helvetica', bold ? 'bold' : 'normal'); d.setFontSize(size); d.setTextColor(...color); (d.splitTextToSize(String(t), W) as string[]).forEach((l) => { if (y > 790) { d.addPage(); y = 54; } d.text(l, 50, y); y += size + 4; }); };
  d.setFillColor(11, 27, 51); d.rect(0, 0, 595, 40, 'F'); d.setTextColor(255, 255, 255); d.setFont('helvetica', 'bold'); d.setFontSize(14); d.text('AETHRA', 50, 26); d.setFont('helvetica', 'normal'); d.setFontSize(9); d.text(`${BRAND.full} — ${BRAND.tagline}`, 120, 26);
  line(r.title, 16, true); y += 4; reportSections(r).forEach((s) => { y += 6; line(s.h.toUpperCase(), 10, true, [11, 110, 122]); s.lines.forEach((l) => line('• ' + l, 9)); });
  const n = d.getNumberOfPages(); for (let i = 1; i <= n; i++) { d.setPage(i); d.setFontSize(8); d.setTextColor(82, 98, 122); d.text(`AETHRA research prototype — not a medical device — page ${i}/${n}`, 50, 820); }
  d.save(`aethra-${r.id}.pdf`);
}
