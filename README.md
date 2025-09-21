
## v24.3
- Adds `lib/registerSW.ts` and registers a single canonical service worker at `/sw.js`.
- You no longer need to rename SW files each release—just bump the cache string in `public/sw.js`.

## v24.4
- Ensures `lib/supabase.ts` exports `getSupabase()` and all pages use it (`const sb = getSupabase();`).
- Bumped service worker cache to `ma-v24.4` for immediate client updates.

## v25 (full replacement)
- Converts all pages to use `getSupabase()` (no nullable imports).
- Bumps service worker cache to `ma-v25.0` for immediate client refresh.
- Safe to drop in over any previous version >= v13.

## v26 (full baseline)
- Service worker cache bump to `ma-v26.0` for guaranteed refresh.
- Ensures all pages use `getSupabase()` helper.
- Use the provided one-file SQL to initialize/update Supabase schema.


## v28 notes
- Requires SQL v28 to add `target_day` and relax RLS on `daily_zip_aggregates`.
