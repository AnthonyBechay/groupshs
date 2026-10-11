-- Circulars: letters to parents generated from an activity.
--
-- Purely additive and safe to re-run: every statement is guarded, no existing
-- row is rewritten, and every new column is nullable.

ALTER TABLE "activity" ADD COLUMN IF NOT EXISTS "theme" TEXT;
ALTER TABLE "activity" ADD COLUMN IF NOT EXISTS "fee" TEXT;

ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "association_logo_url" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "circular_stamp_url" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "circular_group_name" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "circular_city" TEXT;
ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "circular_motto" TEXT;

CREATE TABLE IF NOT EXISTS "circular" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "scout_year" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "reference_override" TEXT,
    "template" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "circular_pkey" PRIMARY KEY ("id")
);

-- The reference number is shared by the whole group within a scout year.
CREATE UNIQUE INDEX IF NOT EXISTS "circular_scout_year_seq_key" ON "circular"("scout_year", "seq");
CREATE INDEX IF NOT EXISTS "circular_activity_id_idx" ON "circular"("activity_id");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'circular_activity_id_fkey') THEN
        ALTER TABLE "circular"
            ADD CONSTRAINT "circular_activity_id_fkey"
            FOREIGN KEY ("activity_id") REFERENCES "activity"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
