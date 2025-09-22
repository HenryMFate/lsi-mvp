
import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'

export default function Admin(){
  if (typeof window !== 'undefined' && !localStorage.getItem('admin_ok')){ window.location.href='/admin-login'; return null as any;}
  const sb = getSupabase()
  const [rows, setRows] = useState<any[]>([])
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<'low'|'high'>('low')
  const [target, setTarget] = useState('')
  const [lead, setLead] = useState<number>(7)

  async function load(){ const { data } = await sb.from('org_prompts').select('id,text,priority,target_day,lead_days').order('id', {ascending:false}); setRows(data||[]) }
  useEffect(()=>{ load() }, [])

  async function add(){
    if (!text){ alert('Enter text'); return; }
    const body:any = { text, priority, target_day: (target||null), lead_days: lead }
    const { error } = await sb.from('org_prompts').insert(body)
    if (error){ alert(error.message); return; }
    setText(''); setPriority('low'); setTarget(''); setLead(7); await load()
  }
  async function del(id:any){
    if (!confirm('Delete this prompt?')) return;
    const { error } = await sb.from('org_prompts').delete().eq('id', id)
    if (error){ alert(error.message); return; }
    await load()
  }

  return (
    <div className="container">
      <h1>Admin — LSI Prompts</h1>
      <div className="card">
        <div style={{display:'grid', gridTemplateColumns:'1fr 120px 140px 120px auto', gap:8}}>
          <input className="input" placeholder="Prompt text" value={text} onChange={e=>setText(e.target.value)} />
          <select className="input" value={priority} onChange={e=>setPriority(e.target.value as any)}>
            <option value="low">low</option><option value="high">high</option>
          </select>
          <input className="input" type="date" value={target} onChange={e=>setTarget(e.target.value)} />
          <input className="input" type="number" min={0} max={60} value={lead} onChange={e=>setLead(Number(e.target.value)||0)} />
          <button className="btn" onClick={add}>Add</button>
        </div>
      </div>

      <div style={{height:12}} />
      <div className="card">
        <div className="small" style={{marginBottom:8}}>Existing</div>
        {rows.map(r=>(
          <div key={r.id} style={{display:'grid', gridTemplateColumns:'1fr 100px 120px 100px 80px', gap:8, alignItems:'center', padding:'8px 0', borderBottom:'1px solid rgba(168,182,217,.18)'}}>
            <div>{r.text}</div><div className="small">{r.priority}</div><div className="small">{r.target_day||'-'}</div><div className="small">{r.lead_days||0}d</div>
            <div><button className="btn secondary" onClick={()=>del(r.id)}>Delete</button></div>
          </div>
        ))}
      </div>
    </div>
  )
}
