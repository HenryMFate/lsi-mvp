
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'
import { generalPrompts, XP_VALUES } from '../lib/prompts'
import { ALL, loadAch, saveAch, loadBest, saveBest } from '../lib/achievements'

type OrgPrompt = { id:any, text:string, priority:'low'|'high', target_day?:string|null, lead_days?:number|null, link?:string, category?:string }

function classifyOrgRows(orgs:OrgPrompt[], todayISO:string, defaultLead:number){
  const today = new Date(todayISO+'T00:00:00')
  const highs: (OrgPrompt & {pending?:boolean})[] = []; const lows: OrgPrompt[] = []
  for (const o of orgs){
    if (o.priority === 'high' && o.target_day){
      const eff = typeof o.lead_days === 'number' ? o.lead_days! : defaultLead
      const target = new Date(o.target_day+'T00:00:00')
      const start = new Date(target); start.setDate(start.getDate()-eff)
      if (today < start) continue;
      if (today < target) highs.push({ ...o, pending:true })
      else if (today.toISOString().slice(0,10) === o.target_day) highs.push({ ...o, pending:false })
    } else { lows.push(o) }
  }
  return { highs, lows }
}

function promptKey(p:{text:string}){ return (p.text||'').slice(0,140) }
function loadLoggedForDay(day:string): Set<string>{
  try { const raw = JSON.parse(localStorage.getItem('logged_'+day) || '[]'); const arr = Array.isArray(raw) ? raw.filter((x:any)=>typeof x==='string') : []; return new Set<string>(arr); } catch { return new Set<string>(); }
}
function saveLoggedForDay(day:string, keys:Set<string>){ localStorage.setItem('logged_'+day, JSON.stringify(Array.from(keys))) }

function burstConfetti(){
  try {
    const c = document.createElement('canvas'); c.width = window.innerWidth; c.height = 180;
    c.style.position='fixed'; c.style.left='0'; c.style.top='0'; c.style.pointerEvents='none'; c.style.zIndex='9999';
    document.body.appendChild(c);
    const ctx = c.getContext('2d')!; const pieces = Array.from({length:140}, ()=>({x:Math.random()*c.width,y:Math.random()*-40,vy:2+Math.random()*3,w:6,h:10,color:`hsl(${Math.random()*360},90%,60%)`}));
    let t=0; const tick=()=>{ t++; ctx.clearRect(0,0,c.width,c.height); pieces.forEach(p=>{ p.y+=p.vy; ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,p.w,p.h) }); if (t<120) requestAnimationFrame(tick); else document.body.removeChild(c); }; tick();
  } catch {}
}
function computeStreak(days: string[]): number{ const set = new Set(days); let d = new Date(); let s=0; while (set.has(d.toISOString().slice(0,10))){ s++; d.setDate(d.getDate()-1); } return s; }

