-- v27 delta: per-task lead days
alter table public.org_prompts add column if not exists lead_days int;
