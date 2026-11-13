import type { LabResult } from './types';

export interface LabReference {
  key: string; label: string; unit: string; min: number | null; max: number | null;
  study: string; matrix: string; sourceFile: string; referenceType: string;
}
export type LabFlag = 'LOW' | 'NORMAL' | 'HIGH' | 'STALE' | 'UNIT_MISMATCH' | 'NO_REFERENCE';
export interface LabFinding {
  result: LabResult; reference?: LabReference; flag: LabFlag; detail: string;
}

/** Evaluate only source-supplied laboratory intervals with an exact unit match.
 * OSD protein-abundance values without clinical intervals are intentionally not classified.
 */
export function assessLabResults(results: LabResult[], references: LabReference[], now = Date.now()): LabFinding[] {
  const latest = new Map<string, LabResult>();
  for (const r of results.slice().sort((a, b) => b.ts - a.ts)) if (!latest.has(r.key)) latest.set(r.key, r);
  return [...latest.values()].map((result): LabFinding => {
    const candidates = references.filter((r) => r.key === result.key);
    const reference = candidates.find((r) => r.unit === result.unit);
    if (now - result.ts > 90 * 864e5) return { result, reference, flag: 'STALE', detail: 'Older than 90 days; excluded from current combined status.' };
    if (!candidates.length) return { result, flag: 'NO_REFERENCE', detail: 'No compatible source-supplied OSD clinical interval is available.' };
    if (!reference) return { result, flag: 'UNIT_MISMATCH', detail: `Unit does not match the OSD source unit (${candidates.map((r) => r.unit).join(', ')}).` };
    if (reference.min != null && result.value < reference.min) return { result, reference, flag: 'LOW', detail: `Below OSD source interval (${reference.min}–${reference.max ?? 'no upper limit'} ${reference.unit}).` };
    if (reference.max != null && result.value > reference.max) return { result, reference, flag: 'HIGH', detail: `Above OSD source interval (${reference.min ?? 'no lower limit'}–${reference.max} ${reference.unit}).` };
    return { result, reference, flag: 'NORMAL', detail: `Within OSD source interval (${reference.min ?? 'no lower limit'}–${reference.max ?? 'no upper limit'} ${reference.unit}).` };
  }).sort((a, b) => b.result.ts - a.result.ts);
}

export function currentOutOfRange(findings: LabFinding[]) {
  return findings.filter((x) => x.flag === 'LOW' || x.flag === 'HIGH');
}
