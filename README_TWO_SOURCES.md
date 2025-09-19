# Two Prompt Sources + Per-User Randomization + UI Grouping + Local Notifications

## Supabase SQL

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
end $$;
```


## Admin Page (/admin)

Set an admin password in Vercel/Supabase env vars (Production):
- `NEXT_PUBLIC_ADMIN_PASS` = your strong shared password (note: this is a *basic* gate; for real auth, add proper login)

Then visit `/admin`, enter the password, and you can:
- Add a new Lakeshore Indivisible immediate action (text, link, category, start/end dates, priority, active)
- Edit, save, or delete existing items
- Click **Refresh** to reload from Supabase

### Additional RLS for updates/deletes
If you locked tables earlier, ensure these are present (Supabase SQL Editor):

```sql
do $$ begin
  if not exists (select 1 from pg_policies where tablename='org_prompts' and policyname='org_update') then
    create policy "org_update" on public.org_prompts for update using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='org_prompts' and policyname='org_delete') then
    create policy "org_delete" on public.org_prompts for delete using (true);
  end if;
end $$;
```
