'use client';
import { Btn } from './ui'; import { useApp } from '@/lib/store';
export const ONBOARD_ITEMS: [string, string][] = [
  ['What AETHRA does', 'It helps track an astronaut’s health against their own baseline, explains why something is flagged, and guides an emergency report. It supports decisions; it never diagnoses.'],
  ['Choose an astronaut', 'The selector at the top shows who you are looking at. Every page, chart and report is for that person.'],
  ['Enter measurements', 'Use Health Check to record vitals and how you feel. Values you type are labelled MANUAL ENTRY.'],
  ['Understand statuses', 'GREEN = stable. AMBER = needs attention. RED = potential emergency. UNKNOWN = not enough recent data — never treated as healthy.'],
  ['Personal baselines', 'Your “normal” is stored in your profile. Changes from your own baseline matter more than a generic number.'],
  ['Space hazard monitoring', 'The Space Hazards page covers radiation, isolation, distance from Earth, gravity and the spacecraft environment. Each number shows whether it is simulated, manual or missing.'],
  ['Emergencies', 'The red EMERGENCY button is always visible. It opens a checklist and a report. In this prototype nothing is sent to anyone.'],
  ['Simulation mode', 'The demo mission is entirely simulated. Look for the SIMULATED tag. Real sensors, NASA data feeds and ground communication are not connected.'],
  ['What AETHRA cannot do', 'It is not a medical device, has no approved flight rules, does not encrypt data, and cannot contact Earth.'],
];
export default function Onboarding() {
  const { s, set, ready } = useApp();
  const show = ready && !s.onboarded;
  if (!show) return null;
  const done = () => set((x) => ({ ...x, onboarded: true }));
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 backdrop-blur-sm p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="ob-t" onKeyDown={(e) => e.key === 'Escape' && done()}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-line bg-card p-5 shadow-panel sm:rounded-3xl sm:p-7">
        <div className="eyebrow !text-cyan">Welcome to AETHRA</div>
        <h2 id="ob-t" className="mt-1 text-2xl font-semibold">Beyond Earth, Beyond Limits.</h2>
        <p className="mt-1 text-sm text-mute">Astronaut Health Monitoring &amp; Decision Support System. A two-minute orientation:</p>
        <ol className="mt-4 space-y-3">{ONBOARD_ITEMS.map(([h, t], i) => <li key={h} className="flex gap-3 text-sm"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan/40 bg-cyan/10 font-mono text-xs font-semibold text-cyan">{i + 1}</span><span><b>{h}.</b> <span className="text-mute">{t}</span></span></li>)}</ol>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-mute">You can reopen this guide any time in Settings.</span><Btn variant="primary" autoFocus onClick={done}>Got it — start</Btn></div>
      </div>
    </div>
  );
}
