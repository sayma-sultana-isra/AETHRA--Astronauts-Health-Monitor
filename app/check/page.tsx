'use client';
import Link from 'next/link'; import { useState } from 'react';
import { Btn, Card, Field, NoData, PageHead, inputCls, Bullets, StatusBadge, Disclaimer, Callout, Freshness } from '@/components/ui'; import { useApp } from '@/lib/store'; import { GUIDES } from '@/lib/content'; import type { NumKey } from '@/lib/types';
import { LIMITS, fToC, mmolToMgdl, validateEntry } from '@/lib/validate'; import { latest } from '@/lib/assess'; import LabPanel from '@/components/LabPanel';
type F = { k: NumKey; label: string; step?: string };
const FIELDS: Record<string, F[]> = { hr: [{ k: 'hr', label: 'Heart rate (BPM)' }], bp: [{ k: 'sys', label: 'Systolic — top number (mmHg)' }, { k: 'dia', label: 'Diastolic — bottom number (mmHg)' }], spo2: [{ k: 'spo2', label: 'SpO₂ (%)' }], temp: [{ k: 'temp', label: 'Temperature', step: '0.1' }], glucose: [{ k: 'glucose', label: 'Blood glucose', step: '0.1' }], sleep: [{ k: 'sleepH', label: 'Hours slept', step: '0.1' }, { k: 'sleepQ', label: 'Sleep quality (1 poor – 10 excellent)' }], mood: [{ k: 'mood', label: 'Mood (1 low – 10 good)' }], fatigue: [{ k: 'fatigue', label: 'Fatigue (1 fresh – 10 exhausted)' }], hydration: [{ k: 'hydration', label: 'Hydration (1 very dry – 10 well hydrated)' }] };
const pad = (n: number) => String(n).padStart(2, '0'); const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export default function Check() {
  const { profile, addReading, assessment, readings } = useApp(); const [id, setId] = useState('hr'); const [vals, setVals] = useState<Record<string, string>>({}); const [err, setErr] = useState<Record<string, string>>({}); const [saved, setSaved] = useState<{ msg: string; keys: NumKey[] } | null>(null);
  const [when, setWhen] = useState(() => toLocal(new Date())); const [device, setDevice] = useState(''); const [tUnit, setTUnit] = useState<'C' | 'F'>('C'); const [gUnit, setGUnit] = useState<'mg' | 'mmol'>('mg');
  if (!profile || !assessment) return <NoData />;
  const g = GUIDES.find((x) => x.id === id)!; const fields = FIELDS[id];
  const reset = (n: string) => { setId(n); setErr({}); setSaved(null); setVals({}); setWhen(toLocal(new Date())); };
  function save() {
    const out: Partial<Record<NumKey, number>> = {}; const e: Record<string, string> = {};
    fields.forEach((f) => { const raw = vals[f.k]; if (raw === undefined || raw.trim() === '') { e[f.k] = 'This value is required'; return; } let n = Number(raw); if (Number.isNaN(n)) { e[f.k] = 'Enter a number'; return; } if (f.k === 'temp' && tUnit === 'F') n = fToC(n); if (f.k === 'glucose' && gUnit === 'mmol') n = mmolToMgdl(n); out[f.k] = n; });
    const ts = new Date(when).getTime(); const v = validateEntry(out, Date.now(), ts); const all = { ...e, ...Object.fromEntries(Object.entries(v).map(([k, m]) => [k, m])) };
    Object.keys(all).forEach((k) => { if (!fields.some((f) => f.k === k) && k !== 'ts') delete all[k]; }); setErr(all); if (Object.keys(all).length) { setSaved(null); return; }
    addReading(out as any, { ts, device: device.trim() }); setVals({}); setSaved({ msg: `${g.name} saved at ${new Date(ts).toLocaleString()} as a MANUAL ENTRY${device ? ` (device: ${device.trim()})` : ''}.`, keys: Object.keys(out) as NumKey[] });
  }
  const flaggedNow = saved && assessment.observations.some((o) => o.level > 0 && saved.keys.includes(o.key as NumKey));
  const lastV = fields.map((f) => latest(readings, f.k)).find(Boolean);
  return (
    <div className="space-y-6">
      <PageHead crumb="Health monitoring" title="Health Check" sub={`Enter a new measurement for ${profile.name}. Values are manually entered.`} />
      <div role="tablist" aria-label="Measurements" className="flex flex-wrap gap-2">{GUIDES.map((x) => <button key={x.id} role="tab" aria-selected={x.id === id} onClick={() => reset(x.id)} className={`min-h-[44px] rounded-lg border px-3 text-sm ${x.id === id ? 'border-cyan bg-cyan text-onaccent' : 'border-line bg-card text-tx hover:border-cyan'}`}>{x.name}</button>)}</div>
      <div className="grid gap-4 lg:grid-cols-3">
        <details className="lg:col-span-2 rounded-xl border border-line bg-card/60 p-3"><summary className="cursor-pointer text-sm font-semibold">Measurement instructions for {g.name}</summary><div className="mt-3"><Card title={`How to measure: ${g.name}`}><div className="space-y-4 text-sm">
          <div><b>1. What is being measured?</b><p className="text-mute">{g.what}</p></div><div><b>2. Why is it important?</b><p className="text-mute">{g.why}</p></div>
          <div><b>3. How to measure</b><ol className="mt-1 list-decimal space-y-1 pl-5 text-mute">{g.how.map((h, i) => <li key={i}>{h}</li>)}</ol></div>
          <div><b>4. Equipment</b><p className="text-mute">{g.equip}</p></div><div><b>5. What can influence the result?</b><Bullets items={g.affects} /></div>
          <div><b>6. If the result is unusual</b><Bullets items={g.unusual} /></div><div><b>7. When to notify the crew or medical officer</b><Bullets items={g.notify} /></div>
          <Callout><b>Limitation:</b> {g.limits}</Callout></div></Card></div></details>
        <Card title="Enter measurement"><div className="space-y-3">
          {fields.map((f) => <Field key={f.k} label={f.label} error={err[f.k]} hint={`Accepted range ${LIMITS[f.k].min}–${LIMITS[f.k].max} ${f.k === 'temp' ? '°C' : f.k === 'glucose' ? 'mg/dL' : LIMITS[f.k].unit} (sanity check only, not a medical limit)`}><input inputMode="decimal" className={inputCls} type="number" step={f.step ?? '1'} value={vals[f.k] ?? ''} onChange={(e) => setVals({ ...vals, [f.k]: e.target.value })} aria-invalid={!!err[f.k]} /></Field>)}
          {id === 'temp' && <Field label="Unit"><select className={inputCls} value={tUnit} onChange={(e) => setTUnit(e.target.value as any)}><option value="C">°C (Celsius)</option><option value="F">°F (Fahrenheit, converted to °C)</option></select></Field>}
          {id === 'glucose' && <Field label="Unit"><select className={inputCls} value={gUnit} onChange={(e) => setGUnit(e.target.value as any)}><option value="mg">mg/dL</option><option value="mmol">mmol/L (converted to mg/dL)</option></select></Field>}
          <Field label="Measured at" error={err.ts}><input type="datetime-local" className={inputCls} value={when} max={toLocal(new Date())} onChange={(e) => setWhen(e.target.value)} /></Field>
          <Field label="Device or method (optional)" hint="e.g. onboard cuff model, fingertip oximeter"><input className={inputCls} value={device} onChange={(e) => setDevice(e.target.value)} maxLength={80} /></Field>
          <Btn variant="primary" className="w-full" onClick={save}>Save measurement</Btn>
          {saved && <div role="status" className="rounded-lg border border-teal/40 bg-teal/10 p-3 text-sm">{saved.msg}{flaggedNow && <p className="mt-1 font-medium text-warn">This value was flagged. Rest 5–10 minutes, check the sensor fit and technique, and repeat once. If you have severe symptoms, do not wait — use the Emergency button.</p>}</div>}
          <div className="border-t border-line pt-3 text-sm"><div className="mb-1 text-xs text-mute">Previous value {lastV ? <>· <Freshness ts={lastV.ts} /></> : ''}: <b className="text-tx">{lastV ? lastV.v : 'none'}</b></div><div className="text-xs text-mute">Current overall status</div><div className="mt-1"><StatusBadge s={assessment.status} short /></div><div className="mt-2"><Link className="text-cyan underline" href="/assess">See full assessment</Link></div></div>
          <p className="text-xs text-mute">Feeling severely unwell? Skip measuring and use the Emergency button.</p></div></Card>
      </div>
      <details className="rounded-xl border border-line bg-card/60 p-3"><summary className="cursor-pointer text-sm font-semibold">Advanced laboratory data</summary><div className="mt-3"><LabPanel mode="input" title="Add laboratory results · NASA OSD reference comparison" /></div></details>
      <Disclaimer />
    </div>
  );
}
