/** Tiny safe wrappers around localStorage (can throw or be empty in private windows). */
export const lsGet = (k: string): string | null => { try { return window.localStorage.getItem(k); } catch { return null; } };
export const lsSet = (k: string, v: string): boolean => { try { window.localStorage.setItem(k, v); return true; } catch { return false; } };
export const shuffle = <T,>(a: T[]): T[] => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
