export type Level = { title: string; threshold: number; message: string; badge: string }
export const LEVELS: Level[] = [
  { title: "Community Builder",   threshold: 5,   message: "Great start — every action matters!", badge: "/icon-192.png" },
  { title: "Sheboygan Spark",     threshold: 25,  message: "You’re inspiring others!",           badge: "/icon-192.png" },
  { title: "Neighborhood Leader", threshold: 50,  message: "Amazing dedication!",                 badge: "/icon-192.png" },
  { title: "Community Champion",  threshold: 100, message: "You’re making a real difference!",    badge: "/icon-192.png" },
  { title: "Sheboygan Rockstar",  threshold: 250, message: "Incredible commitment!",              badge: "/icon-192.png" },
  { title: "Legend of Lakeshore", threshold: 500, message: "Thank you for your leadership!",      badge: "/icon-192.png" }
];
export function getLevel(count: number){
  let current = LEVELS[0]; for (const l of LEVELS){ if (count >= l.threshold) current = l }
  const next = LEVELS.find(l => l.threshold > current.threshold);
  const toNext = next ? Math.max(0, next.threshold - count) : 0;
  return { current, next, toNext };
}
export function getLevelDetailed(count:number){ return getLevel(count); }
export function streakMessage(stk:number){ if (stk>=14) return "Two-week streak!"; if (stk>=7) return "7-day streak!"; if (stk>=3) return "Nice streak!"; return ""; }
