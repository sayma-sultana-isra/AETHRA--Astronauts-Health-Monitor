import { assess } from './assess';
import { assessLabResults, currentOutOfRange, type LabFinding, type LabReference } from './labs';
import type { Assessment, LabResult, Profile, Reading } from './types';

export function assessHybrid(
  profile: Profile,
  readings: Reading[],
  symptoms: { ts: number; ids: string[] } | undefined,
  labResults: LabResult[],
  references: LabReference[],
  now = Date.now(),
): { assessment: Assessment; labFindings: LabFinding[] } {
  const base = assess(profile, readings, symptoms, now);
  const labFindings = assessLabResults(labResults, references, now);
  const flagged = currentOutOfRange(labFindings);
  if (!flagged.length || base.status === 'RED') return { assessment: base, labFindings };
  const note = `${flagged.length} recent laboratory result(s) are outside the supplied OSD reference interval.`;
  const assessment: Assessment = {
    ...base,
    status: 'AMBER',
    statusReason: base.status === 'UNKNOWN' ? `Vital-sign assessment is incomplete. ${note}` : `${base.statusReason} ${note}`,
    quality: [...base.quality, 'Laboratory flags use source-supplied OSD-569 CBC / OSD-575 metabolic-panel intervals; these are research-file intervals, not astronaut-specific clinical thresholds.'],
    next: [...base.next, 'Review out-of-range laboratory results with the mission medical officer; confirm the laboratory report interval, assay and unit.'],
  };
  return { assessment, labFindings };
}
