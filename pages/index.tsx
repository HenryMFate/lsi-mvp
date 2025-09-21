import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'
import { generalPrompts, classifyOrgPromptsForDay, XP_VALUES } from '../lib/prompts'

export default function Home(){
  const sb = getSupabase();
  const [today, setToday] = useState<string>(new Date().toISOString().slice(0,10))
  const [leadDays, setLeadDays] = useState<number>(7)
  const [orgThree, setOrgThree] = useState<any[]>([])
  const [genThree, setGenThree] = useState<any[]>([])
  const [openIdx, setOpenIdx] = useState<number|null>(null)
  const [daily, setDaily] = useState<any>(null)
  const [weekly, setWeekly] = useState<any>(null)
  const [anonId, setAnonId] = useState<string>('')

  useEffect(()=>{
    const a = localStorage.getItem('anon_id')
    if (a) setAnonId(a)
    else { const g='u'+Math.random().toString(36).slice(2,8); localStorage.setItem('anon_id', g); setAnonId(g) }
  },[])

  useEffect(()=>{
    (async()=>{
      const { data: s } = await sb.from('app_settings').select('*').eq('key','lsi_lead_days').maybeSingle()
      if (s?.value) setLeadDays(Number(s.value)||7)
      const { data: orgs } = await sb.from('org_prompts').select('id,text,priority,target_day')
      const { highs, lows } = classifyOrgPromptsForDay((orgs||[]) as any[], today, leadDays||7)
      const chosenHighs = highs.slice(0,3)
      const need = Math.max(0, 3-chosenHighs.length)
      const fill = (lows||[]).slice(0, need)
      setOrgThree([...chosenHighs, ...fill])
      setGenThree(generalPrompts())
      const { data: d } = await sb.from('community_totals_daily').select('*').eq('day', today).maybeSingle()
      setDaily(d||null)
      const { data: w } = await sb.from('community_totals_weekly').select('*').limit(1)
      setWeekly(w && w[0] || null)
    })()
  }, [today, leadDays])

  async function logAction(desc:string, category:string, minutes:number, date:string, withFriend:boolean, org:boolean){
    const xp = org ? XP_VALUES.org : XP_VALUES.general
    const body:any = { anon_id: (anonId||'').toLowerCase(), date, category, description:desc, minutes, with_friend: withFriend, xp, source:'prompt' }
    const { error } = await sb.from('actions').insert(body)
    if (error){ alert(error.message); return; }
    const { data: d } = await sb.from('community_totals_daily').select('*').eq('day', today).maybeSingle()
    setDaily(d||null)
    alert('Nice work! +' + xp + ' XP')
  }

  function PromptRow({prompt, idx, org}:{prompt:any; idx:number; org:boolean}){
    const pending = !!prompt.pending
    const [minutes, setMinutes] = useState<number>(10)
    const [date, setDate] = useState<string>(today)
    const [withFriend, setWithFriend] = useState<boolean>(false)
    const xp = org ? XP_VALUES.org : XP_VALUES.general

    return (
      <div className="card" style={{marginBottom:10}}>
        <div style={{display:'flex', alignItems:'center', gap:8, justifyContent:'space-between'}}>
          <div>
            <div style={{fontWeight:600}}>{prompt.text}</div>
            {prompt.link && <a className="small" href={prompt.link} target="_blank" rel="noreferrer">Open link</a>}
          </div>
          <div><span className="badge">{org ? 'LSI' : 'General'} · +{xp} XP</span></div>
        </div>
        <div style={{marginTop:8}}>
          {!pending ? (
            <button className="btn" onClick={()=> setOpenIdx(openIdx===idx?null:idx)}>
              {openIdx===idx ? 'Hide' : 'Log this'}
            </button>
          ) : (
            <span className="small" style={{color:'#9ca3af'}}>Pending until its day</span>
          )}
        </div>
        {openIdx===idx && !pending && (
          <div style={{marginTop:10, borderTop:'1px solid #e5e7eb', paddingTop:10}}>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:8}}>
              <label className="small">Minutes
                <input className="input" type="number" min={1} max={240} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/>
              </label>
              <label className="small">Date
                <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
              </label>
              <label className="small">With others?
                <input type="checkbox" checked={withFriend} onChange={e=>setWithFriend(e.target.checked)}/>
              </label>
            </div>
            <button className="btn" style={{marginTop:8}} onClick={()=>logAction(prompt.text, prompt.category|| (org?'civic':'reflection'), minutes, date, withFriend, org)}>
              Log it (+{xp} XP)
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container">
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16}}>
        <img src="/icon-192.png" style={{width:40, height:40, borderRadius:8}}/>
        <h1 style={{margin:0}}>LSI Micro Actions</h1>
        <div style={{marginLeft:'auto', display:'flex', gap:8}}>
          <Link className="btn" href="/help">Help</Link>
          <Link className="btn" href="/achievements">Achievements</Link>
          <Link className="btn" href="/admin">Admin</Link>
        </div>
      </div>
      <div className="card" style={{marginBottom:12}}>
        <div className="small">LSI actions: +{XP_VALUES.org} XP • General: +{XP_VALUES.general} XP</div>
      </div>
      <h3>LSI Actions (3)</h3>
      {orgThree.length === 0 ? (
        <div className="card"><div className="small">No Lakeshore Indivisible actions at this time.</div></div>
      ) : (
        orgThree.map((p, i)=> <PromptRow key={'o'+i} prompt={p} idx={i} org={true} /> )
      )}
      <h3 style={{marginTop:16}}>General Actions (3)</h3>
      {genThree.map((p, i)=> <PromptRow key={'g'+i} prompt={p} idx={100+i} org={false} /> )}
    </div>
  )
}
