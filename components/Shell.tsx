'use client';
import Link from 'next/link'; import { usePathname } from 'next/navigation'; import { useEffect, useState } from 'react';
import { Atom, BookOpen, Brain, ClipboardCheck, FileText, History, LayoutDashboard, Menu, Radar, Settings, Siren, Users, X, Wifi, WifiOff, Bot, Accessibility, Gamepad2, Palette } from 'lucide-react';
import { useApp } from '@/lib/store'; import { SimTag, StatusBadge } from './ui'; import Onboarding from './Onboarding';

const GROUPS = [
  { g: 'Mission', items: [{ href: '/', label: 'Overview', I: Radar }, { href: '/dashboard', label: 'Health Dashboard', I: LayoutDashboard }, { href: '/crew', label: 'Crew', I: Users }] },
  { g: 'Health', items: [{ href: '/check', label: 'Health Check', I: ClipboardCheck }, { href: '/assess', label: 'Assessment', I: Bot }, { href: '/history', label: 'Health History', I: History }, { href: '/body', label: 'Body Explorer', I: Accessibility }] },
  { g: 'Support & Tools', items: [{ href: '/hazards', label: 'Space Hazards', I: Atom }, { href: '/wellness', label: 'Mental Wellness', I: Brain }, { href: '/relax', label: 'Relax & Games', I: Gamepad2 }, { href: '/studio', label: 'Canvas Studio', I: Palette }, { href: '/emergency', label: 'Emergency', I: Siren }, { href: '/reports', label: 'Reports', I: FileText }, { href: '/resources', label: 'Resources', I: BookOpen }, { href: '/settings', label: 'Settings', I: Settings }] },
];
export const LogoMark = ({ size = 36 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#275BD6" /><stop offset="1" stopColor="#DD6F42" /></linearGradient></defs>
    <rect width="64" height="64" rx="16" fill="#1B2942" stroke="#52617A" /><ellipse cx="32" cy="34" rx="25" ry="9" transform="rotate(-24 32 34)" fill="none" stroke="url(#lg)" strokeWidth="2" opacity=".75" />
    <path d="M17 44 L32 15 L47 44" fill="none" stroke="url(#lg)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M23 35h6l3-5 4 9 3-4h5" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const FLAT = GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, g: g.g })));
