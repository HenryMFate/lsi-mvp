import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { useEffect } from 'react'
import { registerSW } from '../lib/registerSW'

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => { registerSW(); }, []);
  return <Component {...pageProps} />
}
