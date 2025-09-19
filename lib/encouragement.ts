export type Level = { title: string; threshold: number; message: string; badge: string }

export const LEVELS: Level[] = [
  { title: "Community Builder",   threshold: 5,   message: "Great start — every action matters!",           badge: "/badges/builder.png" },
  { title: "Sheboygan Spark",     threshold: 25,  message: "You’re inspiring others!",                      badge: "/badges/spark.png" },
  { title: "Neighborhood Leader", threshold: 50,  message: "Amazing dedication!",                            badge: "/badges/leader.png" },
  { title: "Community Champion",  threshold: 100, message: "You’re making a real difference!",               badge: "/badges/champion.png" },
  { title: "Sheboygan Rockstar",  threshold: 250, message: "Incredible commitment!",                         badge: "/badges/rockstar.png" },
  { title: "Legend of Lakeshore", threshold: 500, message: "Thank you for your leadership!",                  badge: "/badges/legend.png" }
];

export function getLevelDetailed(count: number){
  let current = LEVELS[0];
  for (const lvl of LEVELS){ if (count >= lvl.threshold) current = lvl }
  const next = LEVELS.find(lvl => lvl.threshold > current.threshold);
  const toNext = next ? Math.max(0, next.threshold - count) : 0;
  return { current, next, toNext };
}
export function streakMessage(stk: number){
  if (stk >= 14) return "Two-week streak! You’re building civic muscle.";
  if (stk >= 7)  return "7-day streak — consistency beats intensity!";
  if (stk >= 3)  return "Nice streak — keep it going!";
  return "";
}