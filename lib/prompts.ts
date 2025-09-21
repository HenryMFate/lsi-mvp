export type Prompt = { text: string; link?: string; category?: 'civic'|'mutual_aid'|'environment'|'bridging'|'reflection'|'general' }

export const XP_VALUES = {
  org: 25,
  general: 10
};

// Simple seeded RNG to avoid repeats within a day
function mulberry32(a: number){ return function(){ let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
function seedFrom(dateISO: string){ return Number(dateISO.replace(/-/g,'')) }

const CONTACT = {
  wi_leg: 'https://legis.wisconsin.gov/',
  us_senate: 'https://www.senate.gov/senators/senators-contact.htm',
  us_house_find: 'https://www.house.gov/representatives/find-your-representative'
};

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
  { name:'Good Shepherd Lutheran Pantry', link:'https://goodshepherdsheboygan.org/' }
];

const COFFEE = ['coffee','tea','donuts','snacks'];

const BASE: Prompt[] = [
  { text:'Say hello to 10 people in Sheboygan today', category:'bridging' },
  { text:`Invite someone with different politics to ${COFFEE[0]} — just listen`, category:'bridging' },
  { text:'Pick up 10 pieces of trash at Deland Park', link:PARKS[0].link, category:'environment' },
  { text:'Drop off 2 cans at Sheboygan County Food Bank', link:PANTRIES[0].link, category:'mutual_aid' },
  { text:'Take a 10-minute gratitude walk at Evergreen Park', link:PARKS[2].link, category:'reflection' },
  { text:'Write a respectful letter to your STATE representative about a local issue', link:CONTACT.wi_leg, category:'civic' },
  { text:'Write a respectful letter to your FEDERAL representative/senators about a Sheboygan concern', link:CONTACT.us_house_find, category:'civic' },
  { text:'Help a neighbor check voter registration', category:'civic', link:'https://myvote.wi.gov/' },
  { text:'Thank a police officer, firefighter, or EMT for their service', category:'bridging' },
];

export function generalPrompts(count=3): Prompt[]{
  const today = new Date().toISOString().slice(0,10)
  const rng = mulberry32(seedFrom(today));
  const idxs = new Set<number>();
  const out: Prompt[] = [];
  while (out.length < count && idxs.size < BASE.length){
    const i = Math.floor(rng()*BASE.length);
    if (!idxs.has(i)){
      idxs.add(i);
      out.push(BASE[i]);
    }
  }
  return out;
}
