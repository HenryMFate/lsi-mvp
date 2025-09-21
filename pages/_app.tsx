import { registerSW } from '../lib/registerSW'
import { useEffect } from 'react'
import type { AppProps } from 'next/app'
import '../styles/globals.css'

export default function MyApp({ Component, pageProps }: AppProps){ useEffect(()=>{registerSW()},[]); return <Component {...pageProps} /> }
