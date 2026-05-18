-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 20260519_create_generations
-- Creates the generations table used by checkRateLimit middleware to enforce
-- the per-user daily generation cap (currently DAILY_LIMIT = 20).
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid,
  created_at timestamptz not null default now()
);

alter table generations enable row level security;

-- Users can read their own generation history (for "X used of 20" UI).
drop policy if exists "Users see own generations" on generations;
create policy "Users see own generations"
  on generations for select
  using (auth.uid() = user_id);

-- The backend uses the service role key for inserts, so RLS only needs to
-- allow inserts at the service-role layer. The `with check (true)` policy
-- below is bypassed by service role JWTs anyway but kept for clarity.
drop policy if exists "Service role can insert" on generations;
create policy "Service role can insert"
  on generations for insert
  with check (true);

-- Covering index for the rate-limit query: count where user_id = X and
-- created_at >= now() - 24h. Descending so recent rows are clustered.
create index if not exists generations_user_created_idx
  on generations(user_id, created_at desc);
