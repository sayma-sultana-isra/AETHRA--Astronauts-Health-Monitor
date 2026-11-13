'use client';
import { useState } from 'react'; import { Btn, Field, inputCls } from './ui'; import { ENVS, Profile } from '@/lib/types'; import { uid } from '@/lib/store'; import { isDuplicateId } from '@/lib/validate';
const blank = (): Profile => ({ id: 'AM-' + uid().slice(0, 4).toUpperCase(), name: '', age: 40, history: '', allergies: '', meds: '', baseline: { hr: 65, sys: 120, dia: 78, spo2: 98, temp: 36.6, sleepH: 7 }, mission: { name: 'Mars Transit Simulation', day: 1, durationDays: 520, destination: 'Mars', env: 'Spacecraft' }, simulated: false });
/** existingIds: IDs already in use by OTHER astronauts. When editing, the ID is locked. */
export default function ProfileForm({ initial, onSave, label = 'Save profile', existingIds = [], externalError }: { initial?: Profile; onSave: (p: Profile) => void; label?: string; existingIds?: string[]; externalError?: string | null }) {
  const [p, setP] = useState<Profile>(initial ?? blank()); const [err, setErr] = useState<Record<string, string>>({});
  const num = (v: string) => (v === '' ? NaN : Number(v));
  const b = (k: keyof Profile['baseline'], v: string) => setP({ ...p, baseline: { ...p.baseline, [k]: num(v) } });
  const m = (k: keyof Profile['mission'], v: any) => setP({ ...p, mission: { ...p.mission, [k]: v } });
  function submit() {
    const e: Record<string, string> = {}; const r = (k: string, v: number, a: number, z: number) => { if (!(v >= a && v <= z)) e[k] = `Enter a number from ${a} to ${z}`; };
    if (!p.name.trim()) e.name = 'Name is required'; if (!p.id.trim()) e.id = 'ID is required'; else if (!initial && isDuplicateId(existingIds, p.id)) e.id = 'This astronaut ID is already in use. Choose another.';
    r('age', p.age, 18, 90); r('hr', p.baseline.hr, 30, 120); r('sys', p.baseline.sys, 80, 180); r('dia', p.baseline.dia, 40, 120); r('spo2', p.baseline.spo2, 85, 100); r('temp', p.baseline.temp, 35, 38.5); r('sleepH', p.baseline.sleepH, 3, 12); r('day', p.mission.day, 1, 2000); r('dur', p.mission.durationDays, 1, 3000);
    if (p.baseline.dia >= p.baseline.sys) e.dia = 'Diastolic must be lower than systolic'; if (!p.mission.name.trim()) e.mname = 'Mission name is required';
    setErr(e); if (!Object.keys(e).length) onSave({ ...p, name: p.name.trim(), id: p.id.trim() });
  }
  const T = (k: string, label: string, val: any, on: (v: string) => void, type = 'text', hint?: string, disabled = false) => <Field label={label} error={err[k]} hint={hint}><input className={inputCls} type={type} step="any" value={Number.isNaN(val) ? '' : val} onChange={(e) => on(e.target.value)} aria-invalid={!!err[k]} disabled={disabled} /></Field>;
  return (
    <div className="space-y-5">
      <p className="text-xs text-mute">You do not need real sensitive medical information to explore AETHRA. Data stays in this browser (IndexedDB) and is not encrypted.</p>
      <div className="grid gap-3 md:grid-cols-3">{T('id', 'Astronaut ID', p.id, (v) => setP({ ...p, id: v }), 'text', initial ? 'The ID cannot be changed after creation.' : 'Must be unique.', !!initial)}{T('name', 'Display name', p.name, (v) => setP({ ...p, name: v }))}{T('age', 'Age', p.age, (v) => setP({ ...p, age: num(v) }), 'number')}</div>
      <div className="grid gap-3 md:grid-cols-3">{T('hist', 'Relevant medical history', p.history, (v) => setP({ ...p, history: v }))}{T('all', 'Allergies', p.allergies, (v) => setP({ ...p, allergies: v }))}{T('meds', 'Current medications', p.meds, (v) => setP({ ...p, meds: v }))}</div>
      <div><h3 className="mb-1 text-sm font-semibold">Personal baseline — your usual resting values</h3><p className="mb-2 text-xs text-mute">AETHRA compares new vital-sign readings with these numbers. The prefilled values are starter estimates, not measured astronaut data—replace them with this person's verified resting baseline before relying on baseline comparisons. After creating the profile, enter current vitals and lab-report values in Health Check; compatible CBC/CMP results are compared with source-supplied NASA OSD intervals.</p><div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {T('hr', 'Heart rate (BPM)', p.baseline.hr, (v) => b('hr', v), 'number')}{T('sys', 'Systolic (mmHg)', p.baseline.sys, (v) => b('sys', v), 'number')}{T('dia', 'Diastolic (mmHg)', p.baseline.dia, (v) => b('dia', v), 'number')}
        {T('spo2', 'SpO₂ (%)', p.baseline.spo2, (v) => b('spo2', v), 'number')}{T('temp', 'Temperature (°C)', p.baseline.temp, (v) => b('temp', v), 'number')}{T('sleepH', 'Sleep (hours)', p.baseline.sleepH, (v) => b('sleepH', v), 'number')}</div></div>
      <div className="grid gap-3 md:grid-cols-3">{T('mname', 'Mission name', p.mission.name, (v) => m('name', v))}{T('dest', 'Destination', p.mission.destination, (v) => m('destination', v))}
        <Field label="Environment"><select className={inputCls} value={p.mission.env} onChange={(e) => m('env', e.target.value)}>{ENVS.map((x) => <option key={x}>{x}</option>)}</select></Field>
        {T('day', 'Mission day', p.mission.day, (v) => m('day', num(v)), 'number')}{T('dur', 'Mission length (days)', p.mission.durationDays, (v) => m('durationDays', num(v)), 'number')}</div>
      {externalError && <p role="alert" className="text-sm font-medium text-crit">{externalError}</p>}
      <Btn variant="primary" onClick={submit}>{label}</Btn>
    </div>
  );
}
