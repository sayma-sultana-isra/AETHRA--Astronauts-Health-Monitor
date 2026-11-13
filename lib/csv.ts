/** RFC 4180 escaping, plus neutralising spreadsheet formula injection for text cells. */
export function csvCell(v: unknown): string {
  if (v === undefined || v === null) return '';
  let s = typeof v === 'number' || typeof v === 'boolean' ? String(v) : String(v);
  if (typeof v === 'string' && /^[=+@\t\r]/.test(s) || (typeof v === 'string' && /^-(?![\d.])/.test(s))) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
export function parseCsv(text: string): string[][] { // minimal RFC4180 parser, used by tests to verify round-trips
  const out: string[][] = []; let row: string[] = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) { const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\r') { /* skip */ } else if (c === '\n') { row.push(cur); out.push(row); row = []; cur = ''; } else cur += c; }
  if (cur || row.length) { row.push(cur); out.push(row); } return out;
}
