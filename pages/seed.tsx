import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Seed(){
  const [msg, setMsg] = useState('')
  const [pass, setPass] = useState('')

  async function run(){
    if (pass !== (process.env.NEXT_PUBLIC_ADMIN_PASS||'')){ alert('Wrong password'); return; }
    if (!supabase){ alert('Supabase not configured'); return; }
    // Create default weekly challenge if none active
    const monday = new Date(); const day = monday.getDay(); const diff = (day===0? -6 : 1 - day); monday.setDate(monday.getDate()+diff);
    const week = monday.toISOString().slice(0,10)
    const { data: ex } = await supabase.from('weekly_challenges').select('*').eq('active', true).limit(1)
    if (!ex || !ex.length){
      await supabase.from('weekly_challenges').insert({ week_start: week, title:'Complete 5 civic actions', target_count:5, category:'civic', active:true })
    }
    setMsg('Seeded defaults (if missing).')
  }

  return (
    <div className="container">
      <h1>Seed Defaults</h1>
      <p className="small">Creates default weekly challenge if none exists.</p>
      <input className="input" type="password" placeholder="Admin pass" value={pass} onChange={e=>setPass(e.target.value)} />
      <button className="btn" onClick={run}>Run seed</button>
      {msg && <p className="small">{msg}</p>}
    </div>
  )
}
