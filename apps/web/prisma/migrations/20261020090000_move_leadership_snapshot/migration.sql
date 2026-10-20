-- Maîtrise transfers now keep a Routier / Pionniere's youth role and add the
-- leadership role to "extra_roles", next to the unit they serve. A move has to
-- record both so reverting a batch can give them back. Older moves never did,
-- hence the flag: a revert only restores these when it is set.

ALTER TABLE "member_move"
    ADD COLUMN IF NOT EXISTS "leadership_snapshot" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "from_extra_roles"    TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "to_extra_roles"      TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "from_serves_unit_id" TEXT,
    ADD COLUMN IF NOT EXISTS "to_serves_unit_id"   TEXT;
