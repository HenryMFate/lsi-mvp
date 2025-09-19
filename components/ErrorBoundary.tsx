import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error?: any };

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props){
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any){
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any){
    console.error('App ErrorBoundary caught:', error, info);
  }
  render(){
    if (this.state.hasError){
      return (
        <div className="container">
          <div className="card" style={{marginTop:16}}>
            <h3>Something went wrong</h3>
            <p className="small">A client-side error occurred. Please screenshot this and share:</p>
            <pre style={{whiteSpace:'pre-wrap', background:'#f1f5f9', padding:12, borderRadius:12, overflow:'auto'}}>
{String(this.state.error || 'Unknown error')}
            </pre>
            <p className="small">Try reloading the page. If it persists, we'll fix it quickly.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
