'use client';
import { useEffect, useState } from 'react';
import { Btn } from '@/components/ui';
import { shuffle } from './store';

type Q = { q: string; o: string[]; a: number; why: string };
const POOL: Q[] = [
  { q: 'About how much of Earth’s surface is covered by ocean?', o: ['About 31%', 'About 50%', 'About 71%', 'About 90%'], a: 2, why: 'Roughly 71% of the surface is ocean — one reason Earth looks blue from orbit.' },
  { q: 'Which is the tallest mountain above sea level?', o: ['Mount Everest', 'K2', 'Kilimanjaro', 'Denali'], a: 0, why: 'Mount Everest rises about 8,849 m above sea level.' },
  { q: 'Which rainforest is the largest on Earth?', o: ['Congo', 'Amazon', 'Daintree', 'Tongass'], a: 1, why: 'The Amazon rainforest spans much of northern South America.' },
  { q: 'Which gas makes up most of Earth’s atmosphere?', o: ['Oxygen', 'Carbon dioxide', 'Argon', 'Nitrogen'], a: 3, why: 'Nitrogen is about 78% of the air; oxygen is about 21%.' },
  { q: 'What is the deepest known part of the ocean called?', o: ['Challenger Deep', 'Great Blue Hole', 'Sunda Trench', 'Abyssal Rim'], a: 0, why: 'Challenger Deep, in the Mariana Trench, is nearly 11 km deep.' },
  { q: 'What are the “northern lights” properly called?', o: ['Aurora australis', 'Aurora borealis', 'Zodiacal light', 'Sprites'], a: 1, why: 'Aurora borealis. Charged particles from the Sun meet Earth’s magnetic field and light up the sky.' },
  { q: 'What is the main cause of ocean tides?', o: ['Wind', 'Earth’s spin alone', 'The Moon’s gravity', 'Ocean temperature'], a: 2, why: 'The Moon’s gravity (with a smaller pull from the Sun) raises the tides.' },
  { q: 'Which is the largest ocean?', o: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], a: 3, why: 'The Pacific covers about a third of the planet’s surface.' },
  { q: 'Which continent is the coldest and driest?', o: ['Antarctica', 'Asia', 'Greenland', 'North America'], a: 0, why: 'Antarctica holds most of Earth’s ice and is technically a polar desert.' },
  { q: 'When water vapour cools into tiny droplets that form clouds, this is called…', o: ['Evaporation', 'Condensation', 'Erosion', 'Precipitation'], a: 1, why: 'Condensation. Falling rain or snow is then called precipitation.' },
  { q: 'How long does Earth take to orbit the Sun once?', o: ['About 30 days', 'About 100 days', 'About 365 days', 'About 700 days'], a: 2, why: 'About 365.25 days — that is why we have a leap day every four years.' },
  { q: 'What do plants take in from the air to make food during photosynthesis?', o: ['Nitrogen', 'Carbon dioxide', 'Helium', 'Methane'], a: 1, why: 'Plants use sunlight, water and carbon dioxide, and release oxygen.' },
];
const ROUND = 6;

export default function QuizGame() {
  const [qs, setQs] = useState<Q[]>([]); const [i, setI] = useState(0); const [pick, setPick] = useState<number | null>(null); const [score, setScore] = useState(0);
  const start = () => { setQs(shuffle(POOL).slice(0, ROUND)); setI(0); setPick(null); setScore(0); };
  useEffect(start, []);
  if (!qs.length) return null;
  const finished = i >= qs.length; const q = qs[i];
  if (finished) return (
    <div className="mx-auto max-w-lg text-center"><div className="font-mono text-5xl font-semibold text-cyan">{score}<span className="text-2xl text-mute">/{qs.length}</span></div>
      <p role="status" className="mt-3 text-sm text-mute">{score >= 5 ? 'You really know your home planet.' : score >= 3 ? 'A good tour of home. Each round brings different questions.' : 'Learning about home is the point. Try another round.'}</p><Btn variant="primary" className="mt-4" onClick={start}>Play another round</Btn></div>);
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 flex justify-between font-mono text-xs text-mute"><span>Question {i + 1} of {qs.length}</span><span>Score {score}</span></div>
      <h3 className="text-lg font-semibold">{q.q}</h3>
      <div className="mt-4 grid gap-2.5" role="group" aria-label="Answers">{q.o.map((o, k) => { const shown = pick !== null; const good = k === q.a; const cls = !shown ? 'border-line bg-bg2 hover:border-cyan/70' : good ? 'border-teal bg-teal/10 text-teal' : k === pick ? 'border-warn bg-warn/10 text-warn' : 'border-line bg-bg2 opacity-60';
        return <button key={k} disabled={shown} onClick={() => { setPick(k); if (good) setScore((s) => s + 1); }} className={`min-h-[48px] rounded-xl border px-4 py-2 text-left text-sm transition-colors ${cls}`}><span className="mr-2 font-mono text-mute">{'ABCD'[k]}</span>{o}{shown && good && <span className="sr-only"> (correct answer)</span>}</button>; })}</div>
      {pick !== null && <div role="status" className="mt-4 rounded-xl border border-line bg-bg2/70 p-3 text-sm"><b>{pick === q.a ? 'Correct. ' : 'Not this time. '}</b><span className="text-mute">{q.why}</span><div className="mt-3"><Btn variant="primary" autoFocus onClick={() => { setI(i + 1); setPick(null); }}>{i + 1 === qs.length ? 'See result' : 'Next question'}</Btn></div></div>}
    </div>
  );
}
