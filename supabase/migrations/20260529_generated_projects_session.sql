-- Session persistence columns for generated_projects.

alter table generated_projects
  add column if not exists session_state jsonb,
  add column if not exists updated_at timestamptz default now(),
  add column if not exists prompt text;
