-- Give the two "not really a unit" units a type of their own.
--
-- Until now they were ordinary GROUP units, so every list treated them as real:
-- the holding unit for former members showed up as a tab on the Members page
-- AND on the public Activities page, and "All Units" (which only exists so a
-- group-wide activity has something to belong to) appeared as an empty roster.
--
--   ARCHIVE  former members whose original unit is unknown — hidden everywhere
--   ALL      the audience for group-wide activities — never holds members
--
-- Every statement is guarded so that a unit in real use is never touched, and
-- the whole thing is a no-op on a database that has none of these units.

-- ─── 1. Former-member holding units → ARCHIVE ────────────────────────────────
-- Matched by the two names actually in use: the one a previous migration
-- created, and one that was added by hand. Skipped if the unit has any active
-- member or any activity, i.e. if it is being used as a real unit.
UPDATE "unit" u
SET "unit_type" = 'ARCHIVE'
WHERE u."unit_type" = 'GROUP'
  AND lower(btrim(u."name")) IN ('anciens', 'anciens (unit unknown)')
  AND NOT EXISTS (
        SELECT 1 FROM "member" m
        WHERE m."unit_id" = u."id" AND m."status" = 'ACTIVE')
  AND NOT EXISTS (
        SELECT 1 FROM "activity" a WHERE a."unit_id" = u."id");

-- ─── 2. Merge duplicate archive units into one ───────────────────────────────
DO $$
DECLARE
    canonical TEXT;
BEGIN
    -- Keep the system-created one if present, otherwise the oldest.
    SELECT "id" INTO canonical
    FROM "unit"
    WHERE "unit_type" = 'ARCHIVE'
    ORDER BY (lower(btrim("name")) = 'anciens (unit unknown)') DESC, "created_at" ASC, "id" ASC
    LIMIT 1;

    IF canonical IS NULL THEN
        RETURN;
    END IF;

    -- Sub-groups of the duplicates are about to be deleted with them.
    UPDATE "member"
    SET "subgroup_id" = NULL
    WHERE "unit_id" IN (SELECT "id" FROM "unit" WHERE "unit_type" = 'ARCHIVE' AND "id" <> canonical);

    UPDATE "member"
    SET "unit_id" = canonical
    WHERE "unit_id" IN (SELECT "id" FROM "unit" WHERE "unit_type" = 'ARCHIVE' AND "id" <> canonical);

    -- member_move stores unit ids as plain text (no foreign key), so repoint
    -- them by hand or the move history would reference a unit that is gone.
    UPDATE "member_move"
    SET "from_unit_id" = canonical
    WHERE "from_unit_id" IN (SELECT "id" FROM "unit" WHERE "unit_type" = 'ARCHIVE' AND "id" <> canonical);

    UPDATE "member_move"
    SET "to_unit_id" = canonical
    WHERE "to_unit_id" IN (SELECT "id" FROM "unit" WHERE "unit_type" = 'ARCHIVE' AND "id" <> canonical);

    -- Nothing references the duplicates any more (they had no activities by the
    -- guard in step 1; contacts and sub-groups cascade).
    DELETE FROM "unit"
    WHERE "unit_type" = 'ARCHIVE' AND "id" <> canonical;

    UPDATE "unit"
    SET "name" = 'Anciens',
        "description" = 'System unit: holds former members whose original unit was not recorded. Hidden from every list.'
    WHERE "id" = canonical;
END $$;

-- ─── 3. The group-wide audience unit → ALL ───────────────────────────────────
-- Only when nobody active belongs to it; a unit with a real roster stays GROUP.
UPDATE "unit" u
SET "unit_type" = 'ALL'
WHERE u."unit_type" = 'GROUP'
  AND lower(btrim(u."name")) = 'all units'
  AND NOT EXISTS (
        SELECT 1 FROM "member" m
        WHERE m."unit_id" = u."id" AND m."status" = 'ACTIVE');
