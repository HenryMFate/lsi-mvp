import { supabase } from './supabase'

export type Prompt = { text: string; link?: string; category?: 'civic'|'mutual_aid'|'environment'|'bridging'|'reflection' }

const PROMPT_CACHE_VERSION = 'v6';

function mulberry32(a: number){ return function(){ let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
function hashString(s: string){ let h=2166136261>>>0; for (let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }
function seedFrom(date: Date, anonId: string){ const d = Number(date.toISOString().slice(0,10).replace(/-/g,'')); const h = hashString(anonId||''); return d ^ h }
const pick = <T,>(rng:()=>number, arr:T[]) => arr[Math.floor(rng()*arr.length)];
function keyOf(p: Prompt){ return p.text.toLowerCase().replace(/\s+/g,' ').trim(); }

const PARKS = [
  { name:'Deland Park', link:'https://sheboygan-wi.gov/departments/parks-recreation-forestry/parks/deland-park/' },
  { name:'Vollrath Park', link:'https://sheboygan-wi.gov/departments/parks-recreation-forestry/parks/vollrath-park/' },
  { name:'Evergreen Park', link:'https://sheboygan-wi.gov/departments/parks-recreation-forestry/parks/evergreen-park/' },
  { name:'Maywood', link:'https://gomaywood.org/' },
  { name:'Jaycee Quarry Park', link:'https://sheboygan-wi.gov/departments/parks-recreation-forestry/parks/jaycee-quarry-park/' },
  { name:'Kohler-Andrae State Park', link:'https://dnr.wisconsin.gov/topic/parks/kohlerandrae' }
];
const PANTRIES = [
  { name:'Sheboygan County Food Bank', link:'https://sheboygancountyfoodbank.com/' },
  { name:'Grace Episcopal Pantry', link:'https://www.gracesheboygan.com/' },
  { name:'St. Luke’s UCC Pantry', link:'https://www.stlukesuccsheboygan.org/' },
  { name:'Good Shepherd Lutheran Pantry', link:'https://goodshepherdsheboygan.org/' },
  { name:'Faith United Pantry', link:'https://www.facebook.com/faithunitedchurchsheboygan/' },
  { name:'St. Dominic’s Pantry', link:'https://www.stdominicparish.com/' }
];
const CIVIC = {
  council: 'https://sheboygan-wi.gov/city-agenda-minutes/',
  county:  'https://www.sheboygancounty.com/government/county-board-meetings',
  school:  'https://www.sheboygan.k12.wi.us/district/school-board',
  notify:  'https://sheboygan-wi.gov/notify-me/',
  vote:    'https://myvote.wi.gov/'
};
const NUMS = [8,10,12,15];
const HELLOS = [8,10,12];
const COFFEE = ['coffee','tea','donuts','snacks'];
const TEMPLATES: ((rng:()=>number)=>Prompt)[] = [
  (r)=>{ const p = pick(r,PARKS); const n = pick(r,NUMS);
    return { text:`Pick up ${n} pieces of trash at ${p.name}`, link:p.link, category:'environment' } },
  (r)=>{ const p = pick(r,PARKS);
    return { text:`Take a 10-minute gratitude walk at ${p.name}`, link:p.link, category:'reflection' } },
  (r)=>{ const p = pick(r,PANTRIES);
    return { text:`Drop off 2 cans at ${p.name}`, link:p.link, category:'mutual_aid' } },
  (r)=>({ text:`Call your Sheboygan alder about one agenda item`, link:CIVIC.council, category:'civic' }),
  (r)=>({ text:`Read today’s City Council agenda and share with a neighbor`, link:CIVIC.council, category:'civic' }),
  (r)=>({ text:`Sign up for City notifications (agendas, alerts)`, link:CIVIC.notify, category:'civic' }),
  (r)=>({ text:`Help a neighbor check voter registration`, link:CIVIC.vote, category:'civic' }),
  (r)=>({ text:`Invite someone with different politics to ${pick(r,COFFEE)} — just listen`, category:'bridging' }),
  (r)=>({ text:`Say hello to ${pick(r,HELLOS)} people in Sheboygan today`, category:'bridging' }),
  (r)=>({ text:`Thank a police officer, firefighter, or EMT for their service`, category:'bridging' }),
  (r)=>({ text:`Spend 5 minutes in prayer or meditation for Sheboygan’s well-being`, category:'reflection' })
];

async function loadCsv(): Promise<Prompt[]> {
  try {
    const res = await fetch('/prompts.csv', { cache: 'no-store' }); if(!res.ok) return [];
    const text = await res.text();
    return text.split(/\r?\n/).slice(1).map(line=>{
      if(!line.trim()) return null;
      const parts = line.split(',');
      const category = (parts[1]||'').trim() as Prompt['category'];
      const action = (parts[2]||'').trim();
      const link = (parts[3]||'').trim();
      if(!action) return null;
      return { text: action, link: link||undefined, category: category||undefined }
    }).filter(Boolean) as Prompt[];
  } catch { return [] }
}

async function fetchOrgPrompts(today: string): Promise<Prompt[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('org_prompts')
    .select('text, link, category, active, start_date, end_date, priority')
    .eq('active', true)
    .order('priority', { ascending: false });
  if (error || !data) return [];
  return (data as any[]).filter(row => {
    const s = row.start_date ? String(row.start_date) : null;
    const e = row.end_date ? String(row.end_date) : null;
    return (!s || s <= today) && (!e || e >= today);
  }).map(row => ({ text: row.text, link: row.link||undefined, category: row.category||undefined }));
}

async function fetchGeneralPrompts(): Promise<Prompt[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('general_prompts')
    .select('text, link, category, weight');
  if (error || !data) return [];
  const arr: Prompt[] = [];
  (data as any[]).forEach(row => {
    const w = Math.max(1, Number(row.weight||1)|0);
    for (let i=0;i<w;i++){ arr.push({ text: row.text, link: row.link||undefined, category: row.category||undefined }) }
  });
  return arr;
}

async function recentTexts(anonId: string, today: string, days=14): Promise<Set<string>> {
  if (!supabase) return new Set();
  const since = new Date(today); since.setDate(since.getDate()-days);
  const { data } = await supabase
    .from('user_daily_prompts')
    .select('prompts, day')
    .gte('day', since.toISOString().slice(0,10))
    .eq('anon_id', anonId);
  const seen = new Set<string>();
  (data||[]).forEach((row: any) => {
    const list: Prompt[] = row.prompts || [];
    list.forEach(p => seen.add(keyOf(p)));
  });
  return seen;
}

export async function getDailyPromptsSplit(date: Date, anonId: string, total=3, useCsv=true): Promise<{ org: Prompt|null, general: Prompt[] }> {
  const today = date.toISOString().slice(0,10);
  const countOrg = 1;
  const countGen = Math.max(0, total - countOrg);

  if (supabase) {
    const { data } = await supabase.from('user_daily_prompts').select('prompts').eq('day', today).eq('anon_id', anonId).maybeSingle();
    if (data && Array.isArray(data.prompts)) {
      const arr = data.prompts as Prompt[];
      const orgPool = await fetchOrgPrompts(today);
      const keySet = new Set(orgPool.map(keyOf));
      const split = { org: null as Prompt|null, general: [] as Prompt[] };
      for (const p of arr) {
        if (!split.org && keySet.has(keyOf(p))) split.org = p; else split.general.push(p);
      }
      if (!split.org && split.general.length) { split.org = split.general.shift() || null; }
      split.general = split.general.slice(0, countGen);
      return split;
    }
  }

  const [orgPool, generalDb] = await Promise.all([fetchOrgPrompts(today), fetchGeneralPrompts()]);
  const csvPool = useCsv ? await loadCsv() : [];
  const generalPool = (generalDb.length ? generalDb : csvPool);

  const rng = mulberry32(seedFrom(date, anonId || 'guest'));
  const used = new Set<string>();
  const recent = await recentTexts(anonId, today, 14);

  function chooseOne(pool: Prompt[]): Prompt|null {
    if (!pool.length) return null;
    const start = Math.floor(rng()*pool.length);
    for (let i=0;i<pool.length;i++) {
      const p = pool[(start+i)%pool.length];
      const k = keyOf(p);
      if (!used.has(k) && !recent.has(k)) { used.add(k); return p; }
    }
    return null;
  }
  function chooseMany(pool: Prompt[], n: number): Prompt[] {
    const out: Prompt[] = [];
    if (!pool.length || n<=0) return out;
    let tries = 0;
    while (out.length < n && tries < pool.length*2) {
      const p = chooseOne(pool);
      if (p) out.push(p);
      else break;
      tries++;
    }
    return out;
  }

  const org = chooseOne(orgPool);
  let general: Prompt[] = chooseMany(generalPool, countGen);

  if (general.length < countGen) {
    let guard=0;
    while (general.length < countGen && guard < 200) {
      const gen = TEMPLATES[Math.floor(rng()*TEMPLATES.length)];
      const p = gen(rng);
      const k = keyOf(p);
      if (!used.has(k) && !recent.has(k)) { used.add(k); general.push(p); }
      guard++;
    }
  }

  let orgFinal: Prompt|null = org;
  if (!orgFinal) {
    if (general.length) {
      orgFinal = general.shift() || null;
      const extra = chooseMany(generalPool, 1);
      if (extra.length) general.push(extra[0]);
    }
  }

  const finalList = [orgFinal, ...general.filter(Boolean)].filter(Boolean) as Prompt[];
  if (supabase && finalList.length) {
    await supabase.from('user_daily_prompts').upsert({ day: today, anon_id: anonId, prompts: finalList }, { onConflict: 'day,anon_id' });
  }
  try {
    const key = `ma_${PROMPT_CACHE_VERSION}_prompts_${today}_${anonId}`;
    localStorage.setItem(key, JSON.stringify(finalList));
  } catch {}

  return { org: orgFinal||null, general: general.slice(0, countGen) };
}
