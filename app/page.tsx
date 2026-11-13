'use client';
import Link from 'next/link'; import { useMemo, useState } from 'react';
import { Flame, Rocket, CheckSquare, Square, FlaskConical, Radio } from 'lucide-react';
import { Btn, Card, PageHead, SimTag, StatusBadge, Disclaimer, Bullets, Field, inputCls, Freshness, SourceTag, Timeline, Callout } from '@/components/ui';
import ProfileForm from '@/components/ProfileForm'; import { useApp, todayKey } from '@/lib/store'; import { latest } from '@/lib/assess'; import { assessHybrid } from '@/lib/hybrid';
import { SCENARIOS } from '@/lib/demo'; import { activeTasks, doneToday, streak, weekCompletion } from '@/lib/routine'; import { commsStatus, readAdapters } from '@/lib/adapters';

export default function Overview() {
  const { s, set, loadDemo, addProfile, profile, readings, assessment, scenario, setScenario, osdLabReferences } = useApp(); const [creating, setCreating] = useState(false); const [perr, setPerr] = useState<string | null>(null); const [now] = useState(() => Date.now());
  const crew = useMemo(() => s.profiles.map((p) => ({ p, a: assessHybrid(p, s.readings[p.id] ?? [], s.symptoms[p.id], s.labResults?.[p.id] ?? [], osdLabReferences).assessment })), [s.profiles, s.readings, s.symptoms, s.labResults, osdLabReferences]);
  if (!s.loaded || !profile || !assessment) return (
    <div className="space-y-6">
      <div className="hero-orbit relative overflow-hidden rounded-3xl border border-line p-6 shadow-panel md:p-12"><svg className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] opacity-60 md:-right-10 md:-top-16 md:h-[520px] md:w-[520px]" viewBox="0 0 400 400" fill="none" aria-hidden="true"><circle cx="200" cy="200" r="190" stroke="#56D4F0" strokeOpacity=".15" /><circle cx="200" cy="200" r="140" stroke="#56D4F0" strokeOpacity=".22" strokeDasharray="2 6" /><circle cx="200" cy="200" r="90" stroke="#8B7BFF" strokeOpacity=".3" /><circle cx="200" cy="200" r="34" fill="#56D4F0" fillOpacity=".12" stroke="#56D4F0" strokeOpacity=".5" /><circle cx="335" cy="95" r="6" fill="#56D4F0" /><circle cx="92" cy="298" r="4" fill="#8B7BFF" /></svg><div className="on-dark relative">
        <div className="eyebrow mb-3 !tracking-[0.22em] !text-cyan">Astronaut Health Monitoring &amp; Decision Support System</div>
        <h1 className="bg-gradient-to-br from-white via-cyan to-[#8B7BFF] bg-clip-text text-5xl font-semibold tracking-[0.2em] text-transparent md:text-7xl">AETHRA</h1><p className="mt-2 text-lg text-tx/80">Beyond Earth, Beyond Limits.</p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-mute">Monitor astronaut health, review alerts and prepare reports — even offline.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Btn variant="primary" className="px-6 py-3 text-base" onClick={loadDemo}><Rocket size={18} aria-hidden />LOAD DEMO MISSION</Btn><Btn className="!bg-transparent" onClick={() => setCreating(true)}>Create my own profile</Btn></div>
        <p className="mt-3 text-xs text-mute">Demo data is simulated. No account needed; data stays in this browser.</p></div></div>
      <div className="grid gap-4 md:grid-cols-3">{[['1. Pick an astronaut', 'Each profile holds a personal baseline: that person’s usual values.'], ['2. Record measurements', 'Enter vitals and how you feel. Every value is labelled MANUAL or SIMULATED.'], ['3. Read the assessment', 'GREEN, AMBER, RED — or UNKNOWN when data is missing or old — with the reasons.']].map(([h, t]) => <Card key={h}><h2 className="font-semibold">{h}</h2><p className="mt-1 text-sm text-mute">{t}</p></Card>)}</div>
      {creating && <Card title="Create astronaut profile"><ProfileForm label="Create profile" existingIds={s.profiles.map((p) => p.id)} externalError={perr} onSave={(p) => setPerr(addProfile(p))} /></Card>}
      <Disclaimer />
    </div>);
  const m = profile.mission; const pctDone = Math.min(100, Math.round((m.day / m.durationDays) * 100)); const last = readings[readings.length - 1];
  const tasks = activeTasks(s), done = doneToday(s); const ts = todayKey(s.activeId);
  const toggle = (id: string) => set((x) => { const cur = x.taskLog[ts] ?? []; return { ...x, taskLog: { ...x.taskLog, [ts]: cur.includes(id) ? cur.filter((i) => i !== id) : [...cur, id] } }; });
  const hz = readAdapters({ profile, readings, now }); const rad = hz.find((h) => h.id === 'dose'), cum = hz.find((h) => h.id === 'cum'), co2 = hz.find((h) => h.id === 'co2'); const comms = commsStatus(profile, now);
  const lastVital = ['hr', 'sys', 'spo2', 'temp'].map((k) => latest(readings, k as any)).filter(Boolean).sort((a, b) => b!.ts - a!.ts)[0]; const dueAt = lastVital ? lastVital.ts + 24 * 36e5 : now; const overdue = now > dueAt;
  const alerts = crew.filter((c) => c.a.status !== 'GREEN'); const events = [
    ...s.reports.slice(0, 4).map((r) => ({ at: r.ts, text: `${r.title} (${r.id})`, tone: r.kind === 'emergency' ? 'crit' as const : undefined })),
    ...(s.symptoms[profile.id] ? [{ at: s.symptoms[profile.id].ts, text: `Symptoms recorded for ${profile.name}`, tone: 'warn' as const }] : []),
    ...readings.filter((r) => r.source === 'manual').slice(-3).map((r) => ({ at: r.ts, text: 'Manual measurement recorded', tone: undefined })),
  ].sort((a, b) => b.at - a.at).slice(0, 6);
  return (
    <div className="space-y-6">
      <PageHead crumb="Mission" title="Mission Overview" sub={`${m.name} · Day ${m.day} of ${m.durationDays} · ${m.destination} · ${m.env}`} right={profile.simulated ? <SimTag>SIMULATED MISSION</SimTag> : undefined} />
      {s.profiles.length > 0 && profile.simulated && <Callout tone="warn" title="Simulation mode">Everything on this page is demonstration data generated by AETHRA. No real sensors, NASA feeds or ground teams are connected.</Callout>}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={`Latest health assessment — ${profile.name}`} className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3"><StatusBadge s={assessment.status} big /><span className="text-xs text-mute">Data completeness {assessment.completeness}% · {assessment.freshSignals}/4 core vitals recent</span></div>
          <p className="mt-3 text-sm">{assessment.statusReason}</p>
          <div className="mt-3"><h3 className="mb-1 text-sm font-semibold">What to do next</h3><Bullets items={assessment.next} /></div>
          <div className="mt-4 flex flex-wrap gap-2"><Link href="/assess"><Btn variant="primary">See why</Btn></Link><Link href="/check"><Btn>Take a measurement</Btn></Link></div>
        </Card>
        <Card title="Next scheduled health check">
          <div className={`text-xl font-semibold ${overdue ? 'text-warn' : ''}`}>{!lastVital ? 'Due now' : overdue ? 'Overdue' : 'Due ' + new Date(dueAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</div>
          <p className="mt-1 text-sm text-mute">Prototype schedule: one set of core vitals every 24 hours.</p>
          <dl className="mt-3 space-y-1 text-sm"><div className="flex justify-between"><dt className="text-mute">Last measurement</dt><dd><Freshness ts={last?.ts} /></dd></div><div className="flex justify-between"><dt className="text-mute">Source</dt><dd>{last ? <SourceTag s={last.source} /> : '—'}</dd></div></dl>
          <Link href="/check" className="mt-3 block"><Btn className="w-full">Start health check</Btn></Link>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Active alerts" right={<span className="text-xs text-mute">{alerts.length ? `${alerts.length} of ${crew.length} crew` : ''}</span>}>
          {alerts.length === 0 ? <p className="text-sm text-mute">No crew member has an AMBER, RED or UNKNOWN status.</p> : <ul className="space-y-2">{alerts.map(({ p, a }) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2 text-sm last:border-0"><span><b>{p.name}</b><br /><span className="text-xs text-mute">{a.statusReason.slice(0, 110)}</span></span><span className="flex items-center gap-2"><StatusBadge s={a.status} short />{p.id !== profile.id && <button className="text-xs text-cyan underline" onClick={() => set((x) => ({ ...x, activeId: p.id }))}>View</button>}</span></li>)}</ul>}
        </Card>
        <Card title="Recent health events">{events.length ? <Timeline items={events} /> : <p className="text-sm text-mute">No events yet. Measurements, symptom reports and emergency reports appear here.</p>}</Card>
      </div>
      <Card title="Hazard snapshot" right={<Link href="/hazards" className="text-sm text-cyan underline">Open Space Hazards</Link>}>
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div><div className="flex items-center gap-2 font-semibold">Radiation <SourceTag s={rad?.provenance ?? 'missing'} /></div>{rad?.points.length ? <p className="mt-1">{rad.points[rad.points.length - 1].v} mSv/day now · ≈{cum?.points[cum.points.length - 1].v} mSv mission total (estimate)</p> : <p className="mt-1 text-mute">No dosimeter data for this environment.</p>}</div>
          <div><div className="flex items-center gap-2 font-semibold">Cabin environment <SourceTag s={co2?.provenance ?? 'missing'} /></div>{co2?.points.length ? <p className="mt-1">CO₂ {co2.points[co2.points.length - 1].v} ppm · no environmental warnings in simulated data</p> : <p className="mt-1 text-mute">No environment data for this environment.</p>}</div>
          <div><div className="flex items-center gap-2 font-semibold"><Radio size={14} aria-hidden />Earth link <SourceTag s="simulated" /></div><p className="mt-1">{comms.open ? 'Link window open' : 'Link window closed'} · one-way delay ≈ {comms.oneWayMin < 1 ? `${Math.round(comms.oneWayMin * 60)} s` : `${comms.oneWayMin} min`}</p></div>
        </div>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Mission timeline"><div className="flex justify-between text-sm"><span>Day {m.day}</span><span className="text-mute">{m.durationDays - m.day} days remaining</span></div><div className="mt-1 h-2.5 rounded bg-bg2" role="progressbar" aria-valuenow={pctDone} aria-valuemin={0} aria-valuemax={100} aria-label="Mission progress"><div className="h-2.5 rounded bg-cyan" style={{ width: pctDone + '%' }} /></div><p className="mt-2 text-xs text-mute">{pctDone}% of planned {m.durationDays}-day mission. Milestones are not modelled in this prototype.</p></Card>
        <Card title="Today’s health routine" right={<span className="flex items-center gap-1 text-sm text-warn"><Flame size={16} aria-hidden />{streak(s)}-day check streak</span>}>
          <ul className="space-y-0.5">{tasks.map((t) => (<li key={t.id}><button onClick={() => toggle(t.id)} aria-pressed={done.includes(t.id)} className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-2 text-left text-sm hover:bg-bg2">{done.includes(t.id) ? <CheckSquare className="text-teal" size={20} aria-hidden /> : <Square className="text-mute" size={20} aria-hidden />}<span className={done.includes(t.id) ? 'text-mute line-through' : ''}>{t.label}</span></button></li>))}</ul>
          <p className="mt-2 text-xs text-mute">Week completion {weekCompletion(s)}%. Medical needs always come before streaks.</p>
        </Card>
      </div>
      {profile.simulated && <Card title="Simulation controls" right={<FlaskConical size={16} className="text-warn" aria-hidden />}><div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"><Field label={`Simulated scenario for ${profile.name}`} hint="Regenerates this astronaut’s 14-day simulated history. Manual entries for this astronaut are replaced."><select className={inputCls} value={scenario} onChange={(e) => setScenario(e.target.value as any)}>{SCENARIOS.map((x) => <option key={x.id} value={x.id}>{x.label} — {x.desc}</option>)}</select></Field><Btn onClick={loadDemo}>Reset whole demo</Btn></div></Card>}
      <Disclaimer />
    </div>
  );
}
