'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Circle, Download, Eraser, Highlighter, Minus, PaintBucket, Pencil, Redo2, Save, Square, Trash2, Type, Undo2, type LucideIcon } from 'lucide-react';
import { Btn, ConfirmDialog, Field, inputCls } from '@/components/ui';
import { lsGet, lsSet } from './store';

type Tool = 'pen' | 'marker' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'text' | 'fill';
const TOOLS: { id: Tool; label: string; I: LucideIcon }[] = [
  { id: 'pen', label: 'Pen', I: Pencil }, { id: 'marker', label: 'Marker', I: Highlighter }, { id: 'eraser', label: 'Eraser', I: Eraser }, { id: 'fill', label: 'Fill colour', I: PaintBucket },
  { id: 'line', label: 'Line', I: Minus }, { id: 'rect', label: 'Rectangle', I: Square }, { id: 'ellipse', label: 'Circle / oval', I: Circle }, { id: 'text', label: 'Text', I: Type },
];
const COLORS = ['#111827', '#FFFFFF', '#E5484D', '#F76B15', '#F5C518', '#30A46C', '#12A594', '#0091FF', '#3E63DD', '#8E4EC6', '#E93D82', '#8B5E3C'];
const BOARDS = [{ id: 'white', n: 'White board', c: '#FFFFFF' }, { id: 'paper', n: 'Cream paper', c: '#FBF4E4' }, { id: 'night', n: 'Night sky', c: '#0B1226' }];
const TEMPLATES = [{ id: 'blank', n: 'Blank board' }, { id: 'earth', n: 'Colouring page: Planet Earth' }, { id: 'mountain', n: 'Colouring page: Mountains & sun' }, { id: 'tree', n: 'Colouring page: Tree' }];
const W = 1200, H = 700, MAX_HIST = 30, GALLERY = 'aethra-studio-gallery'; const MAX_SAVED = 6;

function outline(ctx: CanvasRenderingContext2D, id: string) {
  ctx.strokeStyle = '#1F2937'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const p = (f: () => void) => { ctx.beginPath(); f(); ctx.stroke(); };
  if (id === 'earth') {
    p(() => ctx.arc(600, 350, 250, 0, Math.PI * 2));
    p(() => { ctx.moveTo(430, 200); ctx.bezierCurveTo(500, 170, 560, 220, 540, 270); ctx.bezierCurveTo(520, 320, 450, 300, 420, 340); ctx.bezierCurveTo(390, 290, 400, 230, 430, 200); });
    p(() => { ctx.moveTo(620, 280); ctx.bezierCurveTo(700, 240, 790, 270, 800, 340); ctx.bezierCurveTo(810, 410, 740, 430, 720, 500); ctx.bezierCurveTo(690, 560, 640, 520, 650, 450); ctx.bezierCurveTo(660, 400, 580, 370, 620, 280); });
    p(() => { ctx.moveTo(470, 440); ctx.bezierCurveTo(520, 420, 560, 470, 540, 520); ctx.bezierCurveTo(500, 560, 450, 520, 470, 440); });
    p(() => { ctx.moveTo(100, 90); ctx.lineTo(112, 120); ctx.lineTo(144, 124); ctx.lineTo(120, 146); ctx.lineTo(128, 178); ctx.lineTo(100, 160); ctx.lineTo(72, 178); ctx.lineTo(80, 146); ctx.lineTo(56, 124); ctx.lineTo(88, 120); ctx.closePath(); });
    p(() => ctx.arc(1060, 120, 34, 0, Math.PI * 2));
  } else if (id === 'mountain') {
    p(() => ctx.arc(930, 150, 70, 0, Math.PI * 2));
    p(() => { ctx.moveTo(60, 600); ctx.lineTo(330, 230); ctx.lineTo(470, 420); ctx.lineTo(560, 330); ctx.lineTo(820, 600); ctx.closePath(); });
    p(() => { ctx.moveTo(500, 600); ctx.lineTo(760, 300); ctx.lineTo(1100, 600); ctx.closePath(); });
    p(() => { ctx.moveTo(330, 230); ctx.lineTo(290, 290); ctx.lineTo(330, 280); ctx.lineTo(370, 300); ctx.lineTo(330, 230); });
    p(() => { ctx.moveTo(40, 630); ctx.lineTo(1160, 630); });
    p(() => { ctx.moveTo(150, 90); ctx.bezierCurveTo(130, 90, 120, 120, 150, 125); ctx.lineTo(260, 125); ctx.bezierCurveTo(300, 125, 300, 85, 262, 85); ctx.bezierCurveTo(255, 55, 205, 55, 195, 88); ctx.bezierCurveTo(180, 75, 160, 80, 150, 90); });
  } else if (id === 'tree') {
    p(() => { ctx.moveTo(555, 640); ctx.lineTo(575, 400); ctx.lineTo(625, 400); ctx.lineTo(645, 640); ctx.closePath(); });
    p(() => { ctx.moveTo(600, 110); ctx.bezierCurveTo(700, 40, 840, 120, 800, 230); ctx.bezierCurveTo(900, 280, 840, 420, 740, 400); ctx.bezierCurveTo(700, 450, 500, 450, 460, 400); ctx.bezierCurveTo(360, 420, 300, 280, 400, 230); ctx.bezierCurveTo(360, 120, 500, 40, 600, 110); });
    p(() => { ctx.moveTo(100, 640); ctx.lineTo(1100, 640); });
    p(() => ctx.arc(1030, 110, 50, 0, Math.PI * 2));
    p(() => { ctx.moveTo(200, 640); ctx.bezierCurveTo(190, 590, 210, 570, 200, 540); ctx.moveTo(200, 600); ctx.bezierCurveTo(225, 580, 235, 565, 238, 550); });
  }
}
const hex = (h: string): [number, number, number] => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
function floodFill(ctx: CanvasRenderingContext2D, sx: number, sy: number, color: string) {
  const img = ctx.getImageData(0, 0, W, H); const d = img.data; const [fr, fg, fb] = hex(color); const x0 = Math.floor(sx), y0 = Math.floor(sy);
  if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return false; const o = (y0 * W + x0) * 4; const tr = d[o], tg = d[o + 1], tb = d[o + 2];
  if (Math.abs(tr - fr) + Math.abs(tg - fg) + Math.abs(tb - fb) < 8) return false;
  const seen = new Uint8Array(W * H); const stack = [y0 * W + x0]; const TOL = 120;
  while (stack.length) {
    const i = stack.pop()!; if (seen[i]) continue; seen[i] = 1; const q = i * 4;
    if (Math.abs(d[q] - tr) + Math.abs(d[q + 1] - tg) + Math.abs(d[q + 2] - tb) > TOL) continue;
    d[q] = fr; d[q + 1] = fg; d[q + 2] = fb; d[q + 3] = 255; const x = i % W;
    if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1); if (i >= W) stack.push(i - W); if (i < W * (H - 1)) stack.push(i + W);
  }
  ctx.putImageData(img, 0, 0); return true;
}
type Saved = { id: string; ts: number; url: string };

