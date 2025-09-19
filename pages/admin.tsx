import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

type OrgPrompt = {
  id?: string
  text: string
  link?: string | null
  category?: 'civic'|'mutual_aid'|'environment'|'bridging'|'reflection'|null
  active: boolean
  start_date?: string | null
  end_date?: string | null
  priority?: number | null
}

const CATS = ['civic','mutual_aid','environment','bridging','reflection'] as const

export default function Admin(){
  const [pw, setPw] = useState('')
  const [ok, setOk] = useState(false)
  const [rows, setRows] = useState<OrgPrompt[]>([])
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState<OrgPrompt>({ text: '', link: '', category: 'civic', active: true, start_date: '', end_date: '', priority: 0 })

  useEffect(()=> {
    const cached = sessionStorage.getItem('ma_admin_ok')
    if (cached === '1') setOk(true)
  }, [])

  async function auth(){
    const target = process.env.NEXT_PUBLIC_ADMIN_PASS || ''
    if (pw && target && pw === target){ setOk(true); sessionStorage.setItem('ma_admin_ok', '1') }
    else alert('Wrong password')
  }

  async function load(){
    if (!supabase) { alert('Supabase not configured'); return; }
    setLoading(true)
    const { data, error } = await supabase.from('org_prompts').select('*').order('priority', { ascending: false }).order('start_date', { ascending: true })
    setLoading(false)
    if (error){ alert(error.message); return; }
    setRows(data as any || [])
  }

  useEffect(()=>{ if (ok) load() }, [ok])

  async function saveNew(){
    if (!supabase) return;
    const body: any = {
      text: (draft.text||'').trim(),
      link: draft.link?.trim() || null,
      category: draft.category || null,
      active: !!draft.active,
      start_date: draft.start_date || null,
      end_date: draft.end_date || null,
      priority: Number(draft.priority)||0
    }
    if (!body.text){ alert('Text is required'); return; }
    const { error } = await supabase.from('org_prompts').insert(body)
    if (error) { alert(error.message); return; }
    setDraft({ text: '', link: '', category: 'civic', active: true, start_date: '', end_date: '', priority: 0 })
    await load()
  }

  async function updateRow(row: OrgPrompt){
    if (!row.id){ return }
    if (!supabase) { alert('Supabase not configured'); return; }
    const body: any = {
      text: (row.text||'').trim(),
      link: (row.link||'') || null,
      category: row.category || null,
      active: !!row.active,
      start_date: row.start_date || null,
      end_date: row.end_date || null,
      priority: Number(row.priority)||0
    }
    const s = supabase!; const { error } = await s.from('org_prompts').update(body).eq('id', row.id)
    if (error){ alert(error.message); return; }
    await load()
  }

  async function del(id?: string){
    if (!id) return;
    if (!supabase) { alert('Supabase not configured'); return; }
    if (!confirm('Delete this item?')) return;
    const s = supabase!; const { error } = await s.from('org_prompts').delete().eq('id', id)
    if (error){ alert(error.message); return; }
    await load()
  }

  if (!ok){
    return (
      <div className="container">
        <Head><title>Admin — LSI Micro Actions</title></Head>
        <div className="card">
          <h3>Admin Login</h3>
          <p className="small">Enter the admin password to manage Lakeshore Indivisible prompts.</p>
          <input className="input" placeholder="Password" type="password" value={pw} onChange={e=> setPw(e.target.value)} />
          <button className="btn" onClick={auth} style={{marginTop:8}}>Enter</button>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <Head><title>Admin — LSI Micro Actions</title></Head>
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16}}>
        <img src="/icon-192.png" alt="LSI" style={{width:40, height:40, borderRadius:8}}/>
        <h1 style={{margin:0}}>Admin — LSI Micro Actions</h1>
      </div>

      <div className="card" style={{marginBottom:12}}>
        <h3>Add Immediate Action</h3>
        <div className="row">
          <label className="small">Text
            <input className="input" value={draft.text} onChange={e=> setDraft(d=> ({...d, text: e.target.value}))} placeholder="Contact alder about agenda 5 (link below)"/>
          </label>
          <label className="small">Link (optional)
            <input className="input" value={draft.link||''} onChange={e=> setDraft(d=> ({...d, link: e.target.value}))} placeholder="https://..."/>
          </label>
          <label className="small">Category
            <select className="input" value={draft.category||''} onChange={e=> setDraft(d=> ({...d, category: e.target.value as any}))}>
              {CATS.map(c=> <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="small">Priority (higher shows first)
            <input className="input" type="number" value={draft.priority||0} onChange={e=> setDraft(d=> ({...d, priority: Number(e.target.value)||0}))}/>
          </label>
          <label className="small">Start date (optional)
            <input className="input" type="date" value={draft.start_date||''} onChange={e=> setDraft(d=> ({...d, start_date: e.target.value}))}/>
          </label>
          <label className="small">End date (optional)
            <input className="input" type="date" value={draft.end_date||''} onChange={e=> setDraft(d=> ({...d, end_date: e.target.value}))}/>
          </label>
          <label className="small" style={{display:'flex', alignItems:'center', gap:6}}>
            <input type="checkbox" checked={!!draft.active} onChange={e=> setDraft(d=> ({...d, active: e.target.checked}))}/> Active
          </label>
        </div>
        <div style={{display:'flex', gap:8, marginTop:8}}>
          <button className="btn" onClick={saveNew}>Add</button>
        </div>
      </div>

      <div className="card">
        <h3>Existing</h3>
        <button className="btn" onClick={load} disabled={loading}>{loading?'Loading…':'Refresh'}</button>
        <ul style={{listStyle:'none', padding:0, margin:0}}>
          {rows.map(r=> (
            <li key={r.id} style={{borderBottom:'1px solid #e2e8f0', padding:'10px 0'}}>
              <div className="row">
                <label className="small">Text
                  <input className="input" value={r.text} onChange={e=> setRows(rows.map(x=> x.id===r.id? {...x, text:e.target.value}:x))}/>
                </label>
                <label className="small">Link
                  <input className="input" value={r.link||''} onChange={e=> setRows(rows.map(x=> x.id===r.id? {...x, link:e.target.value}:x))}/>
                </label>
                <label className="small">Category
                  <select className="input" value={r.category||''} onChange={e=> setRows(rows.map(x=> x.id===r.id? {...x, category:e.target.value as any}:x))}>
                    {CATS.map(c=> <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="small">Priority
                  <input className="input" type="number" value={r.priority||0} onChange={e=> setRows(rows.map(x=> x.id===r.id? {...x, priority:Number(e.target.value)||0}:x))}/>
                </label>
                <label className="small">Start
                  <input className="input" type="date" value={r.start_date||''} onChange={e=> setRows(rows.map(x=> x.id===r.id? {...x, start_date:e.target.value}:x))}/>
                </label>
                <label className="small">End
                  <input className="input" type="date" value={r.end_date||''} onChange={e=> setRows(rows.map(x=> x.id===r.id? {...x, end_date:e.target.value}:x))}/>
                </label>
                <label className="small" style={{display:'flex', alignItems:'center', gap:6}}>
                  <input type="checkbox" checked={!!r.active} onChange={e=> setRows(rows.map(x=> x.id===r.id? {...x, active:e.target.checked}:x))}/> Active
                </label>
              </div>
              <div style={{display:'flex', gap:8, marginTop:8}}>
                <button className="btn" onClick={()=> updateRow(r)}>Save</button>
                <button className="btn" onClick={()=> del(r.id)} style={{background:'#ef4444'}}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
