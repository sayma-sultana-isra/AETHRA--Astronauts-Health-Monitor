'use client';
import { useEffect, useState } from 'react'; import { Lock } from 'lucide-react';
import { Btn, Card, Field, NoData, PageHead, inputCls, Disclaimer, Bullets, Callout, ConfirmDialog } from '@/components/ui'; import { useApp, uid } from '@/lib/store'; import { MultiChart } from '@/components/Charts'; import { isolationIndicator } from '@/lib/isolation';
const SL = ['mood', 'stress', 'fatigue', 'cognition', 'sleepQ', 'social'] as const;
const LBL: Record<string, string> = { mood: 'Mood (1 low – 10 good)', stress: 'Stress (1 calm – 10 very stressed)', fatigue: 'Fatigue (1 fresh – 10 exhausted)', cognition: 'Mental clarity (1 foggy – 10 sharp)', sleepQ: 'Sleep quality last night (1 – 10)', social: 'Social connection (1 isolated – 10 connected)' };
function Breathing() {
  const [on, setOn] = useState(false); const [phase, setPhase] = useState('Ready'); const [n, setN] = useState(0);
  useEffect(() => { if (!on) return; const seq: [string, number][] = [['Breathe in', 4], ['Hold', 4], ['Breathe out', 6]]; let i = 0, left = seq[0][1]; setPhase(seq[0][0]); const t = setInterval(() => { left--; if (left <= 0) { i = (i + 1) % 3; left = seq[i][1]; setPhase(seq[i][0]); if (i === 0) setN((c) => c + 1); } }, 1000); return () => clearInterval(t); }, [on]);
  return (<div className="text-center"><div className="mx-auto flex h-36 w-36 items-center justify-center rounded-full border-2 border-cyan/60 bg-cyan/10" style={on ? { animation: 'breathe 14s ease-in-out infinite' } : undefined} aria-hidden><span className="text-sm font-semibold text-cyan">{phase}</span></div><p role="status" className="sr-only">{phase}</p><p className="mt-2 text-xs text-mute">4 s in · 4 s hold · 6 s out. Cycles: {n}. Stop any time. This is relaxation, not treatment.</p><Btn className="mt-2" onClick={() => { setOn(!on); if (on) setPhase('Ready'); }}>{on ? 'Stop' : 'Start guided breathing'}</Btn></div>);
}
export default function Wellness() {
  const { profile, readings, addReading, s, set } = useApp(); const [v, setV] = useState<Record<string, number>>({ mood: 7, stress: 4, fatigue: 4, cognition: 7, sleepQ: 7, social: 7 }); const [saved, setSaved] = useState(''); const [text, setText] = useState(''); const [err, setErr] = useState(''); const [shown, setShown] = useState(false); const [del, setDel] = useState<string | null>(null);
  if (!profile) return <NoData />;
  const entries = s.journal.filter((j) => j.astroId === profile.id); const iso = isolationIndicator(profile, readings);
  const tone = iso.level === 'High' ? 'crit' : iso.level === 'Moderate' ? 'warn' : iso.level === 'Low' ? 'ok' : 'info';
  return (
    <div className="space-y-6">
      <PageHead crumb="Mission hazards" title="Mental Wellness" sub="Daily wellbeing check-in, breathing and private journal." />
      <Card title="Isolation indicator — how many wellbeing signals are concerning right now">
        <Callout tone={tone as any} title={iso.level === 'Not enough data' ? 'Not enough data yet' : `${iso.level}: ${iso.count} of ${iso.of} checked areas flagged`}>{iso.flags.length ? <Bullets items={iso.flags} /> : <span>{iso.level === 'Not enough data' ? 'Complete a few daily check-ins (mood, stress, fatigue, social connection, sleep).' : 'Nothing is currently flagged.'}</span>}<p className="mt-2 text-xs text-mute">{iso.note}</p></Callout></Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Daily check-in"><div className="space-y-3">{SL.map((k) => <Field key={k} label={`${LBL[k]}: ${v[k]}`}><input type="range" min={1} max={10} value={v[k]} onChange={(e) => setV({ ...v, [k]: Number(e.target.value) })} className="h-8 w-full" /></Field>)}
          <Btn variant="primary" onClick={() => { addReading(v as any); const low = v.mood <= 3 || v.stress >= 8 || v.social <= 3; setSaved(low ? 'Saved. That sounds like a hard day — consider talking with a crewmate, the crew medical officer, or your support team.' : 'Check-in saved.'); }}>Save check-in</Btn>{saved && <p role="status" className="text-sm text-teal">{saved}</p>}</div></Card>
        <Card title="Guided breathing"><Breathing /></Card>
        <Card title="Wellbeing trends"><MultiChart data={readings} rangeMs={14 * 864e5} keys={[{ k: 'mood', color: '#4ADEA0', name: 'Mood' }, { k: 'stress', color: '#F7B948', name: 'Stress' }, { k: 'fatigue', color: '#FF6B6B', name: 'Fatigue' }, { k: 'social', color: '#56D4F0', name: 'Social connection' }]} /></Card>
        <details className="rounded-xl border border-line bg-card/60 p-3"><summary className="cursor-pointer text-sm font-semibold">Crew connection ideas</summary><div className="mt-3"><Card title="Small ways to reconnect"><Bullets items={['Share a meal or a video call with a crewmate today.', 'Schedule time for hobbies and private time.', 'Plan a family or support-team call (allow for delay).', 'Reach out early if you feel overwhelmed — asking for support is part of mission readiness.']} /></Card></div></details>
      </div>
      <Card title="Private journal" right={<span className="flex items-center gap-1 text-xs text-mute"><Lock size={12} aria-hidden />Only on this device · not encrypted · never shown to crew or in reports</span>}>
        <textarea aria-label="Journal entry" className={`${inputCls} min-h-[100px]`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write what’s on your mind." />{err && <p role="alert" className="text-xs text-crit">{err}</p>}
        <div className="mt-2 flex gap-2"><Btn variant="primary" onClick={() => { if (!text.trim()) { setErr('Write something first.'); return; } setErr(''); set((x) => ({ ...x, journal: [{ id: uid(), ts: Date.now(), astroId: x.activeId, text: text.trim() }, ...x.journal] })); setText(''); }}>Save entry</Btn><Btn onClick={() => setShown(!shown)}>{shown ? 'Hide entries' : `Show entries (${entries.length})`}</Btn></div>
        {shown && <ul className="mt-3 space-y-2 text-sm">{entries.map((j) => <li key={j.id} className="rounded-lg border border-line bg-bg2 p-3"><div className="mb-1 flex justify-between text-xs text-mute"><span>{new Date(j.ts).toLocaleString()}</span><button className="min-h-[32px] text-crit underline" onClick={() => setDel(j.id)}>Delete</button></div>{j.text}</li>)}{!entries.length && <li className="text-mute">No entries.</li>}</ul>}</Card>
      <ConfirmDialog open={!!del} danger title="Delete this journal entry?" confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={() => { set((x) => ({ ...x, journal: x.journal.filter((q) => q.id !== del) })); setDel(null); }}>This cannot be undone.</ConfirmDialog>
      <Disclaimer />
    </div>
  );
}
