'use client';
import { useState } from 'react'; import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { Card, NoData, PageHead, SimTag, Bullets, Disclaimer, SourceTag, Freshness, Callout } from '@/components/ui'; import { useApp } from '@/lib/store';
import { DeviationBars, MultiChart, RANGES, TrendChart } from '@/components/Charts'; import OSDEvidence from '@/components/OSDEvidence'; import { latest, windowMean } from '@/lib/assess'; import type { NumKey } from '@/lib/types'; import LabPanel from '@/components/LabPanel';
const f = (n: number, d = 1) => (Number.isNaN(n) ? '—' : (Math.round(n * 10 ** d) / 10 ** d).toString());
type M = { k: NumKey; name: string; unit: string; base?: number; color: string; d: number; pair?: NumKey };
export default function Dashboard() {
  const { profile, readings, assessment } = useApp(); const [rg, setRg] = useState('7d'); const [now] = useState(() => Date.now());
  if (!profile || !assessment) return <NoData />;
  const b = profile.baseline; const ms = RANGES.find((r) => r.id === rg)!.ms;
  const M: M[] = [{ k: 'hr', name: 'Heart rate', unit: 'BPM', base: b.hr, color: '#56D4F0', d: 0 }, { k: 'sys', name: 'Blood pressure (systolic)', unit: 'mmHg', base: b.sys, color: '#4ADEA0', d: 0, pair: 'dia' }, { k: 'spo2', name: 'Blood oxygen (SpO₂)', unit: '%', base: b.spo2, color: '#56D4F0', d: 0 }, { k: 'temp', name: 'Body temperature', unit: '°C', base: b.temp, color: '#F7B948', d: 1 }, { k: 'sleepH', name: 'Sleep', unit: 'hours', base: b.sleepH, color: '#4ADEA0', d: 1 }, { k: 'hydration', name: 'Hydration (self-rated)', unit: '/10', color: '#56D4F0', d: 0 }];
  const dev = (['hr', 'sys', 'spo2', 'temp', 'sleepH'] as const).map((k) => { const l = latest(readings, k); const base = (b as any)[k]; return { name: { hr: 'Heart rate', sys: 'Systolic', spo2: 'SpO₂', temp: 'Temperature', sleepH: 'Sleep' }[k], pct: l && base ? Math.round(((l.v - base) / base) * 1000) / 10 : 0, has: !!l }; }).filter((d) => d.has);
  const flagged = (k: NumKey) => assessment.observations.some((o) => (o.key === k || (k === 'sys' && o.key === 'sys')) && o.level > 0);
  const D = 864e5; const cur = (k: NumKey) => windowMean(readings, k, now - 7 * D, now + 1), prev = (k: NumKey) => windowMean(readings, k, now - 14 * D, now - 7 * D);
  return (
    <div className="space-y-6">
      <PageHead crumb="Mission" title="Health Dashboard" sub={`Vitals and trends compared with ${profile.name}’s baseline.`} right={profile.simulated ? <SimTag /> : undefined} />
      <Card title="Current measurements" right={<span className="text-xs text-mute">Overall: {assessment.status}</span>}>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><caption className="sr-only">Latest measurement for each indicator with baseline, deviation and source</caption>
          <thead className="text-left text-xs text-mute"><tr><th scope="col" className="py-2">Indicator</th><th scope="col">Current</th><th scope="col">Personal baseline</th><th scope="col">Change</th><th scope="col">Check</th><th scope="col">Source</th><th scope="col">Updated</th></tr></thead><tbody>
            {M.map((m) => { const l = latest(readings, m.k); const l2 = m.pair ? latest(readings, m.pair) : null; const stale = l && now - l.ts > 36 * 36e5; const fl = l && !stale && flagged(m.k);
              const ch = l && m.base ? (m.k === 'temp' || m.k === 'sleepH' ? `${l.v - m.base > 0 ? '+' : ''}${f(l.v - m.base)} ${m.unit}` : m.k === 'spo2' ? `${l.v - m.base > 0 ? '+' : ''}${f(l.v - m.base, 0)} pts` : `${l.v - m.base > 0 ? '+' : ''}${f(((l.v - m.base) / m.base) * 100)}%`) : '—';
              return <tr key={m.k} className="border-t border-line"><th scope="row" className="py-2.5 pr-2 text-left font-medium">{m.name}</th>
                <td className="font-mono text-lg font-semibold">{l ? (l2 ? `${l.v}/${l2.v}` : l.v) : '—'} <span className="text-xs font-normal text-mute">{m.unit}</span></td><td className="font-mono text-mute">{m.base ? (m.pair ? `${m.base}/${b.dia}` : m.base) : '—'}</td><td className="font-mono">{ch}</td>
                <td>{!l || stale ? <span className="inline-flex items-center gap-1 text-mute"><HelpCircle size={14} aria-hidden />{!l ? 'No data' : 'Out of date'}</span> : fl ? <span className="inline-flex items-center gap-1 font-semibold text-warn"><AlertTriangle size={14} aria-hidden />Flagged</span> : <span className="inline-flex items-center gap-1 text-teal"><CheckCircle2 size={14} aria-hidden />Normal range</span>}</td>
                <td>{l ? <SourceTag s={l.src} /> : '—'}</td><td><Freshness ts={l?.ts} /></td></tr>; })}</tbody></table></div>
        <p className="mt-2 text-xs text-mute">“Flagged” means a prototype rule was triggered (see Health Assessment). “Out of date” values are older than 36 hours and are not used for the current status.</p>
      </Card>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chart time range"><span className="text-sm font-medium">Chart range:</span>{RANGES.map((r) => <button key={r.id} onClick={() => setRg(r.id)} aria-pressed={rg === r.id} className={`min-h-[40px] rounded-lg border px-3 text-sm ${rg === r.id ? 'border-cyan bg-cyan text-onaccent' : 'border-line bg-card hover:border-cyan'}`}>{r.label}</button>)}</div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{M.map((m) => (<Card key={m.k} title={`${m.name} (${m.unit})`}><TrendChart data={readings} k={m.k} baseline={m.base} unit={m.unit} color={m.color} rangeMs={ms} label={m.name} /></Card>))}</div>
      {rg === '24h' && <Callout>Demonstration data has one reading per day, so the 24-hour view shows few points. Manual entries appear as you add them.</Callout>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Last 7 days vs the 7 days before (calendar days)"><div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm"><thead className="text-left text-xs text-mute"><tr><th scope="col" className="py-1">Indicator</th><th scope="col">Previous 7 d</th><th scope="col">Last 7 d</th><th scope="col">Baseline</th></tr></thead><tbody>
          {M.filter((x) => x.base).map((x) => { const c = cur(x.k), p = prev(x.k); return <tr key={x.k} className="border-t border-line"><th scope="row" className="py-1.5 text-left font-medium">{x.name}</th><td className="font-mono">{f(p.mean)} <span className="text-xs text-mute">(n={p.n})</span></td><td className="font-mono">{f(c.mean)} <span className="text-xs text-mute">(n={c.n})</span></td><td className="font-mono text-mute">{x.base}</td></tr>; })}</tbody></table></div><p className="mt-2 text-xs text-mute">Averages of all valid readings inside each calendar window; n is the number of readings. “—” means no readings in that window.</p></Card>
        <Card title="Data quality"><p className="text-sm"><b className="font-mono text-2xl">{assessment.completeness}%</b> data completeness <span className="text-xs text-mute">(share of key indicators measured recently; not a probability of being right)</span></p><div className="mt-2"><Bullets items={assessment.quality.length ? assessment.quality : ['No data-quality issues noted.']} /></div></Card>
      </div>
      <details className="rounded-xl border border-line bg-card/60 p-3"><summary className="cursor-pointer text-sm font-semibold">Advanced laboratory data</summary><div className="mt-3"><LabPanel mode="summary" title="Recent laboratory status" /></div></details>
      <details className="rounded-xl border border-line bg-card/60 p-3"><summary className="cursor-pointer text-sm font-semibold">NASA research context (optional)</summary><div className="mt-3"><OSDEvidence domain="all" title="NASA OSD research cohort context" /></div></details>
      <Card title="Personal health state — current values vs baseline" right={<span className="text-xs text-mute">a health-state view, not a body simulation</span>}>
        <div className="grid gap-5 lg:grid-cols-2">
          <div><h3 className="mb-1 text-sm font-semibold">Percent difference from baseline</h3>{dev.length ? <DeviationBars rows={dev} /> : <p className="text-sm text-mute">No measurements yet.</p>}<p className="text-xs text-mute">Amber bars differ by 15% or more (illustrative marker). Sleep and temperature use the same percent scale for display only.</p></div>
          <div><h3 className="mb-1 text-sm font-semibold">Mood, stress and fatigue together</h3><MultiChart data={readings} rangeMs={ms < 7 * D ? 7 * D : ms} keys={[{ k: 'mood', color: '#4ADEA0', name: 'Mood' }, { k: 'fatigue', color: '#FF6B6B', name: 'Fatigue' }, { k: 'stress', color: '#F7B948', name: 'Stress' }]} />
            <div className="mt-2 text-sm">{assessment.patterns.length ? <><b>Observed patterns</b><Bullets items={assessment.patterns} /></> : <span className="text-mute">No combined patterns detected.</span>}</div>{assessment.factors.length > 0 && <p className="mt-2 text-xs text-mute">Possible contributing factors (not diagnoses): {assessment.factors.join(' ')}</p>}</div></div>
      </Card>
      <Disclaimer />
    </div>
  );
}
