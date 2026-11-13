'use client';
import { useState } from 'react';
import { Droplets, Sprout } from 'lucide-react';
import { Btn } from '@/components/ui';

const SEEDS = [{ id: 'flower', n: 'Sunflower', e: '🌻' }, { id: 'tree', n: 'Tree', e: '🌳' }, { id: 'veg', n: 'Tomato', e: '🍅' }, { id: 'herb', n: 'Herbs', e: '🌿' }];
type Plot = { stage: 0 | 1 | 2 | 3; kind: string };
const empty = (): Plot[] => Array.from({ length: 8 }, () => ({ stage: 0, kind: 'flower' }));
const glyph = (p: Plot) => p.stage === 0 ? '' : p.stage === 1 ? '🌱' : p.stage === 2 ? '🪴' : SEEDS.find((s) => s.id === p.kind)!.e;
const label = (p: Plot, i: number) => `Plot ${i + 1}: ` + (p.stage === 0 ? 'empty soil, tap to plant' : p.stage === 1 ? 'seed, tap to water' : p.stage === 2 ? 'sprout, tap to water' : 'in bloom, tap to pick');

export default function GardenGame() {
  const [plots, setPlots] = useState<Plot[]>(empty); const [seed, setSeed] = useState('flower'); const [grown, setGrown] = useState(0);
  function tap(i: number) {
    const p = plots[i];
    if (p.stage === 3) setGrown((g) => g + 1);
    setPlots((ps) => ps.map((x, k) => k !== i ? x : x.stage === 0 ? { stage: 1, kind: seed } : x.stage === 3 ? { stage: 0, kind: x.kind } : { ...x, stage: (x.stage + 1) as Plot['stage'] }));
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-sm text-mute">A quiet little garden. Choose a seed, tap soil to plant, tap again to water, and pick the bloom when it is ready. Nothing wilts and nothing runs out.</p><div className="flex items-center gap-3 font-mono text-sm"><span>Grown <b className="text-teal">{grown}</b></span><Btn onClick={() => { setPlots(empty()); setGrown(0); }}>Clear garden</Btn></div></div>
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Seed type"><span className="eyebrow mr-1">Seed</span>{SEEDS.map((s) => <button key={s.id} onClick={() => setSeed(s.id)} aria-pressed={seed === s.id} className={`min-h-[40px] rounded-xl border px-3 text-sm ${seed === s.id ? 'border-cyan bg-cyan/10 text-cyan' : 'border-line bg-bg2 hover:border-cyan/60'}`}><span aria-hidden className="mr-1">{s.e}</span>{s.n}</button>)}</div>
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-2.5 rounded-3xl border border-line bg-gradient-to-b from-sky-900/20 to-amber-900/20 p-3 sm:gap-3 sm:p-4" role="group" aria-label="Garden plots">
        {plots.map((p, i) => <button key={i} onClick={() => tap(i)} aria-label={label(p, i)} className={`group relative flex aspect-square items-center justify-center rounded-2xl border text-4xl transition-all sm:text-5xl ${p.stage === 3 ? 'border-teal/60 bg-teal/10 shadow-[0_0_20px_-6px_rgb(var(--teal))]' : 'border-amber-900/50 bg-[#2a1d14] hover:border-cyan/60'}`}>
          <span aria-hidden>{glyph(p) || <Sprout size={22} className="text-mute/50 group-hover:text-cyan" />}</span>{p.stage > 0 && p.stage < 3 && <Droplets size={14} aria-hidden className="absolute bottom-1.5 right-1.5 text-cyan/70" />}</button>)}
      </div>
    </div>
  );
}
