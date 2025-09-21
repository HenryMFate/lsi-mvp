-- v27.3 delta — fix anon_id type with dependent views safely

begin;

-- Drop dependent views if they exist
drop view if exists public.user_week_progress;
drop view if exists public.community_totals_weekly;
drop view if exists public.community_totals_daily;

-- Alter anon_id to text only if currently uuid
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='actions'
      and column_name='anon_id' and data_type='uuid'
  ) then
    alter table public.actions alter column anon_id type text using anon_id::text;
  end if;
end $$;

-- Recreate views
create or replace function public.iso_week_start(ts timestamptz)
returns date language sql immutable as $$
  select date_trunc('week', ts::timestamp)::date
$$;

create or replace view public.community_totals_daily as
select date::date as day,
       count(*) as actions,
       sum(coalesce(xp,0)) as xp
from public.actions
group by 1
order by 1 desc;

create or replace view public.community_totals_weekly as
select iso_week_start(date::timestamptz) as week_start,
       count(*) as actions,
       sum(coalesce(xp,0)) as xp
from public.actions
group by 1
order by 1 desc;

create or replace view public.user_week_progress as
with active as (
  select *
  from public.weekly_challenges
  where active = true
  order by week_start desc
  limit 1
)
select
  a.anon_id,
  awc.week_start,
  awc.title,
  awc.target_count,
  awc.category,
  count(*) filter (
    where (awc.category = 'any' or a.category = awc.category)
      and a.date >= awc.week_start
      and a.date <  awc.week_start + interval '7 day'
  ) as progress
from public.actions a
cross join active awc
group by 1,2,3,4,5
order by progress desc;

commit;
