import { useEffect, useState } from 'react'

export default function InstallButton(){
  const [deferred, setDeferred] = useState<any>(null)
  const [visible, setVisible] = useState(false)
  const [showHint, setShowHint] = useState(false)

  useEffect(()=>{
    const handler = (e: any) => {
      e.preventDefault()
      setDeferred(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    // After a few seconds, if no event fired, show hint
    const t = setTimeout(()=> setShowHint(true), 2500)
    return () => { window.removeEventListener('beforeinstallprompt', handler); clearTimeout(t) }
  },[])

  async function doInstall(){
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setVisible(false)
  }

  return (
    <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
      {visible && <button className="btn" onClick={doInstall}>Install App</button>}
      {!visible && showHint && (
        <div className="hint small">
          On Android, open the ⋮ menu in Chrome → <b>Add to Home screen</b>.
        </div>
      )}
    </div>
  )
}