
## v23.3.2
- 2 LSI (with **pending** high-priority items shown up to 3 days ahead; not tappable until the target day). Lows fill any remaining slots.
- 3 General, including **letter-writing links** for WI/US reps.
- Shows XP policy (LSI +20, General +10) in the header.
- Inline **Log** expander per prompt (minutes, date, with others). No auto-fill.
- **Log Your Own Action** (same XP as general) with anti-spam checks.
- Confirm before delete; totals adjust after delete.
- Seed page `/seed` (admin pass) to auto-create a default weekly challenge if none exists.

### One-time SQL (paste all at once)
-- Core tables (if you skipped earlier)
create table if not exists public.org_prompts (
  id bigserial primary key,
  text text not null,
  priority text not null default 'low',
  target_day date
);
create table if not exists public.actions (
  id bigserial primary key,
  anon_id text not null,
  date date not null,
  category text,
  description text,
  minutes int,
  with_friend boolean default false,
  xp int default 10
);

create table if not exists public.stickers (
  id bigserial primary key,
  user_id text not null,
  sticker_name text not null,
  unlocked_at timestamptz default now(),
  unique (user_id, sticker_name)
);

create table if not exists public.achievements (
  id bigserial primary key,
  user_id text not null,
  achievement_name text not null,
  unlocked_at timestamptz default now(),
  unique (user_id, achievement_name)
);

create table if not exists public.weekly_challenges (
  id bigserial primary key,
  week_start date not null,
  title text not null,
  target_count int not null default 5,
  category text check (category in ('civic','mutual_aid','environment','bridging','reflection','any')) default 'any',
  active boolean not null default true,
  created_at timestamptz default now()
);
create unique index if not exists weekly_challenges_week_start_idx on public.weekly_challenges (week_start);

create table if not exists public.weekly_completions (
  id bigserial primary key,
  anon_id text not null,
  week_start date not null,
  completed_at timestamptz default now(),
  unique (anon_id, week_start)
);

-- RLS (prototype) and policies
alter table public.actions enable row level security;
alter table public.org_prompts enable row level security;
alter table public.stickers enable row level security;
alter table public.achievements enable row level security;
alter table public.weekly_challenges enable row level security;
alter table public.weekly_completions enable row level security;

create policy if not exists sel_actions on public.actions for select using (true);
create policy if not exists ins_actions on public.actions for insert with check (true);
create policy if not exists del_actions on public.actions for delete using (true);

create policy if not exists sel_org on public.org_prompts for select using (true);

create policy if not exists sel_stickers on public.stickers for select using (true);
create policy if not exists ins_stickers on public.stickers for insert with check (true);

create policy if not exists sel_ach on public.achievements for select using (true);
create policy if not exists ins_ach on public.achievements for insert with check (true);

create policy if not exists sel_weekly_challenges on public.weekly_challenges for select using (true);
create policy if not exists sel_weekly_completions on public.weekly_completions for select using (true);
create policy if not exists ins_weekly_completions on public.weekly_completions for insert with check (true);

-- Helpers & views
create or replace function public.iso_week_start(ts timestamptz)
returns date language sql immutable as $$ select date_trunc('week', ts::timestamp)::date $$;

create or replace view public.community_totals_daily as
select date::date as day, count(*) as actions, sum(coalesce(xp,0)) as xp
from public.actions group by 1 order by 1 desc;

create or replace view public.community_totals_weekly as
select iso_week_start(date::timestamptz) as week_start, count(*) as actions, sum(coalesce(xp,0)) as xp
from public.actions group by 1 order by 1 desc;

create or replace view public.user_week_progress as
with active as (
  select * from public.weekly_challenges where active = true order by week_start desc limit 1
)
select
  a.anon_id, awc.week_start, awc.title, awc.target_count, awc.category,
  count(*) filter (
    where (awc.category = 'any' or a.category = awc.category)
      and a.date >= awc.week_start
      and a.date <  awc.week_start + interval '7 day'
  ) as progress
from public.actions a
cross join active awc
group by 1,2,3,4,5
order by progress desc;

-- Seed a default weekly challenge for the current week if none exists
insert into public.weekly_challenges (week_start, title, target_count, category, active)
select date_trunc('week', now())::date, 'Complete 5 civic actions', 5, 'civic', true
where not exists (select 1 from public.weekly_challenges where active = true);

## v24
- 3 Lakeshore Indivisible prompts per day.
- High-priority LSI prompts show as **Pending** up to a configurable number of days before their target date (default 7). Change in `/admin`.
- 3 General prompts including letter-writing links (WI/US reps).
- Inline expander on each prompt to log (minutes/date/with others).
- "Log Your Own Action" hardened: min 15 chars, banned keywords, 20s cooldown, and DB-enforced **3/day** cap.
- Service worker v24 for auto-updates.
