
## v24.3
- Adds `lib/registerSW.ts` and registers a single canonical service worker at `/sw.js`.
- You no longer need to rename SW files each release—just bump the cache string in `public/sw.js`.

## v24.4
- Ensures `lib/supabase.ts` exports `getSupabase()` and all pages use it (`const sb = getSupabase();`).
- Bumped service worker cache to `ma-v24.4` for immediate client updates.
