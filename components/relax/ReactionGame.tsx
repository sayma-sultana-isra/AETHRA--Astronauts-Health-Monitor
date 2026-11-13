'use client';
import { useEffect, useRef, useState } from 'react';
import { Btn } from '@/components/ui';

export default function ReactionGame() {
  const [phase, setPhase] = useState<'ready'|'wait'|'go'|'done'|'early'>('ready');
  const [score, setScore] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(0);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const start = () => {
    if (timer.current) clearTimeout(timer.current);
    setScore(null); setPhase('wait');
    timer.current = setTimeout(() => { started.current = Date.now(); setPhase('go'); }, 1400 + Math.random() * 2600);
  };
  const tap = () => {
    if (phase === 'wait') { if (timer.current) clearTimeout(timer.current); setPhase('early'); }
    else if (phase === 'go') { const n = Date.now() - started.current; setScore(n); setBest((b) => b === null ? n : Math.min(b, n)); setPhase('done'); }
  };
  const color = phase === 'go' ? 'bg-teal/20 border-teal' : phase === 'wait' ? 'bg-warn/10 border-warn' : 'bg-bg2 border-line';
  return <div className="space-y-3 text-center"><p className="text-sm text-mute">Wait for the green signal, then tap as quickly as you can.</p><button onClick={phase === 'ready' || phase === 'done' || phase === 'early' ? start : tap} className={`flex min-h-44 w-full flex-col items-center justify-center rounded-2xl border-2 ${color}`}><span className="text-xl font-bold">{phase === 'ready' ? 'Ready?' : phase === 'wait' ? 'Wait…' : phase === 'go' ? 'TAP NOW!' : phase === 'early' ? 'Too soon!' : `${score} ms`}</span><span className="mt-1 text-xs text-mute">{phase === 'wait' ? 'Do not tap yet' : phase === 'go' ? 'Tap anywhere in this panel' : phase === 'done' ? 'Tap to try again' : 'Tap to start'}</span></button><div className="flex items-center justify-center gap-4 text-sm"><span>Last: <b>{score === null ? '—' : `${score} ms`}</b></span><span>Best: <b>{best === null ? '—' : `${best} ms`}</b></span></div>{phase === 'early' && <p className="text-xs text-warn">Wait for green next time.</p>}<Btn onClick={start}>Start round</Btn></div>;
}
