'use client';
import { useMemo, useState } from 'react';
import { Activity, FlaskConical, Save } from 'lucide-react';
import { Btn, Card, Field, Callout, inputCls } from '@/components/ui';
import { useApp } from '@/lib/store';
import { assessLabResults } from '@/lib/labs';

const prettyUnit = (u: string) => u.replace(/_/g, ' ');
const pad = (n: number) => String(n).padStart(2, '0');
const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const badgeClass: Record<string,string> = { LOW:'text-warn bg-warn/10 border-warn/30', HIGH:'text-warn bg-warn/10 border-warn/30', NORMAL:'text-teal bg-teal/10 border-teal/30', STALE:'text-mute bg-bg2 border-line', UNIT_MISMATCH:'text-crit bg-crit/10 border-crit/30', NO_REFERENCE:'text-mute bg-bg2 border-line' };

export default function LabPanel({ mode = 'input', title = 'Laboratory results' }: { mode?: 'input' | 'summary' | 'history'; title?: string }) {
  const { profile, osdReady, osdLabReferences, labResults, addLabResult } = useApp();
  const [key, setKey] = useState(''); const [value, setValue] = useState(''); const [when, setWhen] = useState(() => toLocal(new Date())); const [method, setMethod] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  const refs = useMemo(() => osdLabReferences.slice().sort((a,b) => a.study.localeCompare(b.study) || a.label.localeCompare(b.label)), [osdLabReferences]);
  const selected = refs.find((r) => `${r.study}:${r.key}` === key);
  const findings = useMemo(() => mode === 'history' ? labResults.slice().sort((a,b) => b.ts-a.ts).map((r) => assessLabResults([r], osdLabReferences)[0]) : assessLabResults(labResults, osdLabReferences), [mode, labResults, osdLabReferences]);
  const visible = mode === 'history' ? findings : findings.slice(0, 14);
  function save() {
    setError(''); setMessage(''); const n = Number(value); const ts = new Date(when).getTime();
    if (!selected) { setError('Select a supported laboratory analyte.'); return; }
    if (!value.trim() || !Number.isFinite(n)) { setError('Enter a valid numeric result.'); return; }
    if (!Number.isFinite(ts) || ts > Date.now() + 60000 || Date.now() - ts > 365 * 864e5) { setError('Enter a valid result date within the last year.'); return; }
    addLabResult({ key: selected.key, value: n, unit: selected.unit, ts, method: method.trim() || undefined });
    setValue(''); setMessage(`${selected.label} result saved. Assessment updated.`);
  }
  if (!profile) return null;
  if (!osdReady) return <Card title={title}><p className="text-sm text-mute">Loading NASA OSD laboratory references…</p></Card>;
  return <Card title={title} right={<span className="flex items-center gap-1 text-xs text-mute"><FlaskConical size={14}/> Hybrid assessment</span>}>
    {mode === 'input' && <div className="mb-4 space-y-3 rounded-xl border border-line bg-bg2 p-3">
      <div><p className="text-sm font-medium">Add a laboratory result for {profile.name}</p><p className="mt-1 text-xs text-mute">Enter a result from a real lab report. AETHRA compares it only when the analyte and unit match a source-supplied OSD interval. This is not a substitute for the lab's own reference range or medical review.</p></div>
      <Field label="Analyte / source interval"><select className={inputCls} value={key} onChange={(e) => setKey(e.target.value)}><option value="">Choose a supported analyte…</option>{['OSD-569','OSD-575'].map((study) => <optgroup key={study} label={`${study} · ${study === 'OSD-569' ? 'Whole-blood CBC' : 'Serum metabolic panel'}`}>{refs.filter((r) => r.study === study).map((r) => <option key={`${r.study}:${r.key}`} value={`${r.study}:${r.key}`}>{r.label} ({prettyUnit(r.unit)})</option>)}</optgroup>)}</select></Field>
      {selected && <div className="rounded-lg border border-line p-2 text-xs text-mute">Source interval: <b className="text-tx">{selected.min ?? '—'} – {selected.max ?? '—'} {prettyUnit(selected.unit)}</b> · {selected.study} · {selected.matrix}</div>}
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Measured value" error={error}><input className={inputCls} type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Enter lab result" /></Field><Field label="Measured at"><input className={inputCls} type="datetime-local" max={toLocal(new Date())} value={when} onChange={(e) => setWhen(e.target.value)} /></Field></div>
      <Field label="Lab / assay method (optional)"><input className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)} placeholder="e.g. CBC analyser / CMP" maxLength={100}/></Field>
      <Btn variant="primary" onClick={save}><Save size={15}/> Save lab result</Btn>{message && <p role="status" className="text-sm text-teal">{message}</p>}{error && <p role="alert" className="text-sm text-crit">{error}</p>}
    </div>}
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-line bg-bg2 p-3 text-xs text-mute"><Activity size={15} className="mt-0.5 shrink-0"/><p>Only 27 compatible CBC/CMP source intervals are enabled. OSD-571 proteomics and OSD-575/656 protein-abundance values without clinical reference intervals are shown as research evidence, not classified as low/high. Heart rate, BP and SpO₂ continue to use the separate vital-sign assessment rules.</p></div>
    {visible.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead className="text-left text-xs text-mute"><tr><th className="py-2">Analyte</th><th>Result</th><th>OSD interval</th><th>Status</th><th>Recorded</th></tr></thead><tbody>{visible.map((f) => <tr key={f.result.id} className="border-t border-line align-top"><th className="py-2 text-left font-medium">{f.reference?.label ?? f.result.key.replace(/_/g,' ')}</th><td className="font-mono">{f.result.value} <span className="text-xs text-mute">{prettyUnit(f.result.unit)}</span></td><td className="font-mono text-xs text-mute">{f.reference ? `${f.reference.min ?? '—'} – ${f.reference.max ?? '—'}` : 'Unavailable'}</td><td><span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${badgeClass[f.flag]}`}>{f.flag.replace('_',' ')}</span><p className="mt-1 max-w-xs text-xs text-mute">{f.detail}</p></td><td className="text-xs text-mute">{new Date(f.result.ts).toLocaleString()}</td></tr>)}</tbody></table></div> : <p className="text-sm text-mute">No laboratory results have been entered for this profile yet. Add a result above using a supported analyte.</p>}
    <Callout tone="warn" title="Research reference, not an astronaut-specific clinical standard">Intervals are reproduced from the supplied NASA OSD transformed CBC/CMP files. Confirm the actual laboratory report's interval, assay and unit. An out-of-range result raises an attention flag only; AETHRA does not infer severe/critical illness from these ranges.</Callout>
  </Card>;
}
