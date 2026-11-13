'use client';
import { useState } from 'react'; import { Card, NoData, PageHead, Bullets, Disclaimer, SourceTag, Freshness, Callout } from '@/components/ui'; import { BODY } from '@/lib/content'; import { useApp } from '@/lib/store'; import { latest } from '@/lib/assess'; import { LIMITS } from '@/lib/validate'; import type { NumKey } from '@/lib/types'; import OSDEvidence from '@/components/OSDEvidence'; import LabPanel from '@/components/LabPanel';
const KEYS: Record<string, NumKey[]> = { head: ['sleepH', 'cognition', 'mood'], eyes: [], heart: ['hr', 'sys', 'dia'], lungs: ['spo2'], gut: ['hydration', 'glucose'], bones: ['exerciseMin'], muscles: ['exerciseMin', 'fatigue'], vestibular: [] };
export default function Body() {
  const { profile, readings, assessment } = useApp(); const [id, setId] = useState('heart'); const part = BODY.find((b) => b.id === id)!;
  if (!profile || !assessment) return <NoData />;
  const keys = KEYS[id] ?? []; const now = Date.now();
  const R = (pid: string, label: string, children: React.ReactNode) => (
    <g role="button" tabIndex={0} aria-label={label} aria-pressed={id === pid} onClick={() => setId(pid)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setId(pid))} className="cursor-pointer" style={{ ['--c' as any]: id === pid ? '#56D4F0' : '#5B6B8C' }}><title>{label}</title>{children}</g>);
  const sh = { fill: 'rgba(86,212,240,0.08)', stroke: 'var(--c)', strokeWidth: 2.5 } as const;
  return (
    <div className="space-y-6">
      <PageHead crumb="Health monitoring" title="Body Explorer" sub={`Explore body systems and related measurements for ${profile.name}.`} />
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2"><svg viewBox="0 0 300 560" className="mx-auto h-[520px] max-w-full" role="group" aria-label="Human body diagram. Each region is a button.">
          <g stroke="#2B3A5C" strokeWidth="2" fill="#111A30"><path d="M120 120 Q150 130 180 120 L215 135 Q235 145 238 175 L250 290 L232 294 L214 205 L208 300 L204 350 L196 520 L172 520 L160 360 L150 345 L140 360 L128 520 L104 520 L96 350 L92 300 L86 205 L68 294 L50 290 L62 175 Q65 145 85 135 Z" /></g>
          {R('head', 'Head and brain', <ellipse cx="150" cy="62" rx="40" ry="48" {...sh} />)}{R('eyes', 'Eyes', <><ellipse cx="135" cy="62" rx="9" ry="6" {...sh} /><ellipse cx="165" cy="62" rx="9" ry="6" {...sh} /></>)}
          {R('vestibular', 'Balance system (inner ear)', <><circle cx="104" cy="66" r="7" {...sh} /><circle cx="196" cy="66" r="7" {...sh} /></>)}
          {R('lungs', 'Lungs', <><path d="M112 150 Q98 175 106 215 L142 215 L142 150 Q127 142 112 150Z" {...sh} /><path d="M188 150 Q202 175 194 215 L158 215 L158 150 Q173 142 188 150Z" {...sh} /></>)}
          {R('heart', 'Heart and cardiovascular system', <path d="M150 210 C130 190 138 168 152 178 C166 168 174 190 150 210Z" {...sh} fill="rgba(255,107,107,0.2)" />)}{R('gut', 'Digestive system', <ellipse cx="150" cy="260" rx="40" ry="32" {...sh} />)}
          {R('muscles', 'Muscles', <><rect x="104" y="340" width="36" height="85" rx="16" {...sh} /><rect x="160" y="340" width="36" height="85" rx="16" {...sh} /></>)}{R('bones', 'Bones', <><rect x="116" y="435" width="12" height="80" rx="6" {...sh} /><rect x="172" y="435" width="12" height="80" rx="6" {...sh} /><rect x="145" y="128" width="10" height="75" rx="5" {...sh} /></>)}
        </svg><p className="text-center text-xs text-mute">Schematic illustration, not anatomically exact.</p></Card>
        <Card className="lg:col-span-3"><div role="tablist" aria-label="Body systems" className="mb-3 flex flex-wrap gap-1.5">{BODY.map((b) => <button key={b.id} role="tab" aria-selected={b.id === id} onClick={() => setId(b.id)} className={`min-h-[40px] rounded-lg border px-2.5 text-xs ${b.id === id ? 'border-cyan bg-cyan text-onaccent' : 'border-line text-tx hover:border-cyan'}`}>{b.name}</button>)}</div>
          <h2 className="text-xl font-semibold">{part.name}</h2><p className="mt-1 text-sm text-mute">{part.fn}</p>
          <div className="mt-4 rounded-lg border border-line bg-bg2 p-3"><h3 className="mb-2 text-sm font-semibold">{profile.name}’s related measurements</h3>
            {keys.length === 0 ? <p className="text-sm text-mute">AETHRA has no direct measurement for this system. Report symptoms in Health Assessment if something changes.</p> : <table className="w-full text-sm"><thead className="text-left text-xs text-mute"><tr><th scope="col">Indicator</th><th scope="col">Latest</th><th scope="col">Status</th><th scope="col">Source</th><th scope="col">Updated</th></tr></thead><tbody>{keys.map((k) => { const l = latest(readings, k); const fl = assessment.observations.find((o) => o.key === k && o.level > 0); const stale = l && now - l.ts > 36 * 36e5; return <tr key={k} className="border-t border-line"><th scope="row" className="py-1.5 text-left font-medium">{LIMITS[k].label}</th><td className="font-mono">{l ? `${l.v} ${LIMITS[k].unit}` : '—'}</td><td>{!l ? 'No data' : stale ? 'Out of date' : fl ? <b className="text-warn">Flagged</b> : <span className="text-teal">No flag</span>}</td><td>{l ? <SourceTag s={l.src} /> : '—'}</td><td><Freshness ts={l?.ts} /></td></tr>; })}</tbody></table>}
            <p className="mt-2 text-xs text-mute">A flag is a prompt to check in, not a diagnosis of this body system.</p></div>
          <details className="mt-4 rounded-lg border border-line bg-bg2 p-3"><summary className="cursor-pointer text-sm font-semibold">Risks, warning signs & guidance</summary><div className="mt-3 grid gap-4 text-sm md:grid-cols-2"><div><h3 className="mb-1 font-semibold">Spaceflight-related risks</h3><Bullets items={part.risks} /></div><div><h3 className="mb-1 font-semibold">Possible warning signs</h3><Bullets items={part.warnings} /></div><div><h3 className="mb-1 font-semibold">Health indicators</h3><Bullets items={part.indicators} /></div><div><h3 className="mb-1 font-semibold">How to assess</h3><Bullets items={part.assess} /></div></div>
          <div className="mt-3"><Callout>{part.edu}</Callout></div>
          <div className="mt-3 text-xs"><b className="text-mute">Sources:</b> {part.refs.map((r, i) => <a key={i} href={r.u} target="_blank" rel="noopener noreferrer" className="mr-3 text-cyan underline">{r.t}</a>)}</div></details></Card>
      </div>
      <details className="rounded-xl border border-line bg-card/60 p-3"><summary className="cursor-pointer text-sm font-semibold">Advanced laboratory data</summary><div className="mt-3"><LabPanel mode="summary" title="Laboratory findings relevant to body monitoring" /></div></details>
      <details className="rounded-xl border border-line bg-card/60 p-3"><summary className="cursor-pointer text-sm font-semibold">NASA research context (optional)</summary><div className="mt-3"><OSDEvidence domain={id === 'heart' ? 'cardio' : id === 'gut' ? 'metabolic' : id === 'head' ? 'immune' : id === 'lungs' ? 'blood' : 'all'} title={`${part.name}: related NASA OSD laboratory evidence`} /></div></details>
      <Disclaimer />
    </div>
  );
}
