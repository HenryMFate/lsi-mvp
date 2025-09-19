export type Prompt = { text: string; link?: string; category?: 'civic'|'mutual_aid'|'environment'|'bridging'|'reflection' }

const PROMPT_CACHE_VERSION = 'v3'; // bump when logic changes

function mulberry32(a: number){ return function(){ let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
function seedFrom(date: Date, zip: string){ const d = Number(date.toISOString().slice(0,10).replace(/-/g,'')); const z = Number((zip||'0').replace(/\D/g,''))||0; return d ^ z }
const pick = <T,>(rng:()=>number, arr:T[]) => arr[Math.floor(rng()*arr.length)];

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
    const res = await fetch('/prompts.csv'); if(!res.ok) return [];
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

function keyOf(p: Prompt){ return p.text.toLowerCase().replace(/\s+/g,' ').trim(); }

export async function getDailyPrompts(date: Date, zip: string, count=3, useCsv=true): Promise<Prompt[]> {
  const dateStr = date.toISOString().slice(0,10);
  const zipKey = (zip || '00000');
  const key = `ma_${PROMPT_CACHE_VERSION}_prompts_${dateStr}_${zipKey}`;

  // 1) Try cache
  try {
    const cached = localStorage.getItem(key)
    if (cached) {
      const arr = JSON.parse(cached) as Prompt[]
      if (Array.isArray(arr) && arr.length) return arr.slice(0, count)
    }
  } catch {}

  // 2) Generate with seeded RNG
  const seed = seedFrom(date, zip)
  const rng = mulberry32(seed)
  const out: Prompt[] = []; const seen = new Set<string>();
  const csvPool = useCsv ? await loadCsv() : [];

  // CSV first, no duplicates
  if (csvPool.length){
    const start = Math.floor(rng()*csvPool.length);
    for (let i=0; i<csvPool.length && out.length<count; i++){
      const p = csvPool[(start + i) % csvPool.length];
      const k = keyOf(p);
      if (!seen.has(k)) { seen.add(k); out.push(p); }
    }
  }

  // Fill with templates, guard duplicates
  let guard = 0;
  while (out.length < count && guard < 500){
    const gen = TEMPLATES[Math.floor(rng()*TEMPLATES.length)];
    const p = gen(rng);
    const k = keyOf(p);
    if (!seen.has(k)) { seen.add(k); out.push(p); }
    guard++;
  }

  const finalList = out.slice(0, count);
  // 3) Save cache for the day
  try { localStorage.setItem(key, JSON.stringify(finalList)) } catch {}
  return finalList;
}