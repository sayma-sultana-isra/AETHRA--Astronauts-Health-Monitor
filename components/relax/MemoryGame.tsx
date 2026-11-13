'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Trophy } from 'lucide-react';
import { Btn } from '@/components/ui';
import { lsGet, lsSet, shuffle } from './store';

const PAIRS: { id: string; e: string; n: string }[] = [
  { id: 'tree', e: '🌳', n: 'Tree' }, { id: 'wave', e: '🌊', n: 'Ocean wave' }, { id: 'mtn', e: '⛰️', n: 'Mountain' }, { id: 'rain', e: '🌧️', n: 'Rain cloud' },
  { id: 'sun', e: '☀️', n: 'Sun' }, { id: 'flower', e: '🌸', n: 'Blossom' }, { id: 'snow', e: '❄️', n: 'Snowflake' }, { id: 'bfly', e: '🦋', n: 'Butterfly' },
];
type Card = { key: number; id: string; e: string; n: string };
const deal = (): Card[] => shuffle(PAIRS.flatMap((p) => [0, 1].map((i) => ({ key: 0, ...p, i })))).map((c, k) => ({ key: k, id: c.id, e: c.e, n: c.n }));
const BEST = 'aethra-memory-best';

export default function MemoryGame() {
  const [cards, setCards] = useState<Card[]>([]); const [open, setOpen] = useState<number[]>([]); const [done, setDone] = useState<string[]>([]); const [moves, setMoves] = useState(0); const [best, setBest] = useState<number | null>(null);
  const lock = useRef(false); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reset = useCallback(() => { if (timer.current) clearTimeout(timer.current); lock.current = false; setCards(deal()); setOpen([]); setDone([]); setMoves(0); }, []);
  useEffect(() => { reset(); const b = lsGet(BEST); if (b && !Number.isNaN(Number(b))) setBest(Number(b)); return () => { if (timer.current) clearTimeout(timer.current); }; }, [reset]);
  const won = cards.length > 0 && done.length === PAIRS.length;
  useEffect(() => { if (won && (best === null || moves < best)) { setBest(moves); lsSet(BEST, String(moves)); } }, [won]); // eslint-disable-line react-hooks/exhaustive-deps
  function flip(i: number) {
    if (lock.current || open.includes(i) || done.includes(cards[i].id)) return;
    const next = [...open, i]; setOpen(next);
    if (next.length === 2) {
      setMoves((m) => m + 1); const [a, b] = next;
      if (cards[a].id === cards[b].id) { setDone((d) => [...d, cards[a].id]); setOpen([]); }
      else { lock.current = true; timer.current = setTimeout(() => { setOpen([]); lock.current = false; }, 900); }
    }
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-mute">Find the matching pairs of things from home. There is no timer and no way to lose — take your time.</p>
        <div className="flex items-center gap-4 font-mono text-sm"><span>Moves <b className="text-cyan">{moves}</b></span><span>Pairs <b className="text-teal">{done.length}/{PAIRS.length}</b></span>{best !== null && <span className="flex items-center gap-1 text-warn"><Trophy size={14} aria-hidden />Best {best}</span>}<Btn onClick={reset}><RotateCcw size={16} aria-hidden />New game</Btn></div>
      </div>
      <div className="mx-auto grid max-w-md grid-cols-4 gap-2.5 sm:gap-3" role="group" aria-label="Memory cards">
        {cards.map((c, i) => { const up = open.includes(i) || done.includes(c.id); const matched = done.includes(c.id); return (
          <button key={c.key} onClick={() => flip(i)} aria-label={up ? c.n : 'Hidden card'} aria-pressed={up} className={`flex aspect-square items-center justify-center rounded-2xl border text-3xl transition-all duration-300 sm:text-4xl ${matched ? 'border-teal/50 bg-teal/10 shadow-[0_0_18px_-6px_rgb(var(--teal))]' : up ? 'border-cyan bg-cyan/10 shadow-glow' : 'border-line bg-bg2 hover:border-cyan/60'}`}>
            <span aria-hidden>{up ? c.e : <span className="text-lg text-mute/60">✦</span>}</span></button>); })}
      </div>
      {won && <p role="status" className="mt-5 text-center text-sm font-semibold text-teal">All pairs found in {moves} moves. Nicely done — take a slow breath.</p>}
    </div>
  );
}
