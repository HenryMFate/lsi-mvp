export type Action = {
  id: string;
  date: string; // YYYY-MM-DD
  category: 'civic'|'mutual_aid'|'environment'|'bridging'|'reflection';
  description?: string;
  minutes?: number;
  withFriend?: boolean;
};

const KEY = 'ma_actions_v1';

export function loadLocal(): Action[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
export function saveLocal(actions: Action[]) {
  localStorage.setItem(KEY, JSON.stringify(actions));
}
export function todayISO(){ return new Date().toISOString().slice(0,10); }
export function uuid(){ return (crypto as any).randomUUID?.() || Math.random().toString(36).slice(2); }
export function streak(actions: Action[]): number {
  if (!actions.length) return 0; const set = new Set(actions.map(a=>a.date));
  let d = new Date(); let s=0; while (set.has(d.toISOString().slice(0,10))) { s++; d.setDate(d.getDate()-1); } return s;
}