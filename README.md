# Micro-Actions — Next.js PWA (Installable) + Optional Supabase Scoreboard

## Local
```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy to Vercel (quick)
1. Push this folder to GitHub.
2. In Vercel: New Project → Import repo → Deploy (Framework: Next.js).
3. On phone: open your URL → Add to Home Screen (PWA).

## Optional: Cloud sync + Public scoreboard
Set env vars in Vercel (Project → Settings → Environment Variables):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Create tables in Supabase (SQL Editor):
```sql
create table if not exists public.actions (
  id uuid primary key,
  anon_id uuid not null,
  date date not null,
  category text not null check (category in ('civic','mutual_aid','environment','bridging','reflection')),
  description text,
  minutes integer check (minutes >= 1),
  with_friend boolean default false,
  zip text,
  created_at timestamptz default now()
);

create table if not exists public.daily_zip_aggregates (
  day date not null,
  zip text not null,
  actions_count integer not null default 0,
  minutes_sum integer not null default 0,
  primary key (day, zip)
);

alter table public.actions enable row level security;
alter table public.daily_zip_aggregates enable row level security;

create policy if not exists "read_aggregates" on public.daily_zip_aggregates for select using (true);
create policy if not exists "insert_actions" on public.actions for insert with check (true);
create policy if not exists "select_actions" on public.actions for select using (true);
```

Nightly aggregation (Scheduled job in Supabase):
```sql
insert into public.daily_zip_aggregates (day, zip, actions_count, minutes_sum)
select a.date as day, coalesce(a.zip,'00000') as zip,
       count(*) as actions_count,
       coalesce(sum(a.minutes),0) as minutes_sum
from public.actions a
where a.date = (current_date - interval '1 day')::date
group by a.date, coalesce(a.zip,'00000')
on conflict (day, zip) do update
set actions_count = excluded.actions_count,
    minutes_sum = excluded.minutes_sum;
```