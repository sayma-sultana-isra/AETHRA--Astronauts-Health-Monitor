import type { Settings } from './types';
/** UI-level visibility policy. NOT authentication or encryption: any browser user can still read local storage. Designed so a server-side RBAC can replace it. */
export type Role = Settings['viewerRole'];
export type Field = 'readiness' | 'status' | 'vitals' | 'history' | 'journal';
export function canView(role: Role, viewerId: string, subjectId: string, field: Field): boolean {
  if (field === 'journal') return viewerId === subjectId; // private journal: owner only, always
  if (viewerId === subjectId) return true;
  if (field === 'readiness') return true;
  if (role === 'medical') return field === 'status' || field === 'vitals' || field === 'history'; // demo: crew medical officer
  return false;
}
