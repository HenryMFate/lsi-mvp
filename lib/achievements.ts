
export type Achievement = {
  id: string;
  title: string;
  desc: string;
  icon: string;
  condition: (stats: Stats) => boolean;
};

export type Stats = {
  total: number;         // total actions
  todayCount: number;    // actions today
  streak: number;        // consecutive day streak
  installed: boolean;
  bestStreak: number;
};

export const ALL: Achievement[] = [
  { id:'installed', title:'App Onboarded', desc:'Installed & opened the app', icon:'📱', condition: s=> s.installed },
  { id:'first_act', title:'First Step', desc:'Logged your first action', icon:'🪄', condition: s=> s.total >= 1 },
  { id:'six_today', title:'Daily Six', desc:'Logged 6 actions in a day', icon:'🟢', condition: s=> s.todayCount >= 6 },
  { id:'streak7', title:'1-Week Streak', desc:'Logged actions 7 days in a row', icon:'🔥', condition: s=> s.streak >= 7 },
  { id:'streak14', title:'2-Week Streak', desc:'Logged actions 14 days in a row', icon:'⚡', condition: s=> s.streak >= 14 },
  { id:'total50', title:'Community Builder', desc:'50 total actions', icon:'🏗️', condition: s=> s.total >= 50 },
  { id:'total100', title:'Neighborhood Leader', desc:'100 total actions', icon:'🏆', condition: s=> s.total >= 100 }
];

const KEY = 'achievements_v1';
const BEST = 'best_streak_v1';

export function loadAch(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY)||'[]')); } catch { return new Set(); }
}
export function saveAch(s: Set<string>){
  localStorage.setItem(KEY, JSON.stringify(Array.from(s)));
}
export function loadBest(): number {
  try { return Number(localStorage.getItem(BEST)||'0'); } catch { return 0; }
}
export function saveBest(n: number){
  localStorage.setItem(BEST, String(n));
}
