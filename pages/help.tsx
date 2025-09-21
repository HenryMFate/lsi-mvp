
export default function Help(){
  return (
    <div className='container'>
      <h1>How LSI Micro Actions Works</h1>
      <div className='card'>
        <h3>Small steps, big results</h3>
        <p className='small'>
          Real, durable change comes from consistent small actions. LSI Micro Actions gives you a handful of
          specific, local tasks each day—some Lakeshore Indivisible (LSI) priorities and some general community
          boosters. When we each take small steps, together we create outsized impact.
        </p>
        <ul className='small'>
          <li>Complete up to <strong>6 actions per day</strong> for Daily Progress. Additional actions still earn XP.</li>
          <li>Prompts grey out after you log them so you can’t double-count the same prompt that day.</li>
          <li>“General” prompts support Sheboygan’s civic health; “LSI” prompts highlight time-sensitive items.</li>
          <li>Streaks, stickers, and a little confetti keep the experience fun and rewarding.</li>
        </ul>
      </div>

      <div className='card' style={{marginTop:12}}>
        <h3>Privacy & Data (Google Play–ready)</h3>
        <p className='small'>
          This app is designed to respect your privacy. We do not collect personally identifiable information.
          You choose a short anonymous ID (auto-generated on first run) stored on your device so your activity
          can be summarized anonymously for scoreboard totals. We store action logs with that anonymous ID and a
          date. LSI-specific prompts are created by LSI admins and downloaded by the app. No contact lists, no
          precise location, no background tracking.
        </p>
        <ul className='small'>
          <li><strong>Data we store:</strong> anonymous ID, action entries (date, description, category, minutes, XP, with/without others).</li>
          <li><strong>Why we store it:</strong> to show your progress, streaks, and aggregate community totals.</li>
          <li><strong>Where data lives:</strong> action entries are saved in our secure database; your anonymous ID is stored locally in your browser/app storage.</li>
          <li><strong>What we don’t do:</strong> no selling data, no third‑party ad SDKs, no reading contacts, no precise location.</li>
          <li><strong>Permissions:</strong> none required beyond normal internet access.</li>
          <li><strong>Deleting your data:</strong> you can delete your recent actions from the app; contact LSI to request broader deletion.</li>
        </ul>
        <p className='small'>
          If you install from Google Play, the same privacy commitments apply. We’ll keep this page updated with any policy changes.
        </p>
      </div>
    </div>
  )
}