export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const [open, setOpen] = useState(false); const { s, set, online, profile, assessment, ready, persistMsg, notice, dismissNotice } = useApp();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open]);
  const cur = FLAT.find((i) => (i.href === '/' ? path === '/' : path.startsWith(i.href)));
  const pending = s.reports.filter((r) => !r.transmitted).length;
  const conn = !online ? { t: 'Offline · local data', c: 'text-warn', I: WifiOff } : { t: 'Online · local mode', c: 'text-teal', I: Wifi };
  const nav = (
    <nav aria-label="Main" className="aethra-nav px-3 pb-8">
      {GROUPS.map((g) => (<div key={g.g} className="mt-5"><div className="eyebrow px-3 pb-1.5 !text-[10px] !text-mute/80">{g.g}</div>
        {g.items.map(({ href, label, I }) => { const on = href === '/' ? path === '/' : path.startsWith(href); return (
          <Link key={href} href={href} aria-current={on ? 'page' : undefined} className={`relative flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm transition-colors ${on ? 'bg-cyan/10 font-semibold text-cyan shadow-[inset_0_0_0_1px_rgb(var(--cyan)/0.25)]' : 'text-mute hover:bg-white/5 hover:text-tx'}`}>{on && <span className="absolute -left-3 top-2.5 h-6 w-1 rounded-r bg-cyan shadow-[0_0_12px_rgb(var(--cyan))]" aria-hidden />}<I size={18} aria-hidden />{label}{href === '/reports' && pending > 0 && <span className="ml-auto rounded-full bg-cyan px-2 font-mono text-xs font-semibold text-onaccent">{pending}</span>}</Link>); })}</div>))}
    </nav>
  );
  const brand = <div className="aethra-brand flex items-center gap-3 px-5 pb-1 pt-6"><span className="aethra-brand-mark"><LogoMark size={40} /></span><div><div className="text-lg font-semibold leading-none tracking-[0.28em] text-tx">AETHRA</div><div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-mute">Astronaut Health System</div></div></div>;
  return (
    <div className="aethra-shell min-h-screen lg:pl-64">
      <a href="#main" className="skip">Skip to main content</a>
      <aside className="aethra-sidebar on-dark fixed inset-y-0 left-0 z-30 hidden w-64 overflow-y-auto border-r border-line bg-navy/95 backdrop-blur lg:block">{brand}{nav}</aside>
      {open && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} /><aside role="dialog" aria-modal="true" aria-label="Navigation" className="aethra-sidebar on-dark absolute inset-y-0 left-0 w-72 overflow-y-auto border-r border-line bg-navy"><button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-1 top-1 min-h-[44px] min-w-[44px] text-tx"><X className="mx-auto" /></button>{brand}{nav}</aside></div>}
      <header className="aethra-topbar sticky top-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-bg/75 px-3 py-3 backdrop-blur-xl md:px-6">
        <button aria-label="Open menu" aria-expanded={open} className="min-h-[44px] min-w-[44px] rounded-xl border border-line bg-bg2 lg:hidden" onClick={() => setOpen(true)}><Menu className="mx-auto" /></button>
        <div className="min-w-0 flex-1 text-sm">
          {profile ? <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="astro">Selected astronaut</label><select id="astro" className="min-h-[40px] max-w-[220px] rounded-xl border border-line bg-bg2 px-2.5 text-sm font-semibold text-tx" value={s.activeId} onChange={(e) => set((x) => ({ ...x, activeId: e.target.value }))}>{s.profiles.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}</select><span className="hidden text-mute sm:inline">Day {profile.mission.day} · {profile.mission.env}</span>{profile.simulated && <SimTag>SIMULATED MISSION</SimTag>}</div> : <span className="text-mute">No mission loaded</span>}
          {cur && <div className="eyebrow mt-1 hidden !text-[10px] md:block">{cur.g} <span className="text-cyan">/</span> {cur.label}</div>}
        </div>
        {assessment && <StatusBadge s={assessment.status} short />}
        <span className={`hidden items-center gap-1.5 rounded-full border border-line bg-bg2 px-3 py-1.5 font-mono text-[11px] xl:inline-flex ${conn.c}`}><conn.I size={14} aria-hidden />{conn.t}</span>
        <Link href="/emergency" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-crit px-4 text-sm font-bold tracking-wide text-onaccent shadow-alert transition hover:brightness-110"><Siren size={18} aria-hidden />EMERGENCY</Link>
      </header>
      {!online && <div role="status" className="bg-warn/15 px-4 py-2 text-center text-xs font-medium text-warn xl:hidden">Offline — working from local data</div>}
      {assessment?.status === 'RED' && path !== '/emergency' && <Link href="/emergency" className="block bg-crit px-4 py-3 text-center text-sm font-semibold text-onaccent">Potential emergency flagged by the safety rules — open the Emergency Center</Link>}
      {persistMsg && <div role="alert" className="bg-warn/15 px-4 py-2 text-center text-xs font-medium text-warn">{persistMsg}</div>}
      {notice && <div role="status" className="flex items-center justify-center gap-3 border-b border-cyan/20 bg-cyan/10 px-4 py-2 text-center text-xs text-cyan">{notice}<button className="underline" onClick={dismissNotice}>Dismiss</button></div>}
      <main id="main" tabIndex={-1} className="aethra-main mx-auto max-w-[1440px] p-4 md:p-7 xl:p-8">{ready ? children : <p role="status" className="text-mute">Loading AETHRA from local storage…</p>}</main>
      <footer className="aethra-footer mx-auto max-w-[1440px] px-4 pb-8 font-mono text-[10px] uppercase tracking-[.08em] text-mute/80 md:mx-7 md:px-0 xl:mx-8">AETHRA · Research prototype · Not a medical device · v2.0</footer>
      <Onboarding />
    </div>
  );
}
