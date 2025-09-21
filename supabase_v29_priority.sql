-- v29: fix org_prompts.priority to text 'low'/'high' and map from integers

begin;

do $$
declare t text;
begin
  select data_type into t
  from information_schema.columns
  where table_schema='public' and table_name='org_prompts' and column_name='priority';

  if t in ('integer','bigint','numeric') then
    alter table public.org_prompts
      alter column priority type text
      using (case when priority::int = 1 then 'high' else 'low' end);
  elsif t <> 'text' then
    alter table public.org_prompts
      alter column priority type text using priority::text;
  end if;
end $$;

-- Optional: constrain allowed values
do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_schema='public' and table_name='org_prompts' and column_name='priority' and constraint_name='org_prompts_priority_check'
  ) then
    alter table public.org_prompts
      add constraint org_prompts_priority_check check (priority in ('low','high'));
  end if;
end $$;

commit;
