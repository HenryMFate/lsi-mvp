
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import '../styles/globals.css'

export default function MyApp({ Component, pageProps }: AppProps){
  useEffect(()=>{
    if ('serviceWorker' in navigator){
      navigator.serviceWorker.register('/sw.js').then(reg=>{
        reg.addEventListener('updatefound', ()=>{
          const nw = reg.installing; if(!nw) return;
          nw.addEventListener('statechange', ()=>{
            if (nw.state==='installed' && navigator.serviceWorker.controller){
              if (confirm('A new version is ready. Refresh now?')) nw.postMessage({type:'SKIP_WAITING'})
            }
          })
        })
      })
      navigator.serviceWorker.addEventListener('controllerchange', ()=>window.location.reload())
    }
  },[])
  return <Component {...pageProps} />
}
