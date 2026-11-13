'use client';
import { useState } from 'react';
import { Globe, Sprout, Brain, Waves, type LucideIcon } from 'lucide-react';
import { Callout, Card, Disclaimer, PageHead } from '@/components/ui';
import MemoryGame from '@/components/relax/MemoryGame'; import QuizGame from '@/components/relax/QuizGame'; import GardenGame from '@/components/relax/GardenGame'; import SoundGame from '@/components/relax/SoundGame'; import ReactionGame from '@/components/relax/ReactionGame'; import PatternGame from '@/components/relax/PatternGame';

const GAMES: { id: string; label: string; sub: string; I: LucideIcon }[] = [
  { id: 'memory', label: 'Earth Memory Match', sub: 'Match pairs of nature', I: Brain },
  { id: 'quiz', label: 'Home Planet Quiz', sub: 'Gentle Earth trivia', I: Globe },
  { id: 'garden', label: 'Tiny Garden', sub: 'Plant, water, pick', I: Sprout },
  { id: 'sound', label: 'Earth Soundscape', sub: 'Rain, ocean, wind, birds', I: Waves },
  { id: 'reaction', label: 'Reaction Test', sub: 'A quick focus challenge', I: Brain },
  { id: 'pattern', label: 'Pattern Recall', sub: 'Remember the light sequence', I: Sprout },
];
export default function Relax() {
  const [id, setId] = useState('memory'); const g = GAMES.find((x) => x.id === id)!;
  return (
    <div className="space-y-6">
      <PageHead crumb="Relax & recharge" title="Relax & Recharge" sub="Choose a short game or calming activity." />
      <Callout tone="info" title="For relaxation, not treatment">These activities are a way to unwind and feel connected to Earth. If low mood, stress or isolation keeps building, use the Mental Wellness page and talk to your crew or medical support.</Callout>
      <div role="tablist" aria-label="Games" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{GAMES.map(({ id: gid, label, sub, I }) => (
        <button key={gid} role="tab" aria-selected={gid === id} aria-controls="game-panel" onClick={() => setId(gid)} className={`flex min-h-[64px] items-center gap-3 rounded-2xl border px-4 text-left transition-colors ${gid === id ? 'border-cyan bg-cyan/10 shadow-glow' : 'border-line bg-card/80 hover:border-cyan/60'}`}>
          <I size={22} aria-hidden className={gid === id ? 'text-cyan' : 'text-mute'} /><span><span className="block text-sm font-semibold">{label}</span><span className="block text-xs text-mute">{sub}</span></span></button>))}</div>
      <Card title={g.label} id="game-panel"><div role="tabpanel">
        {id === 'memory' && <MemoryGame />}{id === 'quiz' && <QuizGame />}{id === 'garden' && <GardenGame />}{id === 'sound' && <SoundGame />}{id === 'reaction' && <ReactionGame />}{id === 'pattern' && <PatternGame />}</div></Card>
      <Disclaimer />
    </div>
  );
}
