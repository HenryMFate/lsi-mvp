import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'
import { generalPrompts, XP_VALUES } from '../lib/prompts'

function classifyOrgRows(orgs:any[], todayISO:string, defaultLead:number){
  const today = new Date(todayISO+'T00:00:00')
  const highs:any[] = []; const lows:any[] = []
  for (const o of orgs){
    if (o.priority === 'high' && o.target_day){
      const eff = typeof o.lead_days === 'number' ? o.lead_days : defaultLead
      const target = new Date(o.target_day+'T00:00:00')
      const start = new Date(target); start.setDate(start.getDate()-eff)
      if (today < start) { continue }
      if (today < target){ highs.push({ ...o, pending:true }) }
      else if (today.toISOString().slice(0,10) === o.target_day){ highs.push({ ...o, pending:false }) }
    } else {
      lows.push(o)
    }
  }
  return { highs, lows }
}

export default function Home(){
  const sb = getSupabase();
  const [today] = useState<string>(new Date().toISOString().slice(0,10))
  const [leadDays, setLeadDays] = useState<number>(7)
  const [orgThree, setOrgThree] = useState<any[]>([])
  const [genThree, setGenThree] = useState<any[]>([])
  const [openIdx, setOpenIdx] = useState<number|null>(null)
  const [daily, setDaily] = useState<any>(null)
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

      const { data: orgs } = await sb.from('org_prompts').select('id,text,priority,target_day,lead_days')
      const { highs, lows } = classifyOrgRows((orgs||[]) as any[], today, leadDays||7)
      const chosenHighs = highs.slice(0,3)
      const need = Math.max(0, 3-chosenHighs.length)
      const fill = (lows||[]).slice(0, need)
      setOrgThree([...chosenHighs, ...fill])

      setGenThree(generalPrompts())

      const { data: d } = await sb.from('community_totals_daily').select('*').eq('day', today).maybeSingle()
      setDaily(d||null)
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

  function PromptCard({prompt, idx, org}:{prompt:any; idx:number; org:boolean}){
    const pending = !!prompt.pending
    const [minutes, setMinutes] = useState<number>(10)
    const [date, setDate] = useState<string>(today)
    const [withFriend, setWithFriend] = useState<boolean>(false)
    const xp = org ? XP_VALUES.org : XP_VALUES.general

    return (
      <div className="card">
        <div style={{display:'flex', alignItems:'center', gap:8, justifyContent:'space-between'}}>
          <div>
            <div style={{fontWeight:700}}>{prompt.text}</div>
            {prompt.link && <a className="small link" href={prompt.link} target="_blank" rel="noreferrer">Open link</a>}
          </div>
          <div><span className="badge">{(prompt.category || (org ? 'civic' : 'general'))} · +{xp} XP</span></div>
        </div>
        <div style={{marginTop:10}}>
          {!pending ? (
            <button className="btn" onClick={()=> setOpenIdx(openIdx===idx?null:idx)}>
              {openIdx===idx ? 'Hide' : 'Log this'}
            </button>
          ) : (
            <span className="small">Pending until its day</span>
          )}
        </div>
        {openIdx===idx && !pending && (
          <div style={{marginTop:10, borderTop:'1px solid rgba(168,182,217,.25)', paddingTop:10}}>
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

  // Manual "Log Your Own Action"
  function ManualLog(){
    const [desc, setDesc] = useState('')
    const [minutes, setMinutes] = useState<number>(10)
    const [date, setDate] = useState<string>(today)
    const [withFriend, setWithFriend] = useState<boolean>(false)
    async function submit(){
      const body:any = { anon_id:(anonId||'').toLowerCase(), date, category:'reflection', description:desc, minutes, with_friend:withFriend, xp:XP_VALUES.general, source:'own' }
      const { error } = await sb.from('actions').insert(body)
      if (error){ alert(error.message); return; }
      setDesc(''); alert('Logged your own action (+'+XP_VALUES.general+' XP)')
    }
    return (
      <div className="card">
        <h3>Log your own action</h3>
        <div className="grid" style={{gridTemplateColumns:'1fr 140px 140px 140px'}}>
          <input className="input" placeholder="What did you do?" value={desc} onChange={e=>setDesc(e.target.value)} />
          <input className="input" type="number" min={1} max={240} value={minutes} onChange={e=>setMinutes(Number(e.target.value))} />
          <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} />
          <label className="small" style={{display:'flex', alignItems:'center', gap:6}}>
            <input type="checkbox" checked={withFriend} onChange={e=>setWithFriend(e.target.checked)} />
            With others
          </label>
        </div>
        <button className="btn" style={{marginTop:10}} onClick={submit}>Log (+{XP_VALUES.general} XP)</button>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <img src="/icon-192.png" style={{width:36, height:36, borderRadius:8}}/>
        <h1>LSI Micro Actions</h1>
        <div className="spacer" />
        <div className="nav">
          <Link className="btn secondary" href="/help">Help</Link>
          <Link className="btn secondary" href="/achievements">Achievements</Link>
          <Link className="btn" href="/admin">Admin</Link>
        </div>
      </div>

      <div className="card">
        <div className="small">LSI actions: +{XP_VALUES.org} XP • General: +{XP_VALUES.general} XP</div>
      </div>

      <div className="card" style={{display:'flex', alignItems:'center', gap:16}}>
        <div style={{position:'relative', width:64, height:64}}>
          <svg viewBox="0 0 36 36" style={{width:64, height:64}}>
            <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" stroke="#334155" strokeWidth="4"/>
            <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" stroke="url(#g)" strokeWidth="4" strokeDasharray={(4*3.1416*16)} strokeDashoffset={(4*3.1416*16)*(1-((daily?.actions||0)/6))} strokeLinecap="round"/>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#5aa6ff" /><stop offset="100%" stopColor="#6ae6dd" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div>
          <div style={{fontWeight:800}}>Daily Progress</div>
          <div className="small">{(daily?.actions||0)} of 6 actions logged today</div>
        </div>
      </div>

      <h3>LSI Actions (3)</h3>
      {orgThree.length === 0 ? (
        <div className="card"><div className="small">No Lakeshore Indivisible actions at this time.</div></div>
      ) : (
        <div className="row">
          {orgThree.map((p, i)=> <PromptCard key={'o'+i} prompt={p} idx={i} org={true} /> )}
        </div>
      )}

      <h3 style={{marginTop:16}}>General Actions (3)</h3>
      <div className="row">
        {genThree.map((p, i)=> <PromptCard key={'g'+i} prompt={p} idx={100+i} org={false} /> )}
      </div>

      <div style={{marginTop:16}}>
        <ManualLog />
      </div>
    </div>
  )
}
