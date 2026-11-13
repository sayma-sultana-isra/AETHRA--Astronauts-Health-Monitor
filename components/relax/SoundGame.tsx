'use client';
import { useEffect, useRef, useState } from 'react';
import { Play, Square } from 'lucide-react';
import { Btn, Field } from '@/components/ui';

/** Earth soundscape mixer. All sounds are synthesised in the browser (Web Audio) — no downloads, works offline. */
const LAYERS = [
  { id: 'rain', n: 'Rain', e: '🌧️', d: 'Steady rainfall on leaves' },
  { id: 'ocean', n: 'Ocean waves', e: '🌊', d: 'Slow surf rolling onto a beach' },
  { id: 'wind', n: 'Wind', e: '🍃', d: 'A soft breeze over open land' },
  { id: 'birds', n: 'Birdsong', e: '🐦', d: 'Distant morning birds' },
] as const;
type Id = (typeof LAYERS)[number]['id'];
type Engine = { ctx: AudioContext; gains: Record<Id, GainNode>; stop: () => void };

function noiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
  const b = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b;
}
function build(): Engine | null {
  const AC: typeof AudioContext | undefined = typeof window === 'undefined' ? undefined : window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC(); const buf = noiseBuffer(ctx); const stops: (() => void)[] = [];
  const src = () => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); stops.push(() => { try { s.stop(); } catch { /* already stopped */ } }); return s; };
  const mk = () => { const g = ctx.createGain(); g.gain.value = 0; g.connect(ctx.destination); return g; };
  const gains = { rain: mk(), ocean: mk(), wind: mk(), birds: mk() } as Record<Id, GainNode>;
  // Rain: bright filtered noise
  const rf = ctx.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 1200; src().connect(rf); rf.connect(gains.rain);
  // Ocean: dark noise whose level swells slowly
  const of = ctx.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 520; const sw = ctx.createGain(); sw.gain.value = 0.55; src().connect(of); of.connect(sw); sw.connect(gains.ocean);
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11; const lg = ctx.createGain(); lg.gain.value = 0.45; lfo.connect(lg); lg.connect(sw.gain); lfo.start(); stops.push(() => { try { lfo.stop(); } catch { /* */ } });
  // Wind: band-passed noise with a drifting centre frequency
  const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 450; wf.Q.value = 0.8; src().connect(wf); wf.connect(gains.wind);
  const wl = ctx.createOscillator(); wl.frequency.value = 0.07; const wg = ctx.createGain(); wg.gain.value = 220; wl.connect(wg); wg.connect(wf.frequency); wl.start(); stops.push(() => { try { wl.stop(); } catch { /* */ } });
  // Birds: occasional short chirps
  let alive = true; let timer: ReturnType<typeof setTimeout>;
  const chirp = () => {
    if (!alive) return; const t = ctx.currentTime; const n = 1 + Math.floor(Math.random() * 3); const base = 2200 + Math.random() * 1800;
    for (let k = 0; k < n; k++) { const o = ctx.createOscillator(); const e = ctx.createGain(); const t0 = t + k * 0.16; o.type = 'sine'; o.frequency.setValueAtTime(base, t0); o.frequency.exponentialRampToValueAtTime(base * 1.35, t0 + 0.09); e.gain.setValueAtTime(0.0001, t0); e.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); e.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12); o.connect(e); e.connect(gains.birds); o.start(t0); o.stop(t0 + 0.14); }
    timer = setTimeout(chirp, 1800 + Math.random() * 4200);
  };
  timer = setTimeout(chirp, 800);
  return { ctx, gains, stop: () => { alive = false; clearTimeout(timer); stops.forEach((f) => f()); ctx.close().catch(() => undefined); } };
}

export default function SoundGame() {
  const [on, setOn] = useState(false); const [vol, setVol] = useState<Record<Id, number>>({ rain: 50, ocean: 35, wind: 0, birds: 0 }); const [err, setErr] = useState('');
  const eng = useRef<Engine | null>(null); const volRef = useRef(vol); volRef.current = vol;
  const apply = (e: Engine, v: Record<Id, number>) => LAYERS.forEach((l) => e.gains[l.id].gain.setTargetAtTime((v[l.id] / 100) * 0.5, e.ctx.currentTime, 0.15));
  useEffect(() => () => { eng.current?.stop(); eng.current = null; }, []);
  useEffect(() => { if (eng.current) apply(eng.current, vol); }, [vol]);
  function toggle() {
    if (on) { eng.current?.stop(); eng.current = null; setOn(false); return; }
    const e = build(); if (!e) { setErr('This browser cannot play synthesised sound.'); return; }
    setErr(''); eng.current = e; apply(e, volRef.current); e.ctx.resume().catch(() => undefined); setOn(true);
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-sm text-mute">Mix the sounds of home. Everything is generated on this device, so it works offline. Use headphones or keep the volume low in shared spaces.</p><Btn variant={on ? 'default' : 'primary'} onClick={toggle} aria-pressed={on}>{on ? <><Square size={16} aria-hidden />Stop sounds</> : <><Play size={16} aria-hidden />Start soundscape</>}</Btn></div>
      {err && <p role="alert" className="mb-3 text-sm text-crit">{err}</p>}
      <div className="grid gap-3 md:grid-cols-2">{LAYERS.map((l) => (
        <div key={l.id} className="rounded-2xl border border-line bg-bg2/60 p-4"><div className="mb-2 flex items-center gap-3"><span className="text-2xl" aria-hidden>{l.e}</span><div><div className="text-sm font-semibold">{l.n}</div><div className="text-xs text-mute">{l.d}</div></div><span className="ml-auto font-mono text-xs text-cyan">{vol[l.id]}%</span></div>
          <Field label={`${l.n} volume`}><input type="range" min={0} max={100} value={vol[l.id]} onChange={(e) => setVol({ ...vol, [l.id]: Number(e.target.value) })} className="h-8 w-full" /></Field></div>))}</div>
      {!on && <p className="mt-3 text-xs text-mute">Press Start first — browsers only allow sound after you tap a button.</p>}
    </div>
  );
}
