import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'

type Row = { day: string, actions: number, xp: number }

const sb = getSupabase(); // module-scope so hooks/handlers can use it

export default function Scoreboard(){
  const [daily, setDaily] = useState<Row[]>([])

  useEffect(()=>{
    (async()=>{
      const { data, error } = await sb
        .from('community_totals_daily')
        .select('*')
        .order('day', { ascending:false })
        .limit(30)
      if (!error) setDaily((data||[]) as Row[])
    })()
  }, [])

  return (
    <div className="container">
      <h1 style={{fontSize:34, color:'#5aa6ff', textShadow:'0 0 12px rgba(90,166,255,.45)'}}>Community Scoreboard</h1>
      <div className="card" style={{transform:'scale(1.03)', borderColor:'rgba(106,230,221,.45)'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr>
              <th style={{textAlign:'left', padding:'8px'}}>Day</th>
              <th style={{textAlign:'center', padding:'8px'}}>Actions</th>
              <th style={{textAlign:'center', padding:'8px'}}>XP</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((r)=>(
              <tr key={r.day}>
                <td style={{padding:'8px'}}>{r.day}</td>
                <td style={{textAlign:'center', padding:'8px'}}>{r.actions}</td>
                <td style={{textAlign:'center', padding:'8px'}}>{r.xp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
