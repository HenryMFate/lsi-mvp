# LSI Micro Actions (Full ZIP v13)

## What’s in this build
- 1 **Lakeshore Indivisible Immediate Action** + **2–3 general prompts** per day (configurable)
- Different set per user/day, no repeats for 14 days, stable via Supabase `user_daily_prompts`
- Recent actions shows **last 10** at bottom
- **Admin page** at `/admin` (password via `NEXT_PUBLIC_ADMIN_PASS`) to add/edit/delete org prompts
- Local notification option (7pm) without Firebase
- Service worker v13 for cache busting

## Deploy (Vercel)
1. Create a new GitHub repo and upload these files, or replace your existing repo and commit.
2. In Vercel → **New Project** (or existing) → set **Framework = Next.js**.
3. Environment Variables (Production):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_PASS` (for /admin page)
   - *(optional)* `NEXT_PUBLIC_GEN_COUNT` = `2` or `3` (defaults to 3)
4. Deploy. After deploy, visit: `https://your-url/?v=13`

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

## Admin
- Go to `https://your-url/admin`
- Enter password from `NEXT_PUBLIC_ADMIN_PASS`
- Add/edit/delete org prompts. **Active + date range** control visibility.

## Icons
Place your final icons at `public/icon-192.png` and `public/icon-512.png` (already included).

## Cache busting
Service worker version is set to `ma-v13`. After deploy, open:
```
https://your-url/?v=13
```