export default function Home(){
  const sb = getSupabase();
  const [today] = useState<string>(new Date().toISOString().slice(0,10))
  const [leadDays] = useState<number>(7)
  const [orgThree, setOrgThree] = useState<any[]>([])
  const [genThree, setGenThree] = useState<any[]>([])
  const [openIdx, setOpenIdx] = useState<number|null>(null)
  const [daily, setDaily] = useState<any>(null)
  const [totalAll, setTotalAll] = useState<number>(0)
  const [anonId, setAnonId] = useState<string>('')
  const [recent, setRecent] = useState<any[]>([])
  const [loggedSet, setLoggedSet] = useState<Set<string>>(new Set())
  const [ach, setAch] = useState<Set<string>>(new Set())
  const [showChest, setShowChest] = useState(false)

  useEffect(()=>{ setLoggedSet(loadLoggedForDay(today) as Set<string>); setAch(loadAch()) }, [today])

  useEffect(()=>{
    const a = localStorage.getItem('anon_id')
    if (a) setAnonId(a)
    else { const g='u'+Math.random().toString(36).slice(2,8); localStorage.setItem('anon_id', g); setAnonId(g) }
  },[])

  useEffect(()=>{
    (async()=>{
      const { data: orgs } = await sb.from('org_prompts').select('id,text,priority,target_day,lead_days,link,category').order('id', {ascending:false})
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

      const { count } = await sb.from('actions').select('*', { count: 'exact', head: true })
      setTotalAll(count || 0)

      const { data: totals } = await sb.from('actions').select('date').eq('anon_id', (anonId||'').toLowerCase()).order('date', {ascending:false}).limit(400)
      const totalActions = (totals||[]).length
      const days = Array.from(new Set((totals||[]).map((x:any)=>x.date)))
      const todayCount = Math.min((rec||[]).filter((x:any)=>x.date===today).length, 6)
      const streak = computeStreak(days)
      const bestPrev = loadBest()
      if (streak > bestPrev){ saveBest(streak); if (streak % 10 === 0) { alert('New personal best streak: '+streak+' days!'); } }

      let next = new Set(ach)
      const stats = { total: totalActions, todayCount, streak, installed:true, bestStreak: Math.max(bestPrev, streak) }
      for (const a of ALL){ if (!next.has(a.id) && a.condition(stats as any)){ next.add(a.id) } }
      if (!ach.has('six_today') && todayCount>=6){ burstConfetti(); setShowChest(true); }
      if (next.size !== ach.size){ setAch(next); saveAch(next) }
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

  const chest = showChest ? (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9998}} onClick={()=>setShowChest(false)}>
      <div className="card" style={{maxWidth:420, textAlign:'center'}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:40}}>🧰</div>
        <h3>Daily Six complete!</h3>
        <p className="small">Nice work — everything after 6 still grants XP, but the Daily meter is capped at 6.</p>
        <button className="btn" onClick={()=>setShowChest(false)}>Close</button>
      </div>
    </div>
  ) : null;

  const footer = (
    <div style={{position:'fixed', bottom:8, left:8, right:8, zIndex:999, pointerEvents:'none'}}>
      <div className="card" style={{display:'flex', gap:12, justifyContent:'space-between', alignItems:'center', opacity:.92, pointerEvents:'auto', padding:'10px 14px'}}>
        <div style={{fontWeight:700}}><span className="small">Today</span> • {(daily?.actions||0)}</div>
        <div style={{fontWeight:700}}><span className="small">All-time</span> • {Intl.NumberFormat().format(totalAll)}</div>
      </div>
    </div>
  );

  return (
    <>
      <div className="container" style={{paddingBottom:96}}>
        <div className="header">
          <img src="/LSI.png" style={{width:36, height:36, borderRadius:8}}/>
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

        <div className="card" style={{marginTop:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, alignItems:'center'}}>
          <div><div className="small">Today's community actions</div><div style={{fontSize:28, fontWeight:900}}> {(daily?.actions||0)} </div></div>
          <div><div className="small">All-time actions</div><div style={{fontSize:28, fontWeight:900}}> {Intl.NumberFormat().format(totalAll)} </div></div>
        </div>

        <div className="card">
          <div style={{fontWeight:800}}>Daily Progress</div>
          <div className="small">{Math.min((daily?.actions||0),6)} of 6 actions logged today</div>
          <div style={{marginTop:12, display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:6}}>
            {Array.from({length:6}).map((_,i)=>{
              const filled = (daily?.actions||0) > i;
              return <div key={i} style={{height:16, borderRadius:8, background: filled ? '#ffe75a' : '#3a5aa0', border:'1px solid rgba(168,182,217,.35)'}} />;
            })}
          </div>
          <div className="small" style={{marginTop:8, color:'#bdefff'}}>Extra actions still earn XP after 6.</div>
        </div>

        <h3>LSI Actions (3)</h3>
        <div className="row">{orgThree.map((p, i)=> <PromptCard key={'o'+i} prompt={p} idx={i} org={true} /> )}</div>

        <h3 style={{marginTop:16}}>General Actions (3)</h3>
        <div className="row">{genThree.map((p, i)=> <PromptCard key={'g'+i} prompt={p} idx={100+i} org={false} /> )}</div>

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
                    const next = recent.filter((x:any)=>x.id!==r.id); setRecent(next);
                  }}>Delete</button></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{marginTop:16}}><ManualLog /></div>
      </div>
      {footer}
      {chest}
    </>
  )
}
