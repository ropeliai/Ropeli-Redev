-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260519_create_build_status
-- Tracks async EAS APK builds. The /api/expo/build endpoint inserts a row
-- here so the /api/expo/build-status/:buildId polling endpoint can do an
-- ownership check (user_id = auth.uid()) before proxying to the EAS API.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists build_status (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references auth.users(id) on delete cascade,
  generated_project_id  uuid,
  build_id              text        not null unique,
  status                text        not null default 'in-progress',  -- 'in-progress' | 'finished' | 'errored'
  platform              text        not null default 'android',
  apk_url               text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table build_status enable row level security;

-- Users can read their own build rows (frontend polls this).
drop policy if exists "Users see own builds" on build_status;
create policy "Users see own builds"
  on build_status for select
  using (auth.uid() = user_id);

-- Backend uses the service role key, which bypasses RLS. The permissive
-- policy here is a fallback so any service-role JWT can manage rows.
drop policy if exists "Service role manages builds" on build_status;
create policy "Service role manages builds"
  on build_status for all
  using (true);

create index if not exists build_status_user_idx     on build_status(user_id);
create index if not exists build_status_build_id_idx on build_status(build_id);

-- Add apk_url to generated_projects so the Builder UI can restore the
-- download link on page revisit by looking up generated_projects.id directly.
alter table generated_projects
  add column if not exists apk_url text;
