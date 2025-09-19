import type { AppProps } from 'next/app'
import Head from 'next/head'
import '../styles/globals.css'
import { useEffect } from 'react'

export default function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(()=>{});
    }
  }, []);
  return <>
    <Head>
      <meta name="theme-color" content="#0f172a" />
      <link rel="manifest" href="/manifest.json" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="LSI Micro Actions" />
    </Head>
    <Component {...pageProps} />
  </>
}