export type Category = 'civic'|'mutual_aid'|'environment'|'bridging'|'reflection'
export type Prompt = { id?:string; text: string; link?: string; category?: Category; pending?: boolean; org?: boolean }
export type OrgPrompt = { id:number; text:string; priority:'high'|'low'; target_day: string|null }

export const XP_VALUES = { general: 10, org: 20 }

export const LETTER_LINKS = {
  wi_district_finder: 'https://maps.legis.wisconsin.gov/',
  wi_contact_legislators: 'https://legis.wisconsin.gov/',
  us_house_find: 'https://www.house.gov/representatives/find-your-representative',
  us_senate_contact: 'https://www.senate.gov/senators/senators-contact.htm'
}

const PARKS = [
  { name:'Deland Park', link:'https://sheboygan-wi.gov/departments/parks-recreation-forestry/parks/deland-park/' },
  { name:'Vollrath Park', link:'https://sheboygan-wi.gov/departments/parks-recreation-forestry/parks/vollrath-park/' },
  { name:'Evergreen Park', link:'https://sheboygan-wi.gov/departments/parks-recreation-forestry/parks/evergreen-park/' },
  { name:'Maywood', link:'https://gomaywood.org/' },
  { name:'Jaycee Quarry Park', link:'https://sheboygan-wi.gov/departments/parks-recreation-forestry/parks/jaycee-quarry-park/' },
  { name:'Kohler-Andrae State Park', link:'https://dnr.wisconsin.gov/topic/parks/kohlerandrae' }
];

export function generalPrompts(): Prompt[]{
  const items: Prompt[] = []
  items.push({ text: `Pick up 10 pieces of trash at ${PARKS[0].name}`, link:PARKS[0].link, category:'environment' })
  items.push({ text: `Say hello to 10 people in Sheboygan today`, category:'bridging' })
  items.push({ text: 'Write a letter to your state or federal representatives', link: LETTER_LINKS.wi_district_finder, category:'civic' })
  return items
}

export function classifyOrgPromptsForDay(orgs: OrgPrompt[], todayISO: string, leadDays=7){
  const today = new Date(todayISO)
  const start = new Date(today); start.setDate(start.getDate()-leadDays)
  const end = new Date(today);   end.setDate(end.getDate()+leadDays)
  const inWindow: OrgPrompt[] = []
  for (const o of orgs){
    if (!o.target_day){ inWindow.push(o); continue; }
    const td = new Date(o.target_day)
    if (td>=start && td<=end) inWindow.push(o)
  }
  const highs = inWindow.filter(o=>o.priority==='high').map(o=>{
    let pending=false
    if (o.target_day){
      const td = new Date(o.target_day)
      pending = td > today
    }
    return { ...o, pending }
  })
  const lows  = orgs.filter(o=>o.priority==='low' && (!o.target_day))
  return { highs, lows }
}
