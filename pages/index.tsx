import dynamic from 'next/dynamic'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Action, loadLocal, saveLocal, streak, todayISO, uuid } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { getDailyPromptsSplit, Prompt } from '../lib/prompts'
import { getLevelDetailed, streakMessage } from '../lib/encouragement'

const InstallButton = dynamic(()=> import('../components/InstallButton'), { ssr:false })
const GEN_COUNT = parseInt(process.env.NEXT_PUBLIC_GEN_COUNT || '3', 10)
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
  const [orgPrompt, setOrgPrompt] = useState<Prompt | null>(null)
  const [genPrompts, setGenPrompts] = useState<Prompt[]>([])
  const [draft, setDraft] = useState<Action>({ id: '', date: todayISO(), category: 'civic', minutes: 5 })
  const [toast, setToast] = useState<string | null>(null)
  const [celebrateOpen, setCelebrateOpen] = useState(false)
  const [streakAwardOpen, setStreakAwardOpen] = useState(false)
  const [streakAwardText, setStreakAwardText] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(()=> { setActions(loadLocal()) }, [])
  useEffect(()=> { saveLocal(actions) }, [actions])

  useEffect(()=>{
    (async()=>{
      const split = await getDailyPromptsSplit(new Date(), getOrSetAnonId(), 1 + Math.max(2, Math.min(3, GEN_COUNT)));
      setOrgPrompt(split.org); setGenPrompts(split.general);
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

  // Personal Best Streak awards
  useEffect(()=>{
    const bestKey = 'ma_best_streak';
    const lastAwardKey = 'ma_last_best_award_value';
    const prevBest = Number(localStorage.getItem(bestKey) || '0');
    const lastAwardVal = Number(localStorage.getItem(lastAwardKey) || '0');
    const s = totals.streak;

    if (s > prevBest){
      // Celebrate the first beat; after that, only at multiples of 10
      const shouldCelebrate = (prevBest === 0) || (s % 10 === 0 && s !== lastAwardVal);
      localStorage.setItem(bestKey, String(s));
      if (shouldCelebrate){
        localStorage.setItem(lastAwardKey, String(s));
        const label = (s % 50 === 0) ? 'Legendary Streak' : (s % 20 === 0) ? 'Epic Streak' : (s % 10 === 0) ? 'Milestone Streak' : 'Personal Best';
        setStreakAwardText(`${label}: ${s} days! 🔥`);
        setStreakAwardOpen(true);
        try { audioRef.current?.play().catch(()=>{}); } catch {}
      }
    }
  }, [totals.streak]);

  // Celebrate when all today's prompts are logged (once per day)
  useEffect(()=>{
    const today = todayISO();
    const key = `ma_daily_complete_${today}`;
    if ((orgPrompt || genPrompts.length) && actions.length){
      const orgDone = orgPrompt ? actions.some(a => a.date===today && (a.description||'').trim().toLowerCase() === orgPrompt.text.trim().toLowerCase()) : true;
      const gensDone = genPrompts.every(p => actions.some(a => a.date===today && (a.description||'').trim().toLowerCase() === p.text.trim().toLowerCase()));
      if (orgDone && gensDone && !localStorage.getItem(key)){
        localStorage.setItem(key, '1');
        setCelebrateOpen(true);
        try { audioRef.current?.play().catch(()=>{}); } catch {}
      }
    }
  }, [actions, orgPrompt, genPrompts]);

  async function enableDailyReminder(){
    try {
      if (!('Notification' in window)) { alert('Notifications not supported on this device'); return; }
      let perm = Notification.permission;
      if (perm !== 'granted') { perm = await Notification.requestPermission(); }
      if (perm !== 'granted') { alert('Notifications are blocked. Enable them in browser settings.'); return; }
      const targetHour = 19; // 7pm
      const now = new Date();
      const next = new Date();
      next.setHours(targetHour, 0, 0, 0);
      if (next <= now) next.setDate(next.getDate()+1);
      const ms = next.getTime() - now.getTime();
      const fire = async () => {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && reg.showNotification) {
            reg.showNotification('LSI Micro Actions', { body: "Don’t forget today’s action!", icon: '/icon-192.png', badge: '/icon-192.png' });
          } else {
            new Notification('LSI Micro Actions', { body: "Don’t forget today’s action!" });
          }
        } catch {}
      };
      setTimeout(async () => {
        await fire();
        const again = 24*60*60*1000;
        setInterval(fire, again);
      }, ms);
      setToast('Daily reminder scheduled ✅'); setTimeout(()=> setToast(null), 2000);
    } catch (e) {
      console.warn('Notification enable failed', e);
      setToast('Could not enable notifications'); setTimeout(()=> setToast(null), 2000);
    }
  }

  function shareWin(){
    const url = typeof window !== 'undefined' ? window.location.origin : '';
    const text = `I completed all my LSI Micro Actions today! 💚 Join me: ${url}`;
    if (navigator.share){
      navigator.share({ title: 'LSI Micro Actions', text, url }).catch(()=>{});
    } else if (navigator.clipboard){
      navigator.clipboard.writeText(text).then(()=>{
        setToast('Share text copied!'); setTimeout(()=> setToast(null), 2000);
      }).catch(()=>{});
    } else {
      alert(text);
    }
  }

  return (
    <div className="container">
      <audio ref={audioRef} src="/celebrate.wav" preload="auto" />
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:24}}>
        <img src="/icon-192.png" alt="LSI Logo" style={{width:48, height:48, borderRadius:8}} />
        <h1 style={{margin:0}}>LSI Micro Actions</h1>
      </div>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
        <div className="brand" title={TEAM_NAME}><span className="brand-dot"/><span>{TEAM_NAME}</span></div>
        <div><InstallButton /></div>
      </div>
      <div style={{display:'flex', gap:8, alignItems:'center', marginTop:8}}>
        <button className="btn" onClick={enableDailyReminder}>Enable Daily Reminder</button>
        <span className="small">Daily reminder around 7pm while the app is open.</span>
      </div>

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
          <div style={{marginTop:12}}>
            <HouseBlocks current={Math.max(0, Math.min(10, Math.round((Math.max(1, next - prev || 1) ? (totals.count - prev) : 0) / Math.max(1, next - prev || 1) * 10))) } span={Math.max(1, next - prev || 1)} />
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <h3>Today’s Prompts</h3>

        <div style={{marginBottom:12}}>
          <div className="badge" style={{marginBottom:8}}>🌟 Lakeshore Indivisible Immediate Action</div>
          {!orgPrompt ? <p className="small">No special action today. Check back tomorrow.</p> : (
            <ul style={{listStyle:'none', padding:0, margin:0}}>
              {[orgPrompt].map((p, i)=> {
                const done = actions.some(a => a.date === todayISO() && (a.description||'').trim().toLowerCase() === p.text.trim().toLowerCase());
                return (
                <li key={'org_'+i} style={{padding:'10px 0', borderBottom:'1px solid #e2e8f0'}}>
                  <div style={{display:'flex', gap:8, alignItems:'center'}}>
                    <div style={{flex:1, opacity: done ? 0.5 : 1}}>
                      {p.text} {p.link ? <a className="small" href={p.link} target="_blank" rel="noreferrer">(link)</a> : null}
                      {done ? <span className="small" style={{marginLeft:8}}>(logged today)</span> : null}
                    </div>
                    <button className="btn" onClick={()=> quickFill(p)} disabled={done} style={{opacity: done ? 0.6 : 1, cursor: done ? 'not-allowed' : 'pointer'}}>
                      {done ? 'Logged' : 'Log this'}
                    </button>
                  </div>
                </li>)
              })}
            </ul>
          )}
        </div>

        <div>
          <div className="badge" style={{marginBottom:8}}>🌱 Additional Daily Prompts</div>
          {genPrompts.length===0 ? <p className="small">No additional prompts today.</p> : (
            <ul style={{listStyle:'none', padding:0, margin:0}}>
              {genPrompts.map((p, i)=> {
                const done = actions.some(a => a.date === todayISO() && (a.description||'').trim().toLowerCase() === p.text.trim().toLowerCase());
                return (
                <li key={'gen_'+i} style={{padding:'10px 0', borderBottom:'1px solid #e2e8f0'}}>
                  <div style={{display:'flex', gap:8, alignItems:'center'}}>
                    <div style={{flex:1, opacity: done ? 0.5 : 1}}>
                      {p.text} {p.link ? <a className="small" href={p.link} target="_blank" rel="noreferrer">(link)</a> : null}
                      {done ? <span className="small" style={{marginLeft:8}}>(logged today)</span> : null}
                    </div>
                    <button className="btn" onClick={()=> quickFill(p)} disabled={done} style={{opacity: done ? 0.6 : 1, cursor: done ? 'not-allowed' : 'pointer'}}>
                      {done ? 'Logged' : 'Log this'}
                    </button>
                  </div>
                </li>)
              })}
            </ul>
          )}
        </div>

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
            {actions.slice(0,10).map(a=> (
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

      {streakAwardOpen ? (
        <div className="modal-backdrop" onClick={()=> setStreakAwardOpen(false)}>
          <div className="modal" onClick={(e)=> e.stopPropagation()}>
            <ConfettiCanvas key="confetti-streak" />
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              <img src="/icon-192.png" alt="Badge" style={{width:48, height:48, borderRadius:8}}/>
              <h2 style={{margin:0}}>New Personal Best! 🏆</h2>
            </div>
            <p className="small" style={{marginTop:8}}>{streakAwardText}</p>
            <div style={{display:'flex', gap:8, marginTop:12}}>
              <button className="btn" onClick={()=> setStreakAwardOpen(false)}>Keep it going</button>
            </div>
          </div>
        </div>
      ) : null}

      {celebrateOpen ? (
        <div className="modal-backdrop" onClick={()=> setCelebrateOpen(false)}>
          <div className="modal" onClick={(e)=> e.stopPropagation()}>
            <ConfettiCanvas key="confetti" />
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              <img src="/icon-192.png" alt="Badge" style={{width:48, height:48, borderRadius:8}}/>
              <h2 style={{margin:0}}>Daily Complete! 🎉</h2>
            </div>
            <p className="small" style={{marginTop:8}}>You completed all prompts today. Sheboygan thanks you!</p>
            <div style={{display:'flex', gap:8, marginTop:12}}>
              <button className="btn" onClick={()=> setCelebrateOpen(false)}>Awesome</button>
              <button className="btn" onClick={shareWin}>Share</button>
            </div>
          </div>
        </div>
      ) : null}

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

function HouseBlocks({ current, span }: { current: number; span: number; }){
  const total = 10;
  const filled = Math.max(0, Math.min(total, current));
  const size = 18, gap = 4;
  const cols = 5, rows = 2;
  const width = cols*size + (cols-1)*gap;
  const height = rows*size + (rows-1)*gap;
  const blocks = [];
  for (let r=0; r<rows; r++){
    for (let c=0; c<cols; c++){
      const i = r*cols + c;
      const x = c*(size+gap);
      const y = (rows-1-r)*(size+gap);
      const isFilled = i < filled;
      blocks.push(<rect key={i} x={x} y={y} width={size} height={size} rx={4} ry={4} fill={isFilled? '#22c55e':'#e2e8f0'} stroke="#cbd5e1" />)
    }
  }
  return (
    <div>
      <div className="small" style={{marginBottom:6}}>Milestone Builder</div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Progress blocks">{blocks}</svg>
      <div className="small" style={{marginTop:6}}>{filled} / {total} blocks toward your next level</div>
    </div>
  )
}

function ConfettiCanvas(){
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(()=>{
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = canvas.clientWidth;
    let h = canvas.height = canvas.clientHeight;

    const onResize = () => {
      w = canvas.width = canvas.clientWidth;
      h = canvas.height = canvas.clientHeight;
    };
    window.addEventListener('resize', onResize);

    const colors = ['#22c55e','#16a34a','#10b981','#60a5fa','#f59e0b','#ef4444','#6366f1'];
    const parts = Array.from({length: 180}).map(()=> ({
      x: Math.random()*w,
      y: -20 - Math.random()*h,
      r: 4 + Math.random()*6,
      vy: 2 + Math.random()*3,
      vx: -2 + Math.random()*4,
      rot: Math.random()*Math.PI,
      vr: -0.1 + Math.random()*0.2,
      color: colors[Math.floor(Math.random()*colors.length)]
    }));

    let raf = 0;
    const start = performance.now();
    const duration = 3500;

    const tick = (t:number) => {
      const elapsed = t - start;
      ctx.clearRect(0,0,w,h);
      for (const p of parts){
        p.vy += 0.02;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > h + 20) { p.y = -20; p.x = Math.random()*w; p.vy = 2 + Math.random()*3; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r, -p.r, p.r*2, p.r*2);
        ctx.restore();
      }
      if (elapsed < duration) { raf = requestAnimationFrame(tick); }
    };
    raf = requestAnimationFrame(tick);

    return ()=> { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); }
  }, []);

  return <canvas className="confetti" ref={canvasRef} />
}
