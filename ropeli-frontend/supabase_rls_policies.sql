-- Run these in Supabase SQL Editor to enable delete/update for generated_projects

CREATE POLICY IF NOT EXISTS "Users can delete own generated projects"
  ON generated_projects FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own generated projects"
  ON generated_projects FOR UPDATE USING (auth.uid() = user_id);
