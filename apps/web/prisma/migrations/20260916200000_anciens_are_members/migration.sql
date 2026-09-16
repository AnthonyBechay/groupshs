-- Anciens become part of the member system.
--
-- An ancien is not a separate kind of record: it is a former member. Keeping a
-- parallel `ancien` table meant the same person could exist twice, with their
-- file, attendance and move history on one row and their public alumni profile
-- on another, and it forced names to be re-typed by hand.
--
-- From here on, anciens are Members with status = 'LEFT'. The alumni-only
-- presentation fields move onto member.
--
-- The old `ancien` table is deliberately NOT dropped. It is left in place as a
-- verbatim backup of what was imported, so nothing is unrecoverable.

-- ─── Alumni profile fields on member ─────────────────────────────────────────
ALTER TABLE "member"
    ADD COLUMN IF NOT EXISTS "bio"                 TEXT,
    ADD COLUMN IF NOT EXISTS "professions"         JSONB   NOT NULL DEFAULT '[]'::JSONB,
    ADD COLUMN IF NOT EXISTS "scout_roles_history" JSONB   NOT NULL DEFAULT '[]'::JSONB,
    ADD COLUMN IF NOT EXISTS "ancien_sort_order"   INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "hidden_from_anciens" BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 1. Anciens generated from a real member: fold the profile back in ───────
UPDATE "member" m
SET "bio"                 = COALESCE(m."bio", a."bio"),
    "professions"         = a."professions",
    "scout_roles_history" = a."scout_roles",
    "ancien_sort_order"   = a."sort_order"
FROM "ancien" a
WHERE a."source_member_id" = m."id";

-- ─── 2. Hand-entered anciens with no member: import them ─────────────────────
-- member.unit_id is NOT NULL, and a historical ancien's unit is unknown, so
-- they are parked in one clearly-labelled holding unit that an admin can
-- reassign from the member form. Created only if such anciens exist.
DO $$
DECLARE
    holding_unit_id TEXT;
    orphan_count    INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM "ancien" a
    WHERE a."source_member_id" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "member" m WHERE m."ancien_id" = a."id");

    IF orphan_count = 0 THEN
        RETURN;
    END IF;

    SELECT "id" INTO holding_unit_id
    FROM "unit" WHERE "name" = 'Anciens (unit unknown)' LIMIT 1;

    IF holding_unit_id IS NULL THEN
        holding_unit_id := gen_random_uuid()::TEXT;
        INSERT INTO "unit" ("id", "name", "unit_type", "description", "created_at", "updated_at")
        VALUES (
            holding_unit_id,
            'Anciens (unit unknown)',
            'GROUP',
            'Holding unit for former members imported from the old Anciens list, whose original unit was not recorded. Reassign them from the member page.',
            NOW(), NOW()
        );
    END IF;

    INSERT INTO "member" (
        "id", "first_name", "last_name", "phone", "email", "photo_url",
        "unit_id", "joined_at", "progressions",
        "status", "left_at",
        "bio", "professions", "scout_roles_history", "ancien_sort_order",
        "ancien_id", "created_at", "updated_at"
    )
    SELECT
        gen_random_uuid()::TEXT,
        -- "Jean Pierre Khoury" → first name / remainder. A single word keeps a
        -- placeholder surname because last_name is NOT NULL.
        split_part(btrim(a."name"), ' ', 1),
        NULLIF(btrim(substr(btrim(a."name"), length(split_part(btrim(a."name"), ' ', 1)) + 1)), ''),
        a."phone", a."email", a."photo_url",
        holding_unit_id,
        -- joined_year is only a year; 1 September matches the scouting year.
        COALESCE(make_timestamp(a."joined_year", 9, 1, 0, 0, 0), a."created_at"),
        a."progression",
        'LEFT',
        make_timestamp(COALESCE(a."left_year", EXTRACT(YEAR FROM a."created_at")::INTEGER), 6, 30, 0, 0, 0),
        a."bio", a."professions", a."scout_roles", a."sort_order",
        a."id",
        a."created_at", NOW()
    FROM "ancien" a
    WHERE a."source_member_id" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "member" m WHERE m."ancien_id" = a."id");

    -- last_name is NOT NULL; single-word names left it empty above.
    UPDATE "member" SET "last_name" = '-' WHERE "last_name" IS NULL OR btrim("last_name") = '';
END $$;

CREATE INDEX IF NOT EXISTS "member_ancien_sort_order_idx"
    ON "member" ("ancien_sort_order");
