'use client';
import { useEffect, useState } from 'react';
import { Btn } from '@/components/ui';
const COLORS = ['bg-rose-400','bg-amber-300','bg-sky-400','bg-emerald-400'];
export default function PatternGame() {
  const [seq,setSeq] = useState<number[]>([]); const [step,setStep] = useState(0); const [active,setActive] = useState<number|null>(null); const [playing,setPlaying] = useState(false); const [level,setLevel] = useState(0); const [message,setMessage] = useState('Start a pattern and repeat it.');
  useEffect(() => { if (!playing || !seq.length) return; let i=0; const t=setInterval(()=>{ setActive(seq[i]); setTimeout(()=>setActive(null),360); i++; if(i>=seq.length){clearInterval(t);setPlaying(false);setMessage('Your turn — repeat the pattern.');}},650); return ()=>clearInterval(t); },[playing,seq]);
  const begin=()=>{const s=[Math.floor(Math.random()*4)];setSeq(s);setStep(0);setLevel(0);setMessage('Watch the pattern…');setPlaying(true);};
  const next=(n:number)=>{if(playing||!seq.length)return; if(seq[step]!==n){setMessage('Not quite. Start again to try a new pattern.');setSeq([]);setLevel(0);return;} if(step===seq.length-1){const s=[...seq,Math.floor(Math.random()*4)];setSeq(s);setStep(0);setLevel(s.length-1);setMessage('Good job — watch the next pattern.');setPlaying(true);}else setStep(step+1);};
  return <div className="space-y-3 text-center"><p className="text-sm text-mute">Remember the lights, then repeat them in the same order.</p><div className="mx-auto grid max-w-xs grid-cols-2 gap-3">{COLORS.map((c,i)=><button key={i} aria-label={`Pattern button ${i+1}`} onClick={()=>next(i)} className={`aspect-square rounded-2xl border-2 border-white/10 ${c} ${active===i?'scale-95 brightness-150 ring-4 ring-white/60':'opacity-75'} transition`} />)}</div><p className="text-sm" aria-live="polite">{message}</p><p className="text-xs text-mute">Level: {level}</p><Btn onClick={begin}>New game</Btn></div>;
}
