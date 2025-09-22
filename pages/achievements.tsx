
import { useEffect, useState } from 'react'
import { ALL, loadAch, saveAch } from '../lib/achievements'

export default function Ach(){
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())
  useEffect(()=>{ const s = loadAch(); s.add('installed'); saveAch(s); setUnlocked(new Set(s)) }, [])
  return (
    <div className="container">
      <h1>Achievements & Stickers</h1>
      <div className="row">
        {ALL.map(a=>{
          const on = unlocked.has(a.id)
          return (
            <div key={a.id} className="card" style={{opacity:on?1:.45}}>
              <div style={{fontSize:32}}>{a.icon}</div>
              <div style={{fontWeight:700}}>{a.title}</div>
              <div className="small">{a.desc}</div>
              <div className="small">{on?'Unlocked':'Locked'}</div>
            </div>
          )
        })}
      </div>
      <div style={{marginTop:24}}>
        <a href="/" className="btn">← Back to Home</a>
      </div>
    </div>
  )
}
