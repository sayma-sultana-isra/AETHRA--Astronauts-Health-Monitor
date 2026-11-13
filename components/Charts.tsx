'use client';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { NumKey, Reading } from '@/lib/types';
import type { Point } from '@/lib/adapters';
import { isNum, validateValue } from '@/lib/validate';

const C = { grid: '#1E2A44', tick: '#909FBA', line: '#56D4F0', base: '#4ADEA0', warn: '#F7B948' };
const tipStyle = { background: '#0B1226', border: '1px solid #2B3A5C', borderRadius: 10, fontSize: 12, color: '#E8EEF8', boxShadow: '0 8px 24px rgba(0,0,0,.5)' };
const fmtDay = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fmtTime = (t: number) => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
export const RANGES = [{ id: '24h', label: '24 hours', ms: 864e5 }, { id: '7d', label: '7 days', ms: 7 * 864e5 }, { id: '14d', label: '14 days', ms: 14 * 864e5 }];
function domainFor(vals: number[], extra: (number | undefined)[]): [number, number] {
  const all = [...vals, ...extra.filter(isNum)]; const lo = Math.min(...all), hi = Math.max(...all); const pad = Math.max((hi - lo) * 0.15, 1); return [Math.floor((lo - pad) * 10) / 10, Math.ceil((hi + pad) * 10) / 10];
}
function Legend({ baseline, n, from, to, unit, caution }: { baseline?: number; n: number; from?: number; to?: number; unit?: string; caution?: number }) {
  return <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute"><span><span className="mr-1 inline-block h-0.5 w-5 bg-cyan align-middle" />Measured{unit ? ` (${unit})` : ''}</span>{baseline !== undefined && <span><span className="mr-1 inline-block w-5 border-t-2 border-dashed border-teal align-middle" />Personal baseline ({baseline})</span>}{caution !== undefined && <span><span className="mr-1 inline-block w-5 border-t-2 border-dashed border-warn align-middle" />Illustrative caution ({caution})</span>}<span>{n} point{n === 1 ? '' : 's'}{from && to ? ` · ${fmtDay(from)} – ${fmtDay(to)}` : ''}</span></div>;
}
export function TrendChart({ data, k, baseline, unit, rangeMs, color = C.line, h = 190, label }: { data: Reading[]; k: NumKey; baseline?: number; unit?: string; rangeMs?: number; color?: string; h?: number; label?: string }) {
  const now = Date.now(); const rows = data.filter((r) => isNum(r[k]) && !validateValue(k, r[k]) && (!rangeMs || r.ts >= now - rangeMs)).slice(-60).map((r) => ({ ts: r.ts, v: r[k] as number, src: r.source }));
  const hasBase = isNum(baseline) && baseline > 0;
  if (!rows.length) return <p className="rounded-xl border border-dashed border-line bg-bg2/60 p-4 text-sm text-mute">No {label ?? k} data in this period.</p>;
  const short = rangeMs !== undefined && rangeMs <= 864e5 * 2; const dom = domainFor(rows.map((r) => r.v), [hasBase ? baseline : undefined]);
  return (<div><div style={{ height: h }} role="img" aria-label={`${label ?? k} over time${unit ? ` in ${unit}` : ''}, ${rows.length} readings${hasBase ? `, personal baseline ${baseline}` : ''}`}>
    <ResponsiveContainer><LineChart data={rows} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
      <CartesianGrid stroke={C.grid} vertical={false} />
      <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} tick={{ fill: C.tick, fontSize: 11 }} tickFormatter={short ? (t) => new Date(t).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : fmtDay} minTickGap={32} />
      <YAxis tick={{ fill: C.tick, fontSize: 11 }} domain={dom} width={44} label={unit ? { value: unit, angle: -90, position: 'insideLeft', fill: C.tick, fontSize: 11, dx: 6 } : undefined} />
      <Tooltip cursor={{ stroke: '#2B3A5C' }} contentStyle={tipStyle} labelFormatter={(t: any) => fmtTime(t)} formatter={(v: any, _n: any, p: any) => [`${v}${unit ? ' ' + unit : ''} · ${p.payload.src}`, label ?? k]} />
      {hasBase && <ReferenceLine y={baseline} stroke={C.base} strokeDasharray="5 4" />}
      <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={{ r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} connectNulls={false} />
    </LineChart></ResponsiveContainer></div><Legend baseline={hasBase ? baseline : undefined} n={rows.length} from={rows[0].ts} to={rows[rows.length - 1].ts} unit={unit} /></div>);
}
export function SeriesChart({ points, unit, caution, label, h = 170 }: { points: Point[]; unit: string; caution?: number; label: string; h?: number }) {
  if (!points.length) return <p className="rounded-xl border border-dashed border-line bg-bg2/60 p-4 text-sm text-mute">No data.</p>;
  const dom = domainFor(points.map((p) => p.v), [caution && Math.max(...points.map((p) => p.v)) * 1.5 > caution ? caution : undefined]);
  return (<div><div style={{ height: h }} role="img" aria-label={`${label} over time in ${unit}, ${points.length} points`}><ResponsiveContainer><LineChart data={points} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}><CartesianGrid stroke={C.grid} vertical={false} />
    <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={fmtDay} tick={{ fill: C.tick, fontSize: 11 }} minTickGap={32} /><YAxis domain={dom} tick={{ fill: C.tick, fontSize: 11 }} width={50} label={{ value: unit, angle: -90, position: 'insideLeft', fill: C.tick, fontSize: 11, dx: 8 }} />
    <Tooltip cursor={{ stroke: '#2B3A5C' }} contentStyle={tipStyle} labelFormatter={(t: any) => fmtTime(t)} formatter={(v: any) => [`${v} ${unit}`, label]} />{caution !== undefined && dom[1] >= caution && <ReferenceLine y={caution} stroke={C.warn} strokeDasharray="5 4" />}
    <Line type="monotone" dataKey="v" stroke={C.line} strokeWidth={2} dot={{ r: 2.5, strokeWidth: 0 }} isAnimationActive={false} /></LineChart></ResponsiveContainer></div><Legend n={points.length} from={points[0].ts} to={points[points.length - 1].ts} unit={unit} caution={caution !== undefined && dom[1] >= caution ? caution : undefined} /></div>);
}
export function MultiChart({ data, keys, h = 200, rangeMs }: { data: Reading[]; keys: { k: NumKey; color: string; name: string }[]; h?: number; rangeMs?: number }) {
  const now = Date.now(); const rows = data.filter((r) => !rangeMs || r.ts >= now - rangeMs).slice(-60).map((r) => ({ ts: r.ts, ...Object.fromEntries(keys.map((x) => [x.k, isNum(r[x.k]) && !validateValue(x.k, r[x.k]) ? r[x.k] : undefined])) }));
  if (rows.length < 1) return <p className="rounded-xl border border-dashed border-line bg-bg2/60 p-4 text-sm text-mute">No data in this period.</p>;
  return (<div><div style={{ height: h }} role="img" aria-label={`Combined trend of ${keys.map((x) => x.name).join(', ')}, scale 1 to 10`}><ResponsiveContainer><LineChart data={rows} margin={{ top: 6, right: 12, left: 4, bottom: 0 }}>
    <CartesianGrid stroke={C.grid} vertical={false} /><XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={fmtDay} tick={{ fill: C.tick, fontSize: 11 }} minTickGap={32} />
    <YAxis tick={{ fill: C.tick, fontSize: 11 }} domain={[1, 10]} width={40} label={{ value: 'score (1–10)', angle: -90, position: 'insideLeft', fill: C.tick, fontSize: 11, dx: 6 }} /><Tooltip cursor={{ stroke: '#2B3A5C' }} contentStyle={tipStyle} labelFormatter={(t: any) => fmtTime(t)} />
    {keys.map((x) => <Line key={x.k} name={x.name} type="monotone" dataKey={x.k} stroke={x.color} strokeWidth={2} dot={{ r: 2.5, strokeWidth: 0 }} connectNulls isAnimationActive={false} />)}</LineChart></ResponsiveContainer></div>
    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">{keys.map((x) => <span key={x.k}><span className="mr-1 inline-block h-0.5 w-5 align-middle" style={{ background: x.color }} />{x.name}</span>)}<span>{rows.length} check-ins · mood/clarity: higher is better; stress/fatigue: lower is better</span></div></div>);
}
export function DeviationBars({ rows }: { rows: { name: string; pct: number }[] }) {
  const m = Math.max(40, Math.ceil(Math.max(...rows.map((r) => Math.abs(r.pct)), 0) * 1.1));
  return (<div style={{ height: 40 + rows.length * 34 }} role="img" aria-label={`Percent deviation from personal baseline: ${rows.map((r) => `${r.name} ${r.pct}%`).join(', ')}`}><ResponsiveContainer><BarChart data={rows} layout="vertical" margin={{ left: 10, right: 20 }}>
    <CartesianGrid stroke={C.grid} horizontal={false} /><XAxis type="number" domain={[-m, m]} tick={{ fill: C.tick, fontSize: 11 }} unit="%" /><YAxis type="category" dataKey="name" width={96} tick={{ fill: '#E8EEF8', fontSize: 12 }} />
    <Tooltip cursor={{ stroke: '#2B3A5C' }} contentStyle={tipStyle} formatter={(v: any) => [`${v}%`, 'vs baseline']} /><ReferenceLine x={0} stroke={C.base} />
    <Bar dataKey="pct" isAnimationActive={false}>{rows.map((r, i) => <Cell key={i} fill={Math.abs(r.pct) >= 15 ? C.warn : C.line} />)}</Bar></BarChart></ResponsiveContainer></div>);
}
