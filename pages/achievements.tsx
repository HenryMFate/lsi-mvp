
import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'
import { ALL, loadAch, saveAch, type Achievement, loadBest } from '../lib/achievements'

export default function Ach(){
  const sb = getSupabase()
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())

  useEffect(()=>{
    const s = loadAch(); // mark installed
    s.add('installed'); saveAch(s); setUnlocked(new Set(s))
  }, [])

  return (
    <div className="container">
      <h1>Achievements & Stickers</h1>
      <p className="small">Locked items appear dim — unlock them by completing actions, reaching streaks, and finishing your Daily Six.</p>
      <div className="row">
        {ALL.map(a=>{
          const isOn = unlocked.has(a.id)
          return (
            <div key={a.id} className="card" style={{opacity: isOn? 1 : .45}}>
              <div style={{fontSize:32}}>{a.icon}</div>
              <div style={{fontWeight:700}}>{a.title}</div>
              <div className="small">{a.desc}</div>
              <div className="small">{isOn? 'Unlocked' : 'Locked'}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
