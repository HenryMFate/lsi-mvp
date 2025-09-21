-- v27.5 delta — robust id defaults for actions/org_prompts depending on column type

begin;

-- actions.id: if uuid -> use gen_random_uuid(); if int/bigint -> sequence + default
do $$
declare
  t text;
begin
  select data_type into t
  from information_schema.columns
  where table_schema='public' and table_name='actions' and column_name='id';

  if t = 'uuid' then
    -- ensure pgcrypto or pgcrypto-like function available; in Supabase, use gen_random_uuid()
    alter table public.actions alter column id set default gen_random_uuid();
  elsif t in ('integer','bigint') then
    if not exists (select 1 from pg_class where relname = 'actions_id_seq') then
      create sequence actions_id_seq;
    end if;
    perform setval('actions_id_seq', coalesce((select max(id)::bigint from public.actions), 0));
    alter table public.actions alter column id set default nextval('actions_id_seq');
  end if;
end $$;

-- org_prompts.id: prefer int/bigint with sequence
do $$
declare
  t text;
begin
  select data_type into t
  from information_schema.columns
  where table_schema='public' and table_name='org_prompts' and column_name='id';

  if t in ('integer','bigint') then
    if not exists (select 1 from pg_class where relname = 'org_prompts_id_seq') then
      create sequence org_prompts_id_seq;
    end if;
    perform setval('org_prompts_id_seq', coalesce((select max(id)::bigint from public.org_prompts), 0));
    alter table public.org_prompts alter column id set default nextval('org_prompts_id_seq');
  elsif t = 'uuid' then
    alter table public.org_prompts alter column id set default gen_random_uuid();
  end if;
end $$;

-- Ensure per-task lead_days column exists
alter table public.org_prompts add column if not exists lead_days int;

-- RLS policies to allow admin CRUD
drop policy if exists sel_org on public.org_prompts;
drop policy if exists ins_org on public.org_prompts;
drop policy if exists upd_org on public.org_prompts;
drop policy if exists del_org on public.org_prompts;
create policy sel_org on public.org_prompts for select using (true);
create policy ins_org on public.org_prompts for insert with check (true);
create policy upd_org on public.org_prompts for update using (true);
create policy del_org on public.org_prompts for delete using (true);

commit;
