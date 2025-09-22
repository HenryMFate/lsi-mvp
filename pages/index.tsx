import { useState, useEffect } from 'react'

export default function Home(){
  const [daily,setDaily] = useState<any>({actions:0})
  const [totalAll,setTotalAll] = useState<number>(0)

  return (
    <div className="container" style={{paddingBottom:96}}>
      <div className="header" style={{display:'flex',alignItems:'center',gap:12}}>
        <img src="/LSI.png" style={{width:36,height:36,borderRadius:8}}/>
        <h1>LSI Micro Actions</h1>
      </div>

      <div className="card" style={{marginTop:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,alignItems:'center'}}>
        <div>
          <div className="small">Today's community actions</div>
          <div style={{fontSize:28,fontWeight:900}}>{daily?.actions||0}</div>
        </div>
        <div>
          <div className="small">All-time actions</div>
          <div style={{fontSize:28,fontWeight:900}}>{Intl.NumberFormat().format(totalAll)}</div>
        </div>
      </div>

      <div style={{position:'fixed',bottom:8,left:8,right:8,zIndex:999,pointerEvents:'none'}}>
        <div className="card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',opacity:.92,pointerEvents:'auto',padding:'10px 14px'}}>
          <div><strong>Today</strong>: {daily?.actions||0}</div>
          <div><strong>All-time</strong>: {Intl.NumberFormat().format(totalAll)}</div>
        </div>
      </div>
    </div>
  )
}
