import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Row = { day: string, zip: string, actions_count: number, minutes_sum: number }

export default function Scoreboard(){
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{ (async()=>{
    if (!supabase){ setLoading(false); return }
    const since = new Date(); since.setDate(since.getDate()-30)
    const { data } = await supabase.from('daily_zip_aggregates').select('*').gte('day', since.toISOString().slice(0,10)).order('day', { ascending: false })
    setRows((data as any) || []); setLoading(false)
  })() }, [])

  if (loading) return <div className="container"><h1>Scoreboard</h1><p className="small">Loading…</p></div>
  if (!rows.length) return <div className="container"><h1>Scoreboard</h1><p className="small">No cloud data yet. Enable sync to populate.</p></div>

  const byZip: Record<string, Row[]> = {}
  rows.forEach(r=> { byZip[r.zip] = byZip[r.zip] || []; byZip[r.zip].push(r) })

  const totals = Object.entries(byZip).map(([zip, arr])=> ({
    zip,
    actions: arr.reduce((n,r)=>n+r.actions_count,0),
    minutes: arr.reduce((n,r)=>n+r.minutes_sum,0)
  })).sort((a,b)=> b.actions - a.actions)

  return (
    <div className="container">
      <h1>Scoreboard (Last 30 days)</h1>
      <div className="card" style={{marginTop:12}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr><th align="left">ZIP</th><th align="right">Actions</th><th align="right">Minutes</th></tr>
          </thead>
          <tbody>
            {totals.map(t=> (
              <tr key={t.zip} style={{borderTop:'1px solid #e2e8f0'}}>
                <td>{t.zip}</td>
                <td align="right">{t.actions}</td>
                <td align="right">{t.minutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small" style={{marginTop:12}}>Only anonymized totals by ZIP are shown. Individual entries are private.</p>
    </div>
  )
}