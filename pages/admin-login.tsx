
import { useState } from 'react'
export default function AdminLogin(){
  const [p, setP] = useState('')
  function submit(e:any){ e.preventDefault(); if (p === (process.env.NEXT_PUBLIC_ADMIN_PASS||'')){ localStorage.setItem('admin_ok','1'); window.location.href='/admin' } else { alert('Wrong password') } }
  return (
    <div style={{maxWidth:480, margin:'60px auto', padding:16}}>
      <h1>Admin Login</h1>
      <form onSubmit={submit}>
        <input className="input" type="password" value={p} onChange={e=>setP(e.target.value)} placeholder="Admin password" />
        <button className="btn" style={{marginTop:10}}>Enter</button>
      </form>
      <div style={{marginTop:24}}>
        <a href="/" className="btn">← Back to Home</a>
      </div>
    </div>
  )
}
