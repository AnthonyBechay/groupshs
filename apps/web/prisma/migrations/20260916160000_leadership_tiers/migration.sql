-- The two tiers of leadership, and concurrent roles.
--
-- UNIT MAITRISE (CT, ACT, CM, ACM, CC, ACC, CE) run a younger unit but remain
-- members of the Routiers / Pionnieres branch: a Cheftaine Meute is a Pionniere
-- who serves the Meute. Their home unit stays in "unit_id"; the unit they run
-- goes in the new "serves_unit_id".
--
-- THE CONSEIL (CG, ACG, EA, TR, SE, AU) are the leaders of leaders, sitting at
-- group level rather than in a branch. That is a convention enforced in the UI
-- as a warning, not a database constraint, because the group makes exceptions.
--
-- Exceptions also mean one person can hold several roles at once (CM *and*
-- ACG), so "extra_roles" carries any concurrent roles beyond the primary one.

ALTER TABLE "member"
    ADD COLUMN IF NOT EXISTS "extra_roles"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    ADD COLUMN IF NOT EXISTS "serves_unit_id"  TEXT;

CREATE INDEX IF NOT EXISTS "member_serves_unit_id_idx" ON "member" ("serves_unit_id");

-- Detaching the served unit must not delete the leader.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'member_serves_unit_id_fkey'
    ) THEN
        ALTER TABLE "member"
            ADD CONSTRAINT "member_serves_unit_id_fkey"
            FOREIGN KEY ("serves_unit_id") REFERENCES "unit"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
