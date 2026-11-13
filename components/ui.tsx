'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import type { Source, Status } from '@/lib/types';
import { Circle, CheckCircle2, AlertTriangle, Siren, HelpCircle, Info } from 'lucide-react';

export const STATUS_STYLE: Record<Status, { c: string; bg: string; label: string; short: string; Icon: any; hint: string }> = {
  GREEN: { c: 'text-teal', bg: 'bg-teal/10 border-teal/40', label: 'GREEN — Stable', short: 'Stable', Icon: CheckCircle2, hint: 'Routine monitoring' },
  AMBER: { c: 'text-warn', bg: 'bg-warn/10 border-warn/50', label: 'AMBER — Needs attention', short: 'Needs attention', Icon: AlertTriangle, hint: 'Reassess' },
  RED: { c: 'text-crit', bg: 'bg-crit/10 border-crit/50', label: 'RED — Potential emergency', short: 'Potential emergency', Icon: Siren, hint: 'Immediate response' },
  UNKNOWN: { c: 'text-mute', bg: 'bg-bg2 border-line', label: 'UNKNOWN — Not enough recent data', short: 'Not enough data', Icon: HelpCircle, hint: 'Take measurements' },
};
export function StatusBadge({ s, big, short }: { s: Status; big?: boolean; short?: boolean }) {
  const st = STATUS_STYLE[s]; return <span className={`inline-flex items-center gap-2 rounded-full border font-semibold ${st.bg} ${st.c} ${s === 'RED' ? 'shadow-alert' : ''} ${big ? 'px-5 py-2.5 text-base' : 'px-3 py-1 text-xs'}`}><st.Icon size={big ? 20 : 14} aria-hidden />{short ? `${s} — ${st.short}` : st.label}</span>;
}
export const SourceTag = ({ s }: { s: Source | 'missing' | 'sensor' | 'public-dataset' }) => {
  const m: Record<string, [string, string]> = { simulated: ['SIMULATED', 'border-warn/50 bg-warn/10 text-warn'], manual: ['MANUAL ENTRY', 'border-cyan/40 bg-cyan/10 text-cyan'], sensor: ['SENSOR', 'border-teal/40 bg-teal/10 text-teal'], 'public-dataset': ['PUBLIC DATASET', 'border-teal/40 bg-teal/10 text-teal'], missing: ['NO DATA', 'border-line bg-bg2 text-mute'] };
  const [t, c] = m[s]; return <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[10.5px] font-semibold tracking-[0.08em] ${c}`}>{t}</span>;
};
export const SimTag = ({ children = 'SIMULATED' }: { children?: React.ReactNode }) => <span className="rounded-md border border-warn/50 bg-warn/10 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold tracking-[0.08em] text-warn">{children}</span>;
export const ageText = (ts: number, now = Date.now()) => { const m = Math.round((now - ts) / 6e4); if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); if (h < 48) return `${h} h ago`; return `${Math.round(h / 24)} days ago`; };
export const Freshness = ({ ts, staleH = 36 }: { ts?: number; staleH?: number }) => { if (!ts) return <span className="text-xs text-mute">no data</span>; const stale = Date.now() - ts > staleH * 36e5; return <time dateTime={new Date(ts).toISOString()} title={new Date(ts).toLocaleString()} className={`text-xs ${stale ? 'font-semibold text-warn' : 'text-mute'}`}>{stale ? 'Out of date · ' : ''}{ageText(ts)}</time>; };
export const Card = ({ children, className = '', title, right, id }: { children: React.ReactNode; className?: string; title?: string; right?: React.ReactNode; id?: string }) => (
  <section id={id} className={`a-card rounded-2xl border border-line bg-card/85 p-4 shadow-panel backdrop-blur-sm md:p-5 ${className}`}>
    {title && <div className="mb-4 flex items-center justify-between gap-2"><h2 className="panel-title">{title}</h2>{right}</div>}{children}
  </section>
);
export const PageHead = ({ title, sub, right, crumb }: { title: string; sub?: string; right?: React.ReactNode; crumb?: string }) => {
  useEffect(() => { document.title = `${title} · AETHRA`; }, [title]);
  return (
  <header className="a-page-head mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-6">
    <div>{crumb && <div className="eyebrow mb-2 flex items-center gap-2"><span className="h-px w-6 bg-cyan" aria-hidden />{crumb}</div>}<h1 className="text-2xl font-semibold tracking-tight md:text-[2rem] md:leading-tight">{title}</h1>{sub && <p className="mt-1.5 max-w-3xl text-sm text-mute">{sub}</p>}</div>{right}
  </header>
  );
};
export function Btn({ variant = 'default', className = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'danger' | 'ghost' }) {
  const v = { default: 'border-line bg-bg2 text-tx hover:border-cyan/70 hover:bg-navy2', primary: 'a-btn-primary border-cyan bg-cyan text-onaccent hover:shadow-glow hover:brightness-110 font-semibold', danger: 'border-crit bg-crit text-onaccent hover:shadow-alert hover:brightness-110 font-semibold', ghost: 'border-transparent hover:bg-bg2' }[variant];
  return <button type="button" {...p} className={`a-btn inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`} />;
}
export function Stat({ label, value, unit, sub, tone = 'ok' }: { label: string; value: React.ReactNode; unit?: string; sub?: React.ReactNode; tone?: 'ok' | 'warn' | 'crit' | 'none' }) {
  const t = { ok: 'text-tx', warn: 'text-warn', crit: 'text-crit', none: 'text-mute' }[tone];
  return <div className="a-stat rounded-xl border border-line bg-bg2/70 p-3.5"><div className="eyebrow !text-[10.5px]">{label}</div><div className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${t}`}>{value}<span className="ml-1 text-sm font-normal text-mute">{unit}</span></div>{sub && <div className="mt-1 text-xs text-mute">{sub}</div>}</div>;
}
export const Field = ({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) => (
  <label className="block text-sm"><span className="mb-1.5 block text-[13px] font-medium text-tx/90">{label}</span>{children}{hint && !error && <span className="mt-1 block text-xs text-mute">{hint}</span>}{error && <span role="alert" className="mt-1 block text-xs font-medium text-crit">{error}</span>}</label>
);
export const inputCls = 'a-input min-h-[44px] w-full rounded-xl border border-line bg-bg2 px-3 py-2 text-tx placeholder:text-mute/70 transition-colors hover:border-mute/50 focus:border-cyan disabled:cursor-not-allowed disabled:opacity-60';
export const Disclaimer = () => <p className="mt-8 rounded-xl border border-dashed border-line bg-bg2/50 p-3.5 text-xs text-mute"><b className="font-mono tracking-wide text-tx/80">RESEARCH PROTOTYPE.</b> AETHRA is not a certified medical device, is not endorsed by NASA or any space agency, does not diagnose, and does not replace a flight surgeon or medical professional. General adult screening references, prototype heuristics and source-supplied NASA OSD laboratory intervals are not mission-approved flight-medicine thresholds. Demo data is simulated.</p>;
export const Bullets = ({ items }: { items: string[] }) => <ul className="space-y-1.5 text-sm">{items.map((i, k) => <li key={k} className="flex gap-2"><Circle size={6} className="mt-2 shrink-0 fill-cyan text-cyan opacity-80" aria-hidden /><span>{i}</span></li>)}</ul>;
export const Callout = ({ tone = 'info', children, title }: { tone?: 'info' | 'warn' | 'crit' | 'ok'; children: React.ReactNode; title?: string }) => {
  const c = { info: 'border-cyan/35 bg-cyan/5', warn: 'border-warn/50 bg-warn/10', crit: 'border-crit/50 bg-crit/10', ok: 'border-teal/40 bg-teal/10' }[tone];
  return <div role={tone === 'crit' ? 'alert' : undefined} className={`a-callout flex gap-3 rounded-xl border p-3.5 text-sm ${c}`}><Info size={18} className="mt-0.5 shrink-0 text-mute" aria-hidden /><div>{title && <div className="font-semibold">{title}</div>}{children}</div></div>;
};
export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line bg-card/60 p-8 text-center"><h2 className="text-lg font-semibold">{title}</h2><p className="mx-auto mt-1 max-w-md text-sm text-mute">{children}</p>{action && <div className="mt-4">{action}</div>}</div>;
}
export const NoData = () => <EmptyState title="No mission loaded" action={<Link href="/" className="inline-flex min-h-[44px] items-center rounded-xl bg-cyan px-4 text-sm font-semibold text-onaccent hover:shadow-glow">Go to Mission Overview</Link>}>Load the simulated demo mission or create an astronaut profile to use this page.</EmptyState>;
export function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger, onConfirm, onCancel }: { open: boolean; title: string; children: React.ReactNode; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && onCancel(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open, onCancel]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onCancel} /><div role="alertdialog" aria-modal="true" aria-labelledby="cd-t" className="relative w-full max-w-md rounded-2xl border border-line bg-card p-5 shadow-panel"><h2 id="cd-t" className="text-lg font-semibold">{title}</h2><div className="mt-2 text-sm text-mute">{children}</div><div className="mt-4 flex justify-end gap-2"><Btn autoFocus onClick={onCancel}>Cancel</Btn><Btn variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Btn></div></div></div>;
}
export const Timeline = ({ items }: { items: { at: number; text: string; tone?: 'ok' | 'warn' | 'crit' }[] }) => (
  <ol className="space-y-3 border-l border-line pl-5">{items.map((i, k) => <li key={k} className="relative text-sm"><span className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-card ${i.tone === 'crit' ? 'bg-crit' : i.tone === 'warn' ? 'bg-warn' : 'bg-cyan'}`} aria-hidden /><time className="block font-mono text-[11px] text-mute">{new Date(i.at).toLocaleString()}</time>{i.text}</li>)}</ol>
);
