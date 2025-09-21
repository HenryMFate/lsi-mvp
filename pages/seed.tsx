import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'

export default function Seed(){
  const sb = getSupabase();
  const [msg, setMsg] = useState('')

  async function seedWeekly(){
    const { error } = await sb.rpc('iso_week_start', { ts: new Date().toISOString() } as any)
    // The above call is just to ensure the function exists; ignore result.
    const { error: e2 } = await sb
      .from('weekly_challenges')
      .upsert({ week_start: new Date().toISOString().slice(0,10), title:'Complete 5 civic actions', target_count:5, category:'civic', active:true },
              { onConflict:'week_start' })
    if (e2) setMsg(e2.message); else setMsg('Seeded weekly challenge (or already present).')
  }

  return (
    <div className="container">
      <h1>Seed Utilities</h1>
      <div className="card">
        <button className="btn" onClick={seedWeekly}>Seed default weekly challenge</button>
        <p className="small" style={{marginTop:8}}>{msg}</p>
      </div>
    </div>
  )
}
