import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'

type OrgPrompt = { id:number; text:string; priority:'high'|'low'; target_day:string|null; lead_days:number|null }

export default function Admin(){
  if (typeof window !== 'undefined' && !localStorage.getItem('admin_ok')){ window.location.href='/admin-login'; return null as any; }
  const sb = getSupabase()
  const [lead, setLead] = useState<number>(7)
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<'high'|'low'>('low')
  const [target, setTarget] = useState<string>('')
  const [leadDays, setLeadDays] = useState<number>(7)
  const [rows, setRows] = useState<OrgPrompt[]>([])

  function ok(){ return typeof window !== 'undefined' && !!localStorage.getItem('admin_ok') }

  async function load(){
    const { data: s } = await sb.from('app_settings').select('*').eq('key','lsi_lead_days').maybeSingle()
    if (s?.value) setLead(Number(s.value)||7)
    const { data: o } = await sb.from('org_prompts').select('id,text,priority,target_day,lead_days').order('target_day', {ascending:true})
    setRows((o||[]) as OrgPrompt[])
  }
  useEffect(()=>{ load() }, [])

  async function saveLead(){
    if (!ok()) return alert('Wrong password')
    await sb.from('app_settings').upsert({ key:'lsi_lead_days', value:String(lead) }, { onConflict:'key' })
    alert('Lead days saved')
  }
  async function addPrompt(){
    if (!ok()) return alert('Wrong password')
    if (!text.trim()) return alert('Enter text')
    await sb.from('org_prompts').insert({ text, priority, target_day: target || null, lead_days: leadDays })
    setText(''); setPriority('low'); setTarget('')
    await load()
  }
  async function delPrompt(id:number){
    if (!ok()) return alert('Wrong password')
    if (!confirm('Delete this prompt?')) return
    await sb.from('org_prompts').delete().eq('id', id)
    await load()
  }

  return (
    <div className="container">
      <h1>Admin — Lakeshore Indivisible</h1>
      <div className="card" style={{marginBottom:12}}>
        <label className="small">Admin Pass
          <input className="input" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Enter admin password"/>
        </label>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <h3>High-Priority Lead Days</h3>
        <p className="small">How many days before the target date should high-priority prompts show (as Pending)?</p>
        <input className="input" type="number" min={0} max={30} value={lead} onChange={e=>setLead(Number(e.target.value)||0)} />
        <button className="btn" style={{marginTop:8}} onClick={saveLead}>Save</button>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <h3>Add LSI Prompt</h3>
        <div style={{display:'grid', gridTemplateColumns:'1fr 120px 160px 120px 120px', gap:8}}>
          <input className="input" placeholder="Prompt text…" value={text} onChange={e=>setText(e.target.value)} />
          <select className="input" value={priority} onChange={e=>setPriority(e.target.value as any)}>
            <option value="high">high</option>
            <option value="low">low</option>
          </select>
          <input className="input" type="date" value={target} onChange={e=>setTarget(e.target.value)} />
          <input className="input" type="number" min={0} max={30} value={leadDays} onChange={e=>setLeadDays(Number(e.target.value)||0)} placeholder="Lead days" />
          <button className="btn" onClick={addPrompt}>Add</button>
        </div>
      </div>

      <div className="card">
        <h3>Existing Prompts</h3>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead><tr><th style={{textAlign:'left'}}>Text</th><th>Priority</th><th>Date</th><th>Lead days</th><th></th></tr></thead>
          <tbody>
            {rows.map(r=> (
              <tr key={r.id}>
                <td style={{padding:'6px 4px'}}>{r.text}</td>
                <td style={{textAlign:'center'}}>{r.priority}</td>
                <td style={{textAlign:'center'}}>{r.target_day || '—'}</td>
                <td style={{textAlign:'center'}}>{r.lead_days ?? '—'}</td>
                <td style={{textAlign:'right'}}>
                  <button className="btn" onClick={()=>delPrompt(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
