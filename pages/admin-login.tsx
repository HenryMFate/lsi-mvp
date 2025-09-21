import { useState } from 'react'
import { useRouter } from 'next/router'

export default function AdminLogin(){
  const [pass, setPass] = useState('')
  const router = useRouter()
  function submit(){
    if (pass === (process.env.NEXT_PUBLIC_ADMIN_PASS || '')){
      localStorage.setItem('admin_ok','1')
      router.push('/admin')
    } else {
      alert('Wrong password')
    }
  }
  return (
    <div className="container">
      <div className="card">
        <h1>Admin Login</h1>
        <p className="small">Enter the admin password to manage Lakeshore Indivisible prompts.</p>
        <input className="input" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Admin password" />
        <button className="btn" style={{marginTop:10}} onClick={submit}>Enter</button>
      </div>
    </div>
  )
}
