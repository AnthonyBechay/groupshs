-- Repair / complete the anciens → members import.
--
-- The previous migration (20260916200000_anciens_are_members) inserted
-- last_name as NULLIF(...), which yields NULL for a one-word ancien name and
-- would violate the NOT NULL constraint. That migration is already pushed, so
-- it cannot be edited — its checksum is recorded — and this follow-up fixes the
-- gap instead.
--
-- Fully idempotent. If the earlier migration already imported everything (which
-- it will have, unless an ancien was stored under a single-word name), the
-- guarded INSERT below matches no rows and this does nothing.

DO $$
DECLARE
    holding_unit_id TEXT;
    pending_count   INTEGER;
BEGIN
    SELECT COUNT(*) INTO pending_count
    FROM "ancien" a
    WHERE a."source_member_id" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "member" m WHERE m."ancien_id" = a."id");

    IF pending_count = 0 THEN
        RETURN;
    END IF;

    SELECT "id" INTO holding_unit_id
    FROM "unit" WHERE "name" = 'Anciens (unit unknown)' LIMIT 1;

    IF holding_unit_id IS NULL THEN
        -- Fixed id rather than gen_random_uuid(), which is only built in from
        -- PostgreSQL 13 and otherwise needs the pgcrypto extension.
        holding_unit_id := '00000000-a9c1-4e00-8000-000000000001';
        INSERT INTO "unit" ("id", "name", "unit_type", "description", "created_at", "updated_at")
        VALUES (
            holding_unit_id,
            'Anciens (unit unknown)',
            'GROUP',
            'Holding unit for former members imported from the old Anciens list, whose original unit was not recorded. Reassign them from the member page.',
            NOW(), NOW()
        )
        ON CONFLICT ("id") DO NOTHING;
    END IF;

    INSERT INTO "member" (
        "id", "first_name", "last_name", "phone", "email", "photo_url",
        "unit_id", "joined_at", "progressions",
        "status", "left_at",
        "bio", "professions", "scout_roles_history", "ancien_sort_order",
        "ancien_id", "created_at", "updated_at"
    )
    SELECT
        -- Reuse the ancien's own uuid: stable, needs no uuid function, and makes
        -- the old → new mapping self-evident.
        a."id",
        -- last_name is NOT NULL, so a single-word name MUST fall back to a
        -- placeholder rather than NULL. This is the bug being repaired.
        COALESCE(NULLIF(btrim(split_part(btrim(a."name"), ' ', 1)), ''), 'Ancien'),
        COALESCE(
            NULLIF(btrim(substr(btrim(a."name"), length(split_part(btrim(a."name"), ' ', 1)) + 1)), ''),
            '-'
        ),
        a."phone", a."email", a."photo_url",
        holding_unit_id,
        COALESCE(make_timestamp(a."joined_year", 9, 1, 0, 0, 0), a."created_at"),
        a."progression",
        'LEFT',
        make_timestamp(COALESCE(a."left_year", EXTRACT(YEAR FROM a."created_at")::INTEGER), 6, 30, 0, 0, 0),
        a."bio", a."professions", a."scout_roles", a."sort_order",
        a."id",
        a."created_at", NOW()
    FROM "ancien" a
    WHERE a."source_member_id" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "member" m WHERE m."ancien_id" = a."id")
    ON CONFLICT ("id") DO NOTHING;
END $$;
