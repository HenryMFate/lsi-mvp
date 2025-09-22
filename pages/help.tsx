
export default function Help(){
  return (
    <div className='container'>
      <h1>How LSI Micro Actions Works</h1>
      <div className='card'>
        <h3>Small steps, big results</h3>
        <p className='small'>
          Real, durable change comes from consistent small actions. LSI Micro Actions gives you a handful of specific, local tasks each day—some Lakeshore Indivisible (LSI) priorities and some general community boosters. When we each take small steps, together we create outsized impact.
        </p>
        <ul className='small'>
          <li>Complete up to <strong>6 actions per day</strong> for Daily Progress. Additional actions still earn XP.</li>
          <li>Prompts grey out after you log them so you can’t double-count the same prompt that day.</li>
          <li>“General” prompts support Sheboygan’s civic health; “LSI” prompts highlight time-sensitive items.</li>
          <li>Streaks, stickers, XP, and a little confetti keep things fun.</li>
        </ul>
      </div>

      <div className='card' style={{marginTop:12}}>
        <h3>Privacy & Data (Google Play–ready)</h3>
        <p className='small'>
          We do not collect personally identifiable information. You get a short anonymous ID, stored on your device, so your activity can be summarized anonymously for scoreboard totals. We store action logs with that anonymous ID and a date. No contact lists, no precise location, no background tracking.
        </p>
        <ul className='small'>
          <li><strong>Data we store:</strong> anonymous ID, action entries (date, description, category, minutes, XP, with/without others).</li>
          <li><strong>Why:</strong> to show your progress, streaks, and aggregate community totals.</li>
          <li><strong>Where:</strong> entries in our secure database; anonymous ID in your local app storage.</li>
          <li><strong>We don’t:</strong> sell data, use third‑party ad SDKs, read contacts, or track precise location.</li>
          <li><strong>Permissions:</strong> none beyond normal internet access.</li>
          <li><strong>Delete:</strong> you can delete recent actions in-app; contact LSI for broader deletion.</li>
        </ul>
      </div>
    </div>
  )
}
