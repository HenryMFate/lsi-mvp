import { useEffect, useState } from 'react'

export default function InstallButton(){
  const [deferred, setDeferred] = useState<any>(null);
  const [supported, setSupported] = useState(false);

  useEffect(()=>{
    const handler = (e: any) => { e.preventDefault(); setDeferred(e); setSupported(true); };
    (window as any).addEventListener('beforeinstallprompt', handler);
    return ()=> (window as any).removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!supported) return null;

  return <button className="btn" onClick={async()=>{ if (deferred){ deferred.prompt(); await deferred.userChoice; setDeferred(null); } }}>Install App</button>
}
