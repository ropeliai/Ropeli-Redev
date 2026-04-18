-- Run this in Supabase Dashboard > SQL Editor

-- Table: generated_projects
CREATE TABLE generated_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  files JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for listing by user
CREATE INDEX idx_generated_projects_user_id ON generated_projects(user_id);
CREATE INDEX idx_generated_projects_created_at ON generated_projects(created_at DESC);

-- RLS: users can only read/insert their own rows
ALTER TABLE generated_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated projects"
  ON generated_projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated projects"
  ON generated_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);
