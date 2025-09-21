import { useEffect, useState } from 'react'
import { getSupabase } from '../lib/supabase'

export default function Admin(){
  const [pass, setPass] = useState('')
  const [lead, setLead] = useState<number>(7)
  const [orgs, setOrgs] = useState<any[]>([])
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<'high'|'low'>('low')
  const [target, setTarget] = useState<string>('')

  async function load(){
    const sb = getSupabase();
    const { data: s } = await sb.from('app_settings').select('*').eq('key','lsi_lead_days').maybeSingle()
    if (s && s.value) setLead(Number(s.value)||7)
    const { data: o } = await sb.from('org_prompts').select('*').order('target_day', {ascending:true})
    setOrgs(o||[])
  }
  useEffect(()=>{ load() }, [])

  async function saveLead(){
    if (pass !== (process.env.NEXT_PUBLIC_ADMIN_PASS||'')){ alert('Wrong password'); return; }
    const sb = getSupabase();
    await sb.from('app_settings').upsert({ key:'lsi_lead_days', value: String(lead) }, { onConflict:'key' })
    alert('Lead days updated to '+lead)
  }

  async function addOrg(){
    if (pass !== (process.env.NEXT_PUBLIC_ADMIN_PASS||'')){ alert('Wrong password'); return; }
    const sb = getSupabase();
    if (!text.trim()){ alert('Add text'); return; }
    await sb.from('org_prompts').insert({ text, priority, target_day: target||null })
    setText(''); setTarget(''); setPriority('low')
    await load()
  }

  return <div className="container">Patched Admin</div>
}
