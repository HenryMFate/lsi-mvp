import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'

type Item = { sticker_name?: string; achievement_name?: string; unlocked_at: string }

const sb = getSupabase()

export default function Achievements(){
  const [items, setItems] = useState<Item[]>([])
  const [anon, setAnon] = useState('')

  useEffect(()=>{
    const a = localStorage.getItem('anon_id') || ''
    setAnon(a)
    ;(async()=>{
      const { data: st } = await sb.from('stickers').select('*').eq('user_id', a)
      const { data: ac } = await sb.from('achievements').select('*').eq('user_id', a)
      const rows: Item[] = []
      ;(st||[]).forEach((r:any)=>rows.push({ sticker_name:r.sticker_name, unlocked_at:r.unlocked_at }))
      ;(ac||[]).forEach((r:any)=>rows.push({ achievement_name:r.achievement_name, unlocked_at:r.unlocked_at }))
      setItems(rows.sort((x,y)=>x.unlocked_at<y.unlocked_at?1:-1))
    })()
  }, [])

  return (
    <div className="container">
      <h1>Your Stickers & Achievements</h1>
      <div className="small">User: {anon}</div>
      <div className="row" style={{marginTop:12}}>
        {items.length===0 && <div className="card">Earn stickers by completing actions, ya know!</div>}
        {items.map((it, i)=> (
          <div key={i} className="card">
            <div style={{fontWeight:600}}>{it.sticker_name || it.achievement_name}</div>
            <div className="small">{new Date(it.unlocked_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
