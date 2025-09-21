import { useEffect, useState } from 'react'


type Row = { day: string, actions: number, xp: number }
export default function Scoreboard(){
  const [daily, setDaily] = useState<Row[]>([])
  useEffect(()=>{ (async()=>{
    const { data } = await sb.from('community_totals_daily').select('*').order('day', {ascending:false}).limit(30)
    setDaily((data||[]) as Row[])
  })() }, [])
  return (
    <div className="container">
      <h1>Community Scoreboard</h1>
      <div className="card">
        <table style={{width:'100%'}}>
          <thead><tr><th style={{textAlign:'left'}}>Day</th><th>Actions</th><th>XP</th></tr></thead>
          <tbody>
            {daily.map((r)=>(
              <tr key={r.day}><td>{r.day}</td><td style={{textAlign:'center'}}>{r.actions}</td><td style={{textAlign:'center'}}>{r.xp}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
