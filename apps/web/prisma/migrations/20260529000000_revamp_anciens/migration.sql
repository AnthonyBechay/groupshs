-- AlterTable: replace lastRole/yearsActive with richer structured fields

ALTER TABLE "ancien"
    ADD COLUMN IF NOT EXISTS "joined_year"  INTEGER,
    ADD COLUMN IF NOT EXISTS "left_year"    INTEGER,
    ADD COLUMN IF NOT EXISTS "progression"  TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "scout_roles"  JSONB   NOT NULL DEFAULT '[]'::JSONB,
    ADD COLUMN IF NOT EXISTS "professions"  JSONB   NOT NULL DEFAULT '[]'::JSONB,
    ADD COLUMN IF NOT EXISTS "phone"        TEXT,
    ADD COLUMN IF NOT EXISTS "email"        TEXT;

-- Drop the old single-string columns (data loss intentional — migration to new structure)
ALTER TABLE "ancien"
    DROP COLUMN IF EXISTS "last_role",
    DROP COLUMN IF EXISTS "years_active";
