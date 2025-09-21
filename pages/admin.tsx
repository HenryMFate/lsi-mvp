import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Admin(){
  const [pass, setPass] = useState('')
  const [lead, setLead] = useState<number>(7)
  const [orgs, setOrgs] = useState<any[]>([])
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<'high'|'low'>('low')
  const [target, setTarget] = useState<string>('')

  async function load(){
    if (!supabase) return;
    const { data: s } = await supabase.from('app_settings').select('*').eq('key','lsi_lead_days').maybeSingle()
    if (s && s.value) setLead(Number(s.value)||7)
    const { data: o } = await supabase.from('org_prompts').select('*').order('target_day', {ascending:true})
    setOrgs(o||[])
  }
  useEffect(()=>{ load() }, [])

  async function saveLead(){
    if (pass !== (process.env.NEXT_PUBLIC_ADMIN_PASS||'')){ alert('Wrong password'); return; }
    await supabase.from('app_settings').upsert({ key:'lsi_lead_days', value: String(lead) }, { onConflict:'key' })
    alert('Lead days updated to '+lead)
  }

  async function addOrg(){
    if (pass !== (process.env.NEXT_PUBLIC_ADMIN_PASS||'')){ alert('Wrong password'); return; }
    if (!text.trim()){ alert('Add text'); return; }
    await supabase.from('org_prompts').insert({ text, priority, target_day: target||null })
    setText(''); setTarget(''); setPriority('low')
    await load()
  }

  return (
    <div className="container">
      <h1>Admin</h1>
      <input className="input" type="password" placeholder="Admin pass" value={pass} onChange={e=>setPass(e.target.value)} />

      <div className="card" style={{marginTop:12}}>
        <h3>High-Priority Lead Days</h3>
        <p className="small">How many days before the target date should high-priority LSI prompts appear (as Pending)?</p>
        <input className="input" type="number" min={0} max={30} value={lead} onChange={e=>setLead(Number(e.target.value))} />
        <button className="btn" style={{marginTop:8}} onClick={saveLead}>Save Lead Days</button>
      </div>

      <div className="card" style={{marginTop:12}}>
        <h3>Add LSI Prompt</h3>
        <input className="input" placeholder="Prompt text" value={text} onChange={e=>setText(e.target.value)} />
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:8, marginTop:8}}>
          <label className="small">Priority
            <select className="input" value={priority} onChange={e=>setPriority(e.target.value as any)}>
              <option value="high">high</option>
              <option value="low">low</option>
            </select>
          </label>
          <label className="small">Target day (optional)
            <input className="input" type="date" value={target} onChange={e=>setTarget(e.target.value)} />
          </label>
        </div>
        <button className="btn" style={{marginTop:8}} onClick={addOrg}>Add</button>
      </div>

      <div className="card" style={{marginTop:12}}>
        <h3>Existing</h3>
        <ul>
          {orgs.map((o:any)=>(<li key={o.id}>{o.priority} · {o.target_day||'—'} · {o.text}</li>))}
        </ul>
      </div>
    </div>
  )
}
