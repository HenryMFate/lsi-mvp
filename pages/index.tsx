import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { Action, loadLocal, saveLocal, streak, todayISO, uuid } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { getDailyPrompts, Prompt } from '../lib/prompts'
import { getLevelDetailed, streakMessage } from '../lib/encouragement'

const InstallButton = dynamic(()=> import('../components/InstallButton'), { ssr:false })

const TEAM_NAME = 'Lakeshore Indivisible — Sheboygan'

const CATS = [
  { id: 'civic', label: 'Civic' },
  { id: 'mutual_aid', label: 'Mutual Aid' },
  { id: 'environment', label: 'Environment' },
  { id: 'bridging', label: 'Bridging' },
  { id: 'reflection', label: 'Reflection' },
] as const

type CatId = typeof CATS[number]['id']

export default function Home(){
  const [name, setName] = useState('')
  const [zip, setZip] = useState('')
  const [actions, setActions] = useState<Action[]>([])
const today = todayISO();
function alreadyDone(p: Prompt){
  return actions.some(a => a.date === today && (a.description||'').trim().toLowerCase() === p.text.trim().toLowerCase());
}

  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [draft, setDraft] = useState<Action>({ id: '', date: todayISO(), category: 'civic', minutes: 5 })
  const [toast, setToast] = useState<string | null>(null)

  useEffect(()=> { setActions(loadLocal()) }, [])
  useEffect(()=> { saveLocal(actions) }, [actions])

  useEffect(()=>{
    (async()=>{
      const list = await getDailyPrompts(new Date(), zip || '53081', 3);
      setPrompts(list);
    })();
  }, [zip])

  useEffect(()=>{
    (async()=>{
      if (!supabase) return;
      const anonId = getOrSetAnonId();
      const { data } = await supabase.from('actions').select('*').eq('anon_id', anonId).order('date', { ascending: false })
      if (data) setActions(mergeUnique(actions, data.map(rowToAction)))
    })()
  }, [])

  const totals = useMemo(()=>({
    count: actions.length,
    minutes: actions.reduce((n,a)=> n + (a.minutes||0), 0),
    streak: streak(actions)
  }), [actions])

  async function add(){
    const before = getLevelDetailed(actions.length).current.title
    const a: Action = { ...draft, id: uuid() }
    setActions(prev => [a, ...prev])
    setDraft(d => ({ ...d, description: '', minutes: 5 }))
    if (supabase) { await supabase.from('actions').insert(actionToRow(a, zip)) }
    const after = getLevelDetailed(actions.length + 1).current.title
    if (after !== before){ setToast(`Level up: ${after}! 🎉`); setTimeout(()=> setToast(null), 2500) }
    else { setToast('Nice! Logged. ✅'); setTimeout(()=> setToast(null), 1500) }
  }

  async function del(id: string){
    setActions(prev => prev.filter(a=>a.id!==id))
    if (supabase) await supabase.from('actions').delete().eq('id', id).eq('anon_id', getOrSetAnonId())
  }

  function quickFill(p: Prompt){
    const cat = (p.category && (CATS as any).some((c: any)=> c.id===p.category)) ? p.category as CatId : 'civic'
    setDraft(d => ({ ...d, description: p.text, category: cat }))
  }

  const levelInfo = getLevelDetailed(totals.count)
  const prev = levelInfo.current.threshold
  const next = levelInfo.next ? levelInfo.next.threshold : prev
  const span = Math.max(1, next - prev || 1)
  const cur = Math.max(0, Math.min(span, totals.count - prev))
  const pct = Math.round((cur/span)*100)

  return (
    <div className="container">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
        <h1 style={{fontWeight:700}}>Micro‑Actions</h1>
        <div className="brand" title={TEAM_NAME}><span className="brand-dot"/><span>{TEAM_NAME}</span></div>
      </div>

      <div style={{marginTop:8}}><InstallButton /></div>

      <div className="row" style={{marginTop:12}}>
        <div className="card span2">
          <h3>Your Profile</h3>
          <label className="small">Display name (optional)
            <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Anonymous"/>
          </label>
          <label className="small" style={{marginTop:8}}>ZIP (helps local totals)
            <input className="input" value={zip} onChange={e=>setZip(e.target.value)} placeholder="53081"/>
          </label>
          <p className="small">Data stays on your device unless you enable cloud sync later.</p>
        </div>
        <div className="card span2">
          <h3>Your Stats</h3>
          <p><b>{totals.count}</b> actions • <b>{totals.minutes}</b> minutes</p>
          <p>Streak: <b>{totals.streak}</b> days <span className="small" style={{marginLeft:6}}>{streakMessage(totals.streak)}</span></p>
          <div className="level-badge" style={{marginTop:8}}>
            <img className="level-icon" src={levelInfo.current.badge} alt={levelInfo.current.title} />
            <div>
              <div style={{fontWeight:700}}>{levelInfo.current.title}</div>
              <div className="small" style={{color:'#16a34a'}}>{levelInfo.current.message}</div>
            </div>
          </div>
          <div className="progress" style={{marginTop:8}}><span style={{width: pct + '%'}}/></div>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <h3>Today’s Prompts</h3>
        {prompts.length===0 ? <p className="small">Enter a ZIP to see local prompts.</p> : (
          <ul style={{listStyle:'none', padding:0, margin:0}}>
            {prompts.map((p, i)=> (
              <li key={i} style={{padding:'10px 0', borderBottom:'1px solid #e2e8f0'}}>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <div style={{flex:1, opacity: alreadyDone(p) ? 0.5 : 1}}>
                    {p.text} {p.link ? <a className="small" href={p.link} target="_blank" rel="noreferrer">(link)</a> : null}
                    {alreadyDone(p) ? <span className="small" style={{marginLeft:8}}>(logged today)</span> : null}
                  </div>
                  <button className="btn" onClick={()=> quickFill(p)} disabled={alreadyDone(p)} style={{opacity: alreadyDone(p) ? 0.6 : 1, cursor: alreadyDone(p) ? 'not-allowed' : 'pointer'}}>
                    {alreadyDone(p) ? 'Logged' : 'Log this'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="small" style={{marginTop:8}}>Tip: tap “Log this” to prefill the action, then hit Add.</p>
      </div>

      <div className="card" style={{marginTop:12}}>
        <h3>Log a Micro‑Action</h3>
        <div className="row">
          <label className="small">Date
            <input className="input" type="date" value={draft.date} onChange={e=> setDraft(d=> ({...d, date: e.target.value}))}/>
          </label>
          <label className="small">Category
            <select className="input" value={draft.category} onChange={e=> setDraft(d=> ({...d, category: e.target.value as any}))}>
              {CATS.map(c=> <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label className="small span2">What did you do?
            <input className="input" placeholder="Called my alder about agenda item 5" value={draft.description||''} onChange={e=> setDraft(d=> ({...d, description: e.target.value}))}/>
          </label>
          <label className="small">Minutes
            <input className="input" type="number" min={1} value={draft.minutes||1} onChange={e=> setDraft(d=> ({...d, minutes: Number(e.target.value)}))}/>
          </label>
        </div>
        <div style={{display:'flex', gap:8, marginTop:8}}>
          <label className="small" style={{display:'flex', gap:6, alignItems:'center'}}>
            <input type="checkbox" checked={!!draft.withFriend} onChange={e=> setDraft(d=> ({...d, withFriend: e.target.checked}))}/>
            Did this with someone
          </label>
          <button className="btn" onClick={add} style={{marginLeft:'auto'}}>Add</button>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <h3>Your Recent Actions</h3>
        {actions.length===0 ? <p className="small">No actions yet. Log your first one above — it takes 20 seconds.</p> : (
          <ul style={{listStyle:'none', padding:0, margin:0}}>
            {actions.map(a=> (
              <li key={a.id} style={{display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid #e2e8f0'}}>
                <div className="small" style={{width:84, flexShrink:0}}>{a.date}</div>
                <div style={{flex:1}}>
                  <div><b>{label(a.category)}</b> {a.description||'(no description)'}</div>
                  <div className="small">{a.minutes||0} min • {a.withFriend? 'with someone':'solo'}</div>
                </div>
                <button className="small" onClick={()=> del(a.id)} style={{background:'transparent', border:'none', color:'#ef4444'}}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="small" style={{textAlign:'center', marginTop:16}}>Install: open this site on your phone → browser menu → Add to Home Screen.</p>
      <p className="small" style={{textAlign:'center'}}><a href="/scoreboard">Public Scoreboard</a> (anonymous ZIP totals when cloud sync is enabled)</p>

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  )
}

function label(id: string){ return (CATS as any).find((c:any)=>c.id===id)?.label || id }
function getOrSetAnonId(){ const k = 'ma_anon_id'; let v = localStorage.getItem(k); if (!v){ v = crypto.randomUUID(); localStorage.setItem(k, v);} return v; }
type AnyAction = import('../lib/storage').Action;
function actionToRow(a: AnyAction, zip?: string){
  return { id: a.id, anon_id: getOrSetAnonId(), date: a.date, category: a.category, description: a.description||null, minutes: a.minutes||null, with_friend: !!a.withFriend, zip: zip||null };
}
function rowToAction(r: any): AnyAction { return { id: r.id, date: r.date, category: r.category, description: r.description||undefined, minutes: r.minutes||undefined, withFriend: r.with_friend||false } }
function mergeUnique(local: AnyAction[], cloud: AnyAction[]): AnyAction[] { const map = new Map<string, AnyAction>(); [...cloud, ...local].forEach(a=> map.set(a.id, a)); return Array.from(map.values()).sort((a,b)=> (a.date<b.date?1:-1)); }