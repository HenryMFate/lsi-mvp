
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

function promptKey(p:any){ return (p.text||'').slice(0,140) }
function loadLoggedForDay(day:string): Set<string>{
  try {
    const raw = JSON.parse(localStorage.getItem('logged_'+day) || '[]');
    const arr = Array.isArray(raw) ? raw.filter((x:any)=>typeof x==='string') : [];
    return new Set<string>(arr);
  } catch (e) {
    return new Set<string>();
  }
}
function saveLoggedForDay(day:string, keys:Set<string>){
  localStorage.setItem('logged_'+day, JSON.stringify(Array.from(keys)))
}

export default function Home(){
  const sb = getSupabase();
  const [today] = useState<string>(new Date().toISOString().slice(0,10))
  const [leadDays] = useState<number>(7)
  const [orgThree, setOrgThree] = useState<any[]>([])
  const [genThree, setGenThree] = useState<any[]>([])
  const [openIdx, setOpenIdx] = useState<number|null>(null)
  const [daily, setDaily] = useState<any>(null)
  const [anonId, setAnonId] = useState<string>('')
  const [recent, setRecent] = useState<any[]>([])
  const [loggedSet, setLoggedSet] = useState<Set<string>>(new Set())

  useEffect(()=>{ setLoggedSet(loadLoggedForDay(today) as Set<string>) }, [today])

  useEffect(()=>{
    const a = localStorage.getItem('anon_id')
    if (a) setAnonId(a)
    else { const g='u'+Math.random().toString(36).slice(2,8); localStorage.setItem('anon_id', g); setAnonId(g) }
  },[])

  useEffect(()=>{
    (async()=>{
      const { data: orgs } = await sb.from('org_prompts').select('id,text,priority,target_day,lead_days')
      const { highs, lows } = classifyOrgRows((orgs||[]) as any[], today, leadDays||7)
      const chosenHighs = highs.slice(0,3)
      const need = Math.max(0, 3-chosenHighs.length)
      const fill = (lows||[]).slice(0, need)
      setOrgThree([...chosenHighs, ...fill])

      setGenThree(generalPrompts())

      const { data: rec } = await sb.from('actions').select('id,date,description,category,xp').eq('anon_id', (anonId||'').toLowerCase()).order('date', {ascending:false}).limit(10)
      setRecent(rec||[] as any[])

      const { data: d } = await sb.from('community_totals_daily').select('*').eq('day', today).maybeSingle()
      setDaily(d||null)
    })()
  }, [today, leadDays, anonId, sb])

  async function logAction(desc:string, category:string, minutes:number, date:string, withFriend:boolean, org:boolean, p?:any){
    const xp = org ? XP_VALUES.org : XP_VALUES.general
    const body:any = { anon_id: (anonId||'').toLowerCase(), date, category, description:desc, minutes, with_friend: withFriend, xp, source:'prompt' }
    const { error } = await sb.from('actions').insert(body)
    if (error){ alert(error.message); return; }
    if (p){ const k = promptKey(p); const next = new Set(loggedSet); next.add(k); setLoggedSet(next); saveLoggedForDay(today, next); }
    const { data: rec } = await sb.from('actions').select('id,date,description,category,xp').eq('anon_id', (anonId||'').toLowerCase()).order('date', {ascending:false}).limit(10)
    setRecent(rec||[] as any[])
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
    const disabled = loggedSet.has(promptKey(prompt))

    return (
      <div className="card" style={{opacity: disabled? .5 : 1}}>
        <div style={{display:'flex', alignItems:'center', gap:8, justifyContent:'space-between'}}>
          <div>
            <div style={{fontWeight:700}}>{prompt.text}</div>
            {prompt.link && <a className="small" style={{color:'#bdefff'}} href={prompt.link} target="_blank" rel="noreferrer">Open link</a>}
          </div>
          <div><span className="badge">{(prompt.category || (org ? 'civic' : 'general'))} · +{xp} XP</span></div>
        </div>
        <div style={{marginTop:10}}>
          {!pending && !disabled ? (
            <button className="btn" onClick={()=> setOpenIdx(openIdx===idx?null:idx)}>
              {openIdx===idx ? 'Hide' : 'Log this'}
            </button>
          ) : (
            <span className="small">{pending ? 'Pending until its day' : 'Logged for today'}</span>
          )}
        </div>
        {openIdx===idx && !pending && !disabled && (
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
            <button className="btn" style={{marginTop:8}} onClick={()=>logAction(prompt.text, prompt.category|| (org?'civic':'reflection'), minutes, date, withFriend, org, prompt)}>
              Log it (+{xp} XP)
            </button>
          </div>
        )}
      </div>
    )
  }

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
        <div className="row">
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
            <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" stroke="#2a3955" strokeWidth="4"/>
            <path d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" fill="none" stroke="url(#g)" strokeWidth="4" strokeDasharray={(4*3.1416*16)} strokeDashoffset={(4*3.1416*16)*(1-((daily?.actions||0)/6))} strokeLinecap="round"/>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a3ff4a" /><stop offset="100%" stopColor="#ffe75a" />
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
      <div className="row">
        {orgThree.map((p, i)=> <PromptCard key={'o'+i} prompt={p} idx={i} org={true} /> )}
      </div>

      <h3 style={{marginTop:16}}>General Actions (3)</h3>
      <div className="row">
        {genThree.map((p, i)=> <PromptCard key={'g'+i} prompt={p} idx={100+i} org={false} /> )}
      </div>

      <h3 style={{marginTop:16}}>Recent actions (last 10)</h3>
      <div className="card">
        {recent.length===0 ? <div className="small">No actions yet today.</div> : (
          <div className="table">
            {recent.map((r:any)=>(
              <div key={r.id} style={{display:'grid', gridTemplateColumns:'1fr 120px 120px 90px 80px', gap:8, alignItems:'center', padding:'8px 0', borderBottom:'1px solid rgba(168,182,217,.08)'}}>
                <div>{r.description}</div>
                <div className="small">{r.date}</div>
                <div className="small">{r.category}</div>
                <div className="small">{r.xp}</div>
                <div><button className="btn secondary" onClick={async()=>{
                  if (!confirm('Delete this action?')) return;
                  const { error } = await sb.from('actions').delete().eq('id', r.id);
                  if (error){ alert(error.message); return; }
                  const next = recent.filter((x:any)=>x.id!==r.id);
                  setRecent(next);
                }}>Delete</button></div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{marginTop:16}}>
        <ManualLog />
      </div>
    </div>
  )
}
