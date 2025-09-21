import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { generalPrompts, classifyOrgPromptsForDay, XP_VALUES, type OrgPrompt } from '../lib/prompts'

export default function Home(){
  const [zip, setZip] = useState('53081')
  const [anonId, setAnonId] = useState<string>('')
  const [today, setToday] = useState<string>(new Date().toISOString().slice(0,10))
  const [leadDays, setLeadDays] = useState<number>(7)

  // weekly/community data
  const [weekly, setWeekly] = useState<any>(null)
  const [daily, setDaily] = useState<any>(null)

  // prompts
  const [orgThree, setOrgThree] = useState<any[]>([])
  const [genThree, setGenThree] = useState<any[]>([])

  // open expander
  const [openIdx, setOpenIdx] = useState<number|null>(null)

  // manual log anti-abuse state
  const [ownCooldown, setOwnCooldown] = useState<number>(0)
  const OWN_COOLDOWN_MS = 20000
  const OWN_DAILY_CAP = 3
  const BANNED = ['asdf','test','abc','qwerty','lorem']

  // load anonId
  useEffect(()=>{
    const a = localStorage.getItem('anon_id')
    if (a) setAnonId(a); else { const g='u'+Math.random().toString(36).slice(2,8); localStorage.setItem('anon_id', g); setAnonId(g) }
  }, [])

  // Fetch settings, prompts, and community totals
  useEffect(()=>{
    (async()=>{
      if (!supabase) return;
      // lead days
      const { data: s } = await supabase.from('app_settings').select('*').eq('key','lsi_lead_days').maybeSingle()
      if (s && s.value) setLeadDays(Number(s.value)||7)
      // org prompts
      const { data: orgs } = await supabase.from('org_prompts').select('id,text,priority,target_day')
      const { highs, lows } = classifyOrgPromptsForDay(orgs||[], today, leadDays||7)
      const chosenHighs = highs.slice(0,3)
      const need = Math.max(0, 3-chosenHighs.length)
      const fill = (lows||[]).slice(0, need)
      setOrgThree([...chosenHighs, ...fill])
      // general 3
      setGenThree(generalPrompts())
      // totals
      const { data: d } = await supabase.from('community_totals_daily').select('*').eq('day', today).maybeSingle()
      setDaily(d||null)
      const { data: w } = await supabase.from('community_totals_weekly').select('*').limit(1)
      setWeekly(w && w[0] || null)
    })()
  }, [today, leadDays])

  async function logAction(desc:string, category:string, minutes:number, date:string, withFriend:boolean, org:boolean, source='prompt'){
    if (!supabase){ alert('Not ready'); return; }
    const xp = org ? XP_VALUES.org : XP_VALUES.general
    const body:any = { anon_id: (anonId||'').toLowerCase(), date, category, description:desc, minutes, with_friend: withFriend, xp, source }
    const { error } = await supabase.from('actions').insert(body)
    if (error){ alert(error.message); return; }
    const { data: d } = await supabase.from('community_totals_daily').select('*').eq('day', today).maybeSingle()
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

  function LogYourOwn(){
    const [desc, setDesc] = useState('')
    const [minutes, setMinutes] = useState<number>(10)
    const [date, setDate] = useState<string>(today)
    const [withFriend, setWithFriend] = useState<boolean>(false)
    const [last, setLast] = useState<number>(0)

    async function submit(){
      const now = Date.now()
      if (now - last < OWN_COOLDOWN_MS){ alert('A little fast — try again in a few seconds.'); return; }
      if (desc.trim().length < 15){ alert('Please add more detail so we can count it.'); return; }
      const lower = desc.toLowerCase()
      if (BANNED.some(b=> lower.includes(b))){ alert('Please describe the action clearly (no filler).'); return; }
      // daily-cap check (client-side; enforced server-side too via trigger)
      const { data: cap } = await supabase.rpc('own_actions_today_count', { p_anon: (anonId||'').toLowerCase(), p_day: date })
      if ((cap?.count||0) >= OWN_DAILY_CAP){ alert('Daily limit reached for “Log your own”. Try a prompt!'); return; }
      await logAction(desc, 'reflection', minutes, date, withFriend, false, 'own')
      setLast(now); setDesc('')
    }

    return (
      <div className="card" style={{marginTop:12}}>
        <h3>Log Your Own Action (General · +{XP_VALUES.general} XP)</h3>
        <textarea className="input" rows={3} placeholder="Describe what you did for Sheboygan…" value={desc} onChange={e=>setDesc(e.target.value)} />
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:8, marginTop:8}}>
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
        <button className="btn" style={{marginTop:8}} onClick={submit}>Log it (+{XP_VALUES.general} XP)</button>
        <p className="small" style={{marginTop:6}}>Please keep it real — we’re building trust together. Obvious nonsense may be filtered, and there’s a {OWN_DAILY_CAP}/day limit.</p>
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

      <LogYourOwn/>

      <div style={{position:'sticky', bottom:0, left:0, right:0, background:'#0f172a', color:'#fff', padding:'10px 14px', marginTop:16, borderTopLeftRadius:12, borderTopRightRadius:12}}>
        {weekly ? (
          <div style={{display:'flex', gap:12, alignItems:'center', justifyContent:'space-between'}}>
            <span style={{fontSize:14}}>Together this week: <b>{weekly.actions}</b> actions • <b>{weekly.xp}</b> XP</span>
            <Link href="/achievements" style={{color:'#fff', textDecoration:'underline'}}>My stickers</Link>
          </div>
        ) : <span style={{fontSize:14}}>Loading community totals…</span>}
      </div>
    </div>
  )
}
