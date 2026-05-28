-- Add missing "type" column to history_milestone
-- (the original migration was recorded as applied before this column was included)
ALTER TABLE "history_milestone" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'milestone';
