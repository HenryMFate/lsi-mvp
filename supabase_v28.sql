-- v28 SQL: add target_day; fix RLS for daily_zip_aggregates; keep per-prompt lead_days and org_prompts CRUD

begin;

-- Ensure target_day exists on org_prompts
alter table public.org_prompts add column if not exists target_day date;
alter table public.org_prompts add column if not exists lead_days int;

-- Open RLS for org_prompts (admin UI runs as anon, client-side)
drop policy if exists sel_org on public.org_prompts;
drop policy if exists ins_org on public.org_prompts;
drop policy if exists upd_org on public.org_prompts;
drop policy if exists del_org on public.org_prompts;
create policy sel_org on public.org_prompts for select using (true);
create policy ins_org on public.org_prompts for insert with check (true);
create policy upd_org on public.org_prompts for update using (true);
create policy del_org on public.org_prompts for delete using (true);

-- Relax RLS for daily_zip_aggregates so inserts from triggers/client are allowed
-- (If you maintain this table via trigger from actions, the trigger role is postgres and bypasses RLS.
--  If you write to it directly from the client, you need permissive policies.)
alter table public.daily_zip_aggregates enable row level security;
drop policy if exists sel_dza on public.daily_zip_aggregates;
drop policy if exists ins_dza on public.daily_zip_aggregates;
drop policy if exists upd_dza on public.daily_zip_aggregates;

create policy sel_dza on public.daily_zip_aggregates for select using (true);
create policy ins_dza on public.daily_zip_aggregates for insert with check (true);
create policy upd_dza on public.daily_zip_aggregates for update using (true);

-- If actions.id is uuid, ensure default exists; if int/bigint ensure sequence default
do $$
declare t text;
begin
  select data_type into t from information_schema.columns
    where table_schema='public' and table_name='actions' and column_name='id';
  if t = 'uuid' then
    create extension if not exists pgcrypto with schema public;
    alter table public.actions alter column id set default gen_random_uuid();
  elsif t in ('integer','bigint') then
    if not exists (select 1 from pg_class where relname = 'actions_id_seq') then
      create sequence actions_id_seq;
    end if;
    perform setval('actions_id_seq', coalesce((select max(id)::bigint from public.actions), 0));
    alter table public.actions alter column id set default nextval('actions_id_seq');
  end if;
end $$;

commit;