export default function Studio() {
  const cv = useRef<HTMLCanvasElement>(null); const hist = useRef<ImageData[]>([]); const redo = useRef<ImageData[]>([]); const bg = useRef('#FFFFFF');
  const stroke = useRef<{ pts: { x: number; y: number }[]; snap: ImageData } | null>(null);
  const [tool, setTool] = useState<Tool>('pen'); const [color, setColor] = useState(COLORS[0]); const [size, setSize] = useState(6); const [board, setBoard] = useState('white'); const [tpl, setTpl] = useState('blank');
  const [, bump] = useState(0); const [confirm, setConfirm] = useState<null | 'new' | 'clear'>(null); const [txt, setTxt] = useState<null | { x: number; y: number; l: number; t: number }>(null); const [saved, setSaved] = useState<Saved[]>([]); const [msg, setMsg] = useState('');
  const ctxOf = () => cv.current!.getContext('2d', { willReadFrequently: true })!;
  const snap = useCallback(() => { const c = ctxOf(); hist.current.push(c.getImageData(0, 0, W, H)); if (hist.current.length > MAX_HIST) hist.current.shift(); redo.current = []; bump((n) => n + 1); }, []);
  const fresh = useCallback((boardId: string, tplId: string) => {
    const c = ctxOf(); bg.current = BOARDS.find((b) => b.id === boardId)!.c; c.fillStyle = bg.current; c.fillRect(0, 0, W, H);
    if (tplId !== 'blank') { c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, W, H); bg.current = '#FFFFFF'; outline(c, tplId); }
    hist.current = []; redo.current = []; snap(); setTxt(null);
  }, [snap]);
  useEffect(() => { fresh('white', 'blank'); const s = lsGet(GALLERY); if (s) { try { const a = JSON.parse(s); if (Array.isArray(a)) setSaved(a); } catch { /* ignore bad data */ } } }, [fresh]);
  const put = (img: ImageData) => ctxOf().putImageData(img, 0, 0);
  const undo = useCallback(() => { if (hist.current.length < 2) return; redo.current.push(hist.current.pop()!); put(hist.current[hist.current.length - 1]); bump((n) => n + 1); }, []);
  const redoIt = useCallback(() => { const n = redo.current.pop(); if (!n) return; hist.current.push(n); put(n); bump((x) => x + 1); }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return; if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redoIt() : undo(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redoIt(); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [undo, redoIt]);
  const pos = (e: React.PointerEvent) => { const r = cv.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
  function draw(c: CanvasRenderingContext2D, pts: { x: number; y: number }[], t: Tool) {
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = t === 'eraser' ? bg.current : color; c.fillStyle = c.strokeStyle; c.lineWidth = t === 'eraser' ? size * 3 : t === 'marker' ? size * 2.5 : size; c.globalAlpha = t === 'marker' ? 0.4 : 1;
    const a = pts[0], b = pts[pts.length - 1]; c.beginPath();
    if (t === 'line') { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
    else if (t === 'rect') c.rect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    else if (t === 'ellipse') c.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.max(1, Math.abs(b.x - a.x) / 2), Math.max(1, Math.abs(b.y - a.y) / 2), 0, 0, Math.PI * 2);
    else if (pts.length === 1) { c.arc(a.x, a.y, c.lineWidth / 2, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; return; }
    else { c.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length - 1; i++) { const m = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 }; c.quadraticCurveTo(pts[i].x, pts[i].y, m.x, m.y); } c.lineTo(b.x, b.y); }
    c.stroke(); c.globalAlpha = 1;
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (e.button !== 0 && e.pointerType === 'mouse') return; const p = pos(e); const c = ctxOf();
    if (tool === 'fill') { if (floodFill(c, p.x, p.y, color)) snap(); return; }
    if (tool === 'text') { const r = cv.current!.getBoundingClientRect(); setTxt({ x: p.x, y: p.y, l: e.clientX - r.left, t: e.clientY - r.top }); return; }
    e.currentTarget.setPointerCapture(e.pointerId); stroke.current = { pts: [p], snap: c.getImageData(0, 0, W, H) }; draw(c, [p], tool);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    const s = stroke.current; if (!s) return; const p = pos(e); s.pts.push(p); const c = ctxOf(); c.putImageData(s.snap, 0, 0); draw(c, s.pts, tool);
  }
  function up() { if (!stroke.current) return; stroke.current = null; snap(); }
  function commitText(value: string) {
    if (txt && value.trim()) { const c = ctxOf(); const fs = 18 + size * 3; c.font = `${fs}px ui-sans-serif, system-ui, sans-serif`; c.fillStyle = color; c.textBaseline = 'top'; value.split('\n').forEach((l, i) => c.fillText(l, txt.x, txt.y + i * fs * 1.2)); snap(); }
    setTxt(null);
  }
  const dirty = hist.current.length > 1;
  const download = () => { cv.current!.toBlob((b) => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `aethra-drawing-${new Date().toISOString().slice(0, 10)}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/png'); };
  function save() {
    const url = cv.current!.toDataURL('image/jpeg', 0.72); const next = [{ id: Math.random().toString(36).slice(2, 9), ts: Date.now(), url }, ...saved].slice(0, MAX_SAVED);
    if (lsSet(GALLERY, JSON.stringify(next))) { setSaved(next); setMsg(`Saved to this device (latest ${MAX_SAVED} kept).`); } else setMsg('Could not save — device storage is full or blocked. Use Download instead.');
  }
  function load(s: Saved) { const img = new Image(); img.onload = () => { const c = ctxOf(); c.drawImage(img, 0, 0, W, H); snap(); }; img.src = s.url; }
  const rm = (id: string) => { const n = saved.filter((s) => s.id !== id); setSaved(n); lsSet(GALLERY, JSON.stringify(n)); };
  const tb = (active: boolean) => `flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border px-2.5 text-sm transition-colors ${active ? 'border-cyan bg-cyan/15 text-cyan shadow-glow' : 'border-line bg-bg2 hover:border-cyan/60'}`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Drawing tools">
        {TOOLS.map(({ id, label, I }) => <button key={id} onClick={() => setTool(id)} aria-pressed={tool === id} aria-label={label} title={label} className={tb(tool === id)}><I size={18} aria-hidden /></button>)}
        <span className="mx-1 h-7 w-px bg-line" aria-hidden />
        <button onClick={undo} disabled={hist.current.length < 2} aria-label="Undo" title="Undo (Ctrl+Z)" className={`${tb(false)} disabled:opacity-40`}><Undo2 size={18} aria-hidden /></button>
        <button onClick={redoIt} disabled={!redo.current.length} aria-label="Redo" title="Redo (Ctrl+Y)" className={`${tb(false)} disabled:opacity-40`}><Redo2 size={18} aria-hidden /></button>
        <button onClick={() => setConfirm('clear')} aria-label="Clear board" title="Clear board" className={tb(false)}><Trash2 size={18} aria-hidden /></button>
        <span className="ml-auto flex gap-2"><Btn onClick={save}><Save size={16} aria-hidden />Save</Btn><Btn variant="primary" onClick={download}><Download size={16} aria-hidden />Download PNG</Btn></span>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Colour">{COLORS.map((c) => <button key={c} onClick={() => setColor(c)} aria-label={`Colour ${c}`} aria-pressed={color === c} style={{ background: c }} className={`h-8 w-8 rounded-full border-2 transition-transform ${color === c ? 'scale-110 border-cyan shadow-glow' : 'border-line hover:scale-105'}`} />)}
          <label className="ml-1 flex items-center gap-2 text-xs text-mute"><span className="sr-only">Custom colour</span><input type="color" value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} className="h-8 w-10 cursor-pointer rounded-lg border border-line bg-bg2 p-0.5" />Custom</label></div>
        <label className="flex min-w-[200px] items-center gap-3 text-xs text-mute"><span>Size {size}</span><input type="range" min={1} max={40} value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Brush size" className="h-8 flex-1" /></label>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-line shadow-panel">
        <canvas ref={cv} width={W} height={H} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Drawing canvas. Draw with a mouse, finger or stylus." role="img"
          className={`block h-auto w-full select-none ${tool === 'text' ? 'cursor-text' : tool === 'fill' ? 'cursor-cell' : 'cursor-crosshair'}`} style={{ touchAction: 'none', aspectRatio: `${W} / ${H}` }} />
        {txt && <textarea autoFocus rows={1} aria-label="Type text, press Enter to place it (Shift+Enter for a new line)" placeholder="Type…" style={{ left: txt.l, top: txt.t, color }} className="absolute min-w-[140px] resize rounded border border-dashed border-cyan bg-black/30 px-1 text-base outline-none backdrop-blur-sm"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(e.currentTarget.value); } else if (e.key === 'Escape') setTxt(null); }} onBlur={(e) => commitText(e.currentTarget.value)} />}
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <Field label="Board"><select className={inputCls} value={board} onChange={(e) => setBoard(e.target.value)}>{BOARDS.map((b) => <option key={b.id} value={b.id}>{b.n}</option>)}</select></Field>
        <Field label="Start from" hint="Colouring pages are outlines you can fill with the bucket tool."><select className={inputCls} value={tpl} onChange={(e) => setTpl(e.target.value)}>{TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.n}</option>)}</select></Field>
        <Btn onClick={() => (dirty ? setConfirm('new') : fresh(board, tpl))}>Start new board</Btn>
      </div>
      {msg && <p role="status" className="text-sm text-mute">{msg}</p>}
      {saved.length > 0 && <div><h3 className="eyebrow mb-2">Saved on this device</h3><ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{saved.map((s) => <li key={s.id} className="overflow-hidden rounded-xl border border-line bg-bg2">
        <button onClick={() => load(s)} className="block w-full" aria-label={`Open drawing from ${new Date(s.ts).toLocaleString()}`}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={s.url} alt="" className="aspect-[12/7] w-full object-cover" /></button>
        <div className="flex items-center justify-between px-2 py-1 text-[11px] text-mute"><span>{new Date(s.ts).toLocaleDateString()}</span><button onClick={() => rm(s.id)} className="min-h-[28px] text-crit underline">Delete</button></div></li>)}</ul></div>}
      <ConfirmDialog open={confirm === 'clear'} danger title="Clear the board?" confirmLabel="Clear" onCancel={() => setConfirm(null)} onConfirm={() => { const c = ctxOf(); c.fillStyle = bg.current; c.fillRect(0, 0, W, H); snap(); setConfirm(null); }}>Everything on the board is erased. You can still undo it.</ConfirmDialog>
      <ConfirmDialog open={confirm === 'new'} danger title="Start a new board?" confirmLabel="Start new" onCancel={() => setConfirm(null)} onConfirm={() => { fresh(board, tpl); setConfirm(null); }}>Your current drawing will be replaced. Save or download it first if you want to keep it.</ConfirmDialog>
    </div>
  );
}
