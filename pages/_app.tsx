import type { AppProps } from 'next/app'
import '../styles/globals.css'
import Head from 'next/head'
import { useEffect } from 'react'

export default function MyApp({ Component, pageProps }: AppProps){
  useEffect(()=>{
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(()=>{});
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <title>LSI Micro Actions</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
