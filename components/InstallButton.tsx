import { useEffect, useState } from 'react'

export default function InstallButton(){
  const [deferred, setDeferred] = useState<any>(null)
  const [visible, setVisible] = useState(false)

  useEffect(()=>{
    const handler = (e: any) => {
      e.preventDefault()
      setDeferred(e)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  },[])

  async function doInstall(){
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setVisible(false)
  }

  if (!visible) return null
  return <button className="btn" onClick={doInstall}>Install App</button>
}