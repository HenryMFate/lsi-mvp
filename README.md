# LSI Micro Actions — Full Build v14

## Highlights
- 1 **Lakeshore Indivisible Immediate Action** + **3 general prompts** per day  
  (configurable: `NEXT_PUBLIC_GEN_COUNT` = `2` or `3`, default `3`)
- **Different per user/day**, avoids repeats (14‑day lookback)
- **Auto-regenerate** if stored set smaller than requested (handles prompt-count changes)
- **Recent Actions** shows **last 10** at bottom
- **Admin page** (`/admin`) to add/edit/delete org prompts (password with `NEXT_PUBLIC_ADMIN_PASS`)
- **Daily Complete** modal with confetti + sound + share button
- **Streak awards**: first time you beat your best; then only at **multiples of 10**
- **HouseBlocks** progress visual
- PWA icons, manifest, **service worker v14**

## Deploy (Vercel)
1. Upload this folder to a GitHub repo and import to Vercel as a Next.js app.
2. Environment Variables (Production):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_PASS` (for /admin)
   - *(optional)* `NEXT_PUBLIC_GEN_COUNT` = `2` or `3`
3. Deploy, then open:
   ```
   https://YOUR-URL/?v=14
   ```

## Supabase SQL (run once)
```sql
create table if not exists public.org_prompts (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  link text,
  category text,
  active boolean not null default true,
  start_date date,
  end_date date,
  priority int default 0
);

create table if not exists public.general_prompts (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  link text,
  category text,
  weight int default 1
);

create table if not exists public.user_daily_prompts (
  day date not null,
  anon_id text not null,
  prompts jsonb not null,
  primary key (day, anon_id)
);

alter table public.org_prompts enable row level security;
alter table public.general_prompts enable row level security;
alter table public.user_daily_prompts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='org_prompts' and policyname='org_read') then
    create policy "org_read" on public.org_prompts for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='general_prompts' and policyname='general_read') then
    create policy "general_read" on public.general_prompts for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='user_daily_prompts' and policyname='udp_select') then
    create policy "udp_select" on public.user_daily_prompts for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='user_daily_prompts' and policyname='udp_upsert') then
    create policy "udp_upsert" on public.user_daily_prompts for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='org_prompts' and policyname='org_insert') then
    create policy "org_insert" on public.org_prompts for insert with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='org_prompts' and policyname='org_update') then
    create policy "org_update" on public.org_prompts for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='org_prompts' and policyname='org_delete') then
    create policy "org_delete" on public.org_prompts for delete using (true);
  end if;
end $$;
```
