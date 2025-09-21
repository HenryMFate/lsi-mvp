
import type { AppProps } from 'next/app'
import { useEffect } from 'react'
import '../styles/globals.css'

export default function MyApp({ Component, pageProps }: AppProps){
  useEffect(()=>{
    if ('serviceWorker' in navigator){
      navigator.serviceWorker.register('/sw.js').then(reg=>{
        reg.addEventListener('updatefound', ()=>{
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', ()=>{
            if (newWorker.state === 'installed'){
              if (navigator.serviceWorker.controller){
                // update available
                const agree = confirm('A new version is ready. Refresh now?')
                if (agree){
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              }
            }
          });
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange', ()=>{
        window.location.reload();
      });
    }
  }, [])
  return <Component {...pageProps} />
}
