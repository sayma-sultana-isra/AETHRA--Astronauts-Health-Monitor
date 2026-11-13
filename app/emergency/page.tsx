'use client';
import Link from 'next/link'; import { useEffect, useState } from 'react'; import { Siren, FileDown, CheckSquare, Square } from 'lucide-react';
import { Btn, Card, Field, NoData, PageHead, inputCls, Disclaimer, Bullets, Callout, Timeline } from '@/components/ui'; import { useApp } from '@/lib/store';
import { BASE_STEPS, EMERGENCIES } from '@/lib/content'; import { toCSV, toJSON, toPDF } from '@/lib/export'; import { buildEmergencyReport } from '@/lib/emergency'; import type { NumKey, Report, TimelineEntry } from '@/lib/types'; import { validateEntry } from '@/lib/validate';

const SEV = ['Life-threatening', 'Urgent', 'Not sure'];
export default function Emergency() {
  const { profile, s, set, addReading, addReport, osdLabReferences } = useApp(); const [sel, setSel] = useState<string | null>(null); const [start, setStart] = useState(0); const [now, setNow] = useState(0);
  const [tl, setTl] = useState<TimelineEntry[]>([]); const [done, setDone] = useState<string[]>([]); const [who, setWho] = useState(''); const [other, setOther] = useState(''); const [sev, setSev] = useState(SEV[2]); const [ack, setAck] = useState(''); const [notes, setNotes] = useState('');
  const [v, setV] = useState<Record<string, string>>({}); const [verr, setVerr] = useState<Record<string, string>>({}); const [rep, setRep] = useState<Report | null>(null);
  useEffect(() => { if (!start) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [start]);
  if (!profile) return <NoData />;
  const subjectId = who || profile.id; const unlisted = subjectId === 'UNLISTED'; const subject = s.profiles.find((p) => p.id === subjectId);
  const em = EMERGENCIES.find((e) => e.id === sel); const secs = start ? Math.max(0, Math.round(((now || start) - start) / 1000)) : 0;
  const log = (text: string) => setTl((t) => [...t, { at: Date.now(), text }]);
  const choose = (id: string) => { setSel(id); const t = Date.now(); setStart(t); setNow(t); setDone([]); setRep(null); setTl([{ at: t, text: `Emergency opened: ${EMERGENCIES.find((e) => e.id === id)!.label}` }]); };
  const steps = em ? [...BASE_STEPS.slice(0, 3), ...em.extra, ...BASE_STEPS.slice(3)] : [];
  const tog = (x: string) => { const on = !done.includes(x); setDone((d) => (on ? [...d, x] : d.filter((y) => y !== x))); log(`${on ? 'Done' : 'Un-checked'}: ${x}`); };
  const emergencyReports = s.reports.filter((r) => r.kind === 'emergency');
  function saveVitals() {
    const out: Partial<Record<NumKey, number>> = {}; (['hr', 'sys', 'dia', 'spo2', 'temp'] as NumKey[]).forEach((k) => { if (v[k] !== undefined && v[k] !== '') out[k] = Number(v[k]); });
    if (!Object.keys(out).length) { setVerr({ _: 'Enter at least one value, or skip — never delay care for readings.' }); return; }
    const e = validateEntry(out, Date.now()); setVerr(e); if (Object.keys(e).length) return;
    if (unlisted) { setVerr({ _: 'This person has no AETHRA profile, so readings cannot be stored. Add them to the notes instead.' }); return; }
    addReading(out as any, { forId: subjectId, device: `Entered by ${profile!.name} during emergency` }); setV({}); log(`Readings recorded for ${subject?.name}: ${Object.entries(out).map(([k, x]) => `${k} ${x}`).join(', ')} (manual)`);
  }
  function generate() {
    const r = buildEmergencyReport(s, { labReferences: osdLabReferences, reporterId: profile!.id, subjectId, unlistedName: other, emergencyId: em!.id, severity: sev, timeline: [...tl, { at: Date.now(), text: 'Report generated and saved locally (not transmitted)' }], notes, ackBy: ack, startedAt: start });
    const saved = addReport({ astroId: r.astroId, kind: 'emergency', title: r.title, body: r.body });
    if (subject) set((x) => ({ ...x, symptoms: { ...x.symptoms, [subject.id]: { ts: Date.now(), ids: Array.from(new Set([...(x.symptoms[subject.id]?.ids ?? []), em!.id])) } } })); setRep(saved);
  }
  return (
    <div className="space-y-6">
      <PageHead crumb="Response & reporting" title="Emergency Center" sub="Act first. Alert crew and follow emergency procedures." />
      <Callout tone="crit" title="Local demo workflow — nothing is sent"><span>AETHRA does not alert crew, call ground, or contact a flight surgeon. It guides you and prepares a report you can pass on. Always follow the mission’s approved emergency procedures.</span></Callout>
      <Card title="1 · Who needs help?"><div className="grid gap-3 md:grid-cols-2"><Field label="Affected person"><select className={inputCls} value={subjectId} onChange={(e) => { setWho(e.target.value); setRep(null); }}>{s.profiles.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id}){p.id === profile.id ? ' — me' : ''}</option>)}<option value="UNLISTED">Someone not in the AETHRA roster</option></select></Field>
        {unlisted && <Field label="Name or description"><input className={inputCls} value={other} onChange={(e) => setOther(e.target.value)} /></Field>}</div>
        <p className="mt-2 text-xs text-mute">{unlisted ? 'No health data is held for this person; the report will say NOT AVAILABLE.' : `Report and readings will use ${subject?.name}’s own data only${subject && !(s.readings[subject.id] ?? []).length ? ' — none is recorded, so the report will say NOT AVAILABLE' : ''}.`}</p></Card>
      <Card title="2 · What is happening?"><div className="grid grid-cols-2 gap-2 md:grid-cols-5">{EMERGENCIES.map((e) => <button key={e.id} onClick={() => choose(e.id)} aria-pressed={sel === e.id} className={`min-h-[56px] rounded-lg border px-3 py-2 text-sm font-semibold ${sel === e.id ? 'border-crit bg-crit text-onaccent' : 'border-crit/40 bg-crit/5 text-tx hover:bg-crit/10'}`}>{e.label}</button>)}</div></Card>
      {em && <>
        <div role="alert" className="flex items-start gap-3 rounded-xl border-2 border-crit bg-crit/10 p-4"><Siren className="mt-0.5 shrink-0 text-crit" aria-hidden /><div><div className="text-lg font-bold text-crit">{em.msg}</div><div className="mt-1 font-mono text-sm text-mute">Time since you opened this event: {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</div></div></div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="3 · Immediate steps" className="lg:col-span-2"><p className="mb-2 text-xs text-warn">Generic prototype guidance — NOT an approved flight rule. Follow the mission’s approved onboard emergency protocol.</p>
            <ul className="space-y-1">{steps.map((st, i) => <li key={i}><button onClick={() => tog(st)} aria-pressed={done.includes(st)} className="flex min-h-[48px] w-full items-start gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-bg2">{done.includes(st) ? <CheckSquare className="mt-0.5 shrink-0 text-teal" size={20} aria-hidden /> : <Square className="mt-0.5 shrink-0 text-mute" size={20} aria-hidden />}<span><b className="mr-1 text-mute">{i + 1}.</b>{st}</span></button></li>)}</ul>
            <div className="mt-3 rounded-lg border border-crit/40 bg-bg2 p-3 text-sm"><b className="text-crit">Do NOT</b><Bullets items={[...em.avoid, 'Do not delay alerting crew or following the approved protocol to fill out forms.', 'This app gives no medication doses or treatments.']} /></div></Card>
          <div className="space-y-4">
            <Card title="Event details"><div className="space-y-3"><Field label="Severity (your judgment)"><select className={inputCls} value={sev} onChange={(e) => { setSev(e.target.value); log(`Severity set: ${e.target.value}`); }}>{SEV.map((x) => <option key={x}>{x}</option>)}</select></Field>
              <Field label="Crew acknowledged by" hint="Who confirmed they are responding? (typed record only)"><input className={inputCls} value={ack} onChange={(e) => setAck(e.target.value)} onBlur={() => ack && log(`Crew acknowledgement recorded: ${ack}`)} /></Field></div></Card>
            <Card title="Quick readings (optional)"><p className="mb-2 text-xs text-mute">Only if it does not delay care. Saved for {unlisted ? 'nobody (not in roster)' : subject?.name}.</p><div className="grid grid-cols-2 gap-2">{[['hr', 'HR (BPM)'], ['spo2', 'SpO₂ %'], ['sys', 'Systolic'], ['dia', 'Diastolic'], ['temp', 'Temp °C']].map(([k, l]) => <Field key={k} label={l} error={verr[k]}><input type="number" inputMode="decimal" step="any" className={inputCls} value={v[k] ?? ''} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></Field>)}</div>{verr._ && <p role="alert" className="mt-2 text-xs text-crit">{verr._}</p>}<Btn className="mt-2 w-full" onClick={saveVitals}>Record readings</Btn></Card>
          </div></div>
        <Card title="Event timeline (recorded locally)"><Timeline items={tl.map((t) => ({ at: t.at, text: t.text }))} /></Card>
        <Card title="4 · Emergency report"><Field label="Notes (symptoms, when it started, what happened)"><textarea className={`${inputCls} min-h-[90px]`} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <div className="mt-3 flex flex-wrap gap-2"><Btn variant="danger" onClick={generate}>Generate &amp; save report</Btn>{rep && <><Btn onClick={() => toPDF(rep)}><FileDown size={16} />PDF</Btn><Btn onClick={() => toJSON(rep)}>JSON</Btn><Btn onClick={() => toCSV(rep)}>CSV</Btn><Link href="/reports"><Btn>Open in Medical Reports</Btn></Link></>}</div>
          {rep && <p role="status" className="mt-3 text-sm text-teal">Report {rep.id} about <b>{rep.body.astronaut.name}</b> saved on this device. It has NOT been sent anywhere — pass it on through your mission communication system.</p>}</Card>
      </>}
      <Card title="Emergency history (this device)">{emergencyReports.length === 0 ? <p className="text-sm text-mute">No emergency reports yet.</p> : <ul className="divide-y divide-line text-sm">{emergencyReports.slice(0, 8).map((r) => <li key={r.id} className="py-2"><b>{r.title}</b><div className="text-xs text-mute">{new Date(r.ts).toLocaleString()} · {r.id} · {r.transmitted ? 'manually marked as sent' : 'not sent'}</div></li>)}</ul>}</Card>
      <Disclaimer />
    </div>
  );
}
