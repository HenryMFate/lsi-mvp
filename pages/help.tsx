export default function Help(){
  return (
    <div className="container">
      <h1>How to use LSI Micro Actions</h1>
      <div className="card" style={{marginBottom:12}}>
        <h3>Small steps, big change</h3>
        <p>Every little action adds up—together, we build a kinder, more connected Sheboygan, ya know.</p>
        <ul>
          <li>Pick one of today’s prompts (LSI or General).</li>
          <li>Tap <b>Log this</b>, fill minutes/date, and submit.</li>
          <li>Come back tomorrow for fresh prompts (they reset at midnight).</li>
        </ul>
      </div>
      <div className="card" style={{marginBottom:12}}>
        <h3>Privacy</h3>
        <p>We store an anonymous ID and your zipcode to see local engagement. We don’t collect names or contact info. Your action text is only used for community stats.</p>
      </div>
      <div className="card">
        <h3>Tips</h3>
        <ul>
          <li>Invite a neighbor—actions with others build more trust.</li>
          <li>Try an LSI prompt first for extra XP, then a General one.</li>
          <li>Hit streaks to unlock special stickers.</li>
        </ul>
      </div>
    </div>
  )
}
