import type { AppState, TimelineEntry } from './types';
import { assessHybrid } from './hybrid';
import { buildReportBody } from './export';
import { EMERGENCIES } from './content';
import { assessLabResults, type LabReference } from './labs';
export interface EmergencyInput { labReferences?: LabReference[]; reporterId: string; subjectId: string | 'UNLISTED'; unlistedName?: string; emergencyId: string; severity: string; timeline: TimelineEntry[]; notes: string; ackBy: string; startedAt: number; now?: number }
/** Pure: builds a report about the SUBJECT using only the subject's own readings/symptoms. Never uses the reporter's data for another person. */
export function buildEmergencyReport(s: AppState, i: EmergencyInput) {
  const em = EMERGENCIES.find((e) => e.id === i.emergencyId)!; const now = i.now ?? Date.now();
  const subject = i.subjectId === 'UNLISTED' ? null : s.profiles.find((p) => p.id === i.subjectId) ?? null;
  const reporter = s.profiles.find((p) => p.id === i.reporterId);
  const rs = subject ? s.readings[subject.id] ?? [] : []; const ids = [em.id];
  const labs = subject ? s.labResults?.[subject.id] ?? [] : [];
  const hybrid = subject ? assessHybrid(subject, rs, { ts: now, ids }, labs, i.labReferences ?? [], now) : null;
  const a = hybrid?.assessment ?? null; const labAssessment = hybrid?.labFindings ?? assessLabResults([], i.labReferences ?? [], now);
  const body = buildReportBody({ subject, unlistedName: i.unlistedName, readings: rs, symIds: ids, a, extra: {
    nasaOSD: { source: 'NASA OSD source-supplied laboratory intervals', astronautLabResults: labs, laboratoryAssessment: labAssessment.map((f) => ({ analyte: f.reference?.label ?? f.result.key, value: f.result.value, unit: f.result.unit, recordedAt: new Date(f.result.ts).toISOString(), flag: f.flag, detail: f.detail, study: f.reference?.study ?? null, referenceMin: f.reference?.min ?? null, referenceMax: f.reference?.max ?? null })), note: 'Astronaut-entered laboratory results and source-supplied research intervals; not live telemetry or a clinical diagnosis.' },
    emergencyType: em.label, severity: i.severity, reportedBy: reporter ? `${reporter.name} (${reporter.id})` : 'unknown',
    affectedPerson: subject ? `${subject.name} (${subject.id})${subject.id === i.reporterId ? ' — self' : ''}` : i.unlistedName || 'Crew member not in roster',
    eventStartedAt: new Date(i.startedAt).toISOString(), reportGeneratedAt: new Date(now).toISOString(), elapsedSeconds: Math.round((now - i.startedAt) / 1000),
    acknowledgedBy: i.ackBy.trim(), timeline: i.timeline.map((t) => ({ time: new Date(t.at).toISOString(), text: t.text })), notes: i.notes,
    communicationStatus: 'LOCAL DEMO WORKFLOW: no alert or report was transmitted to any person, ground team, flight surgeon or system by AETHRA.', currentStatus: a ? a.status : 'UNKNOWN' } });
  return { astroId: subject ? subject.id : 'UNLISTED', title: `Emergency report — ${em.label} — ${subject ? subject.name : i.unlistedName || 'unlisted crew member'}`, body };
}
