-- v27.4 delta — fix NOT NULL id insert errors, enable admin inserts, remove global lead-days reliance

begin;

-- Ensure id columns auto-increment (sequences + defaults)
do $$
begin
  if not exists (select 1 from pg_class where relname = 'actions_id_seq') then
    create sequence actions_id_seq;
  end if;
  perform setval('actions_id_seq', coalesce((select max(id) from public.actions), 0));
  alter table public.actions alter column id set default nextval('actions_id_seq');
exception when undefined_table then
  -- actions table may not exist yet
  null;
end $$;

do $$
begin
  if not exists (select 1 from pg_class where relname = 'org_prompts_id_seq') then
    create sequence org_prompts_id_seq;
  end if;
  perform setval('org_prompts_id_seq', coalesce((select max(id) from public.org_prompts), 0));
  alter table public.org_prompts alter column id set default nextval('org_prompts_id_seq');
exception when undefined_table then
  null;
end $$;

-- Ensure per-task lead_days column exists
alter table public.org_prompts add column if not exists lead_days int;

-- RLS policies to allow admin inserts/updates/deletes (public anon model)
drop policy if exists sel_org on public.org_prompts;
drop policy if exists ins_org on public.org_prompts;
drop policy if exists upd_org on public.org_prompts;
drop policy if exists del_org on public.org_prompts;
create policy sel_org on public.org_prompts for select using (true);
create policy ins_org on public.org_prompts for insert with check (true);
create policy upd_org on public.org_prompts for update using (true);
create policy del_org on public.org_prompts for delete using (true);

commit;
