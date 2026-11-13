'use client';
import { useMemo } from 'react';
import { Activity, Database, FlaskConical } from 'lucide-react';
import { Card, Callout } from '@/components/ui';
import { useApp, type OSDRecord } from '@/lib/store';

type Domain = 'all' | 'blood' | 'metabolic' | 'immune' | 'cardio' | 'urine';
const ORDER: Record<string, number> = { 'L-92': 0, 'L-44': 1, 'L-3': 2, 'R+1': 3, 'R+45': 4, 'R+82': 5, 'R+194': 6 };
const pretty = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const DOMAINS: Record<Domain, string[]> = {
  all: ['OSD-569', 'OSD-571', 'OSD-575', 'OSD-656'], blood: ['OSD-569'], metabolic: ['OSD-575', 'OSD-571'],
  immune: ['OSD-575', 'OSD-656', 'OSD-571'], cardio: ['OSD-575'], urine: ['OSD-656'],
};
const PICKS: Record<Domain, string[]> = {
  all: ['hemoglobin', 'white_blood_cell_count', 'platelet_count', 'glucose', 'creatinine', 'albumin', 'crp', 'pf4', 'il6', 'tnf'],
  blood: ['hemoglobin', 'hematocrit', 'white_blood_cell_count', 'platelet_count', 'absolute_neutrophils', 'absolute_lymphocytes'],
  metabolic: ['glucose', 'creatinine', 'albumin', 'alt', 'ast', 'sodium', 'potassium', 'calcium'],
  immune: ['il6', 'il10', 'il1b', 'ifng', 'tnf', 'cxcl10', 'crp', 'ccl2'],
  cardio: ['crp', 'pf4', 'fibrinogen', 'haptoglobin', 'creatinine', 'sodium'],
  urine: ['il6', 'il8', 'il10', 'tnf', 'cxcl10', 'ccl2'],
};
function latestOrder(a: OSDRecord, b: OSDRecord) { return (ORDER[a.timepoint] ?? -1) - (ORDER[b.timepoint] ?? -1); }
export default function OSDEvidence({ domain = 'all', title = 'NASA OSD-backed laboratory evidence' }: { domain?: Domain; title?: string }) {
  const { osdRecords, osdReady, osdParticipant, setOSDParticipant } = useApp();
  const studies = DOMAINS[domain];
  const sampleRecords = useMemo(() => osdRecords.filter((r) => r.recordType === 'sample-level' && r.participant === osdParticipant && studies.includes(r.study)).sort(latestOrder), [osdRecords, osdParticipant, studies]);
  const comparisons = useMemo(() => osdRecords.filter((r) => r.recordType === 'group-comparison' && studies.includes(r.study)), [osdRecords, studies]);
  const selected = useMemo(() => {
    const out: { record: OSDRecord; key: string; item: NonNullable<OSDRecord['analytes']>[string] }[] = [];
    const seen = new Set<string>();
    for (const r of sampleRecords.slice().reverse()) for (const [key, item] of Object.entries(r.analytes ?? {})) {
      if (!PICKS[domain].some((p) => key.toLowerCase().includes(p))) continue;
      if (seen.has(key)) continue; seen.add(key); out.push({ record: r, key, item });
    }
    return out.slice(0, 12);
  }, [sampleRecords, domain]);
  const compFeatures = useMemo(() => comparisons.flatMap((r) => (r.features ?? []).filter((f) => f.adjustedPValue != null && f.adjustedPValue < 0.05).sort((a,b) => (a.adjustedPValue ?? 1)-(b.adjustedPValue ?? 1)).slice(0, 4).map((f) => ({ ...f, dataType: r.dataType, comparison: r.comparison, sample: r.sample }))), [comparisons]);
  if (!osdReady) return <Card title={title}><p className="text-sm text-mute">Loading NASA OSD-backed records…</p></Card>;
  if (!osdRecords.length) return <Card title={title}><Callout tone="warn">NASA OSD data is not available in the local data layer. Check that public/data/osd/records.json is deployed.</Callout></Card>;
  return <Card title={title} right={<span className="flex items-center gap-1 text-xs text-mute"><Database size={14}/> NASA OSD</span>}>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-mute">Inspiration4 biospecimen measurements · participant-level observations remain anonymized.</p><label className="flex items-center gap-2 text-sm">Dataset participant<select className="min-h-[38px] rounded-lg border border-line bg-bg2 px-2" value={osdParticipant} onChange={(e) => setOSDParticipant(e.target.value)}><option>C001</option><option>C002</option><option>C003</option><option>C004</option></select></label></div>
    {selected.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="text-left text-xs text-mute"><tr><th className="py-2">Biomarker</th><th>Value</th><th>Reference interval</th><th>Range check</th><th>Study / timepoint</th></tr></thead><tbody>{selected.map(({record,key,item}) => <tr key={`${record.id}-${key}`} className="border-t border-line"><th className="py-2 pr-2 text-left font-medium">{pretty(key)}</th><td className="font-mono">{Number(item.value.toFixed(3))} <span className="text-xs text-mute">{item.unit}</span></td><td className="font-mono text-mute">{item.min != null || item.max != null ? `${item.min ?? '—'} – ${item.max ?? '—'}` : item.kind === 'relative-protein-abundance' ? 'No clinical interval supplied' : '—'}</td><td className="text-xs">{item.min != null && item.value < item.min || item.max != null && item.value > item.max ? <span className="font-semibold text-warn">Outside supplied interval</span> : item.min != null || item.max != null ? <span className="text-teal">Within supplied interval</span> : <span className="text-mute">Not assessed</span>}</td><td className="text-xs text-mute">{record.study} · {record.timepoint}</td></tr>)}</tbody></table></div> : <p className="text-sm text-mute">No matching sample-level markers for {osdParticipant} in these studies.</p>}
    {compFeatures.length > 0 && <div className="mt-4 border-t border-line pt-3"><h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><FlaskConical size={15}/> Significant cohort-level plasma findings</h3><div className="grid gap-2 sm:grid-cols-2">{compFeatures.slice(0,6).map((f,i)=><div key={`${f.sample}-${f.feature}-${i}`} className="rounded-lg border border-line bg-bg2 p-2 text-sm"><div className="font-medium">{f.feature}</div><div className="font-mono">log₂ fold-change {f.logFC == null ? '—' : f.logFC.toFixed(2)}</div><div className="text-xs text-mute">{f.dataType} · adjusted p {f.adjustedPValue?.toExponential(2)} · {f.sample}</div></div>)}</div><p className="mt-2 text-xs text-mute">These are group-comparison statistics, not measurements from the selected participant.</p></div>}
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-line bg-bg2 p-3 text-xs text-mute"><Activity size={15} className="mt-0.5 shrink-0"/><p>Research biospecimen data is used as the application’s laboratory-data source. It does not contain continuous heart rate, blood pressure, SpO₂, temperature or live spacecraft telemetry. Values are not converted into those signals, and reference intervals are shown as supplied—not as a diagnosis.</p></div>
  </Card>;
}
