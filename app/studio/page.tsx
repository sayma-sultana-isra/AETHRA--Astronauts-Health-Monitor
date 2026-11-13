'use client';
import { Callout, Card, Disclaimer, PageHead } from '@/components/ui';
import Studio from '@/components/relax/Studio';

export default function StudioPage() {
  return (
    <div className="space-y-6">
      <PageHead crumb="Relax & recharge" title="Canvas Studio" sub="A simple space to draw, write or unwind." />
      <Callout tone="info" title="Private by default">Drawings stay on this device. Nothing is uploaded, shared with crew or added to medical reports. Download a PNG if you want to keep or share one.</Callout>
      <Card><Studio /></Card>
      <Disclaimer />
    </div>
  );
}
