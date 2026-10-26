-- Activities get sessions. A weekly reunion is one activity repeated every week;
-- each week is a session with its own programme and attendance, and can be
-- cancelled on its own. A one-off activity has exactly one session, so
-- attendance always belongs to a session.
--
-- Existing data: every activity gets one session on its start date, and every
-- attendance row is attached to it. Session ids for these are derived from the
-- activity id (md5 → uuid) so the migration is deterministic and can be re-run
-- without creating duplicates.

ALTER TABLE "activity"
    ADD COLUMN IF NOT EXISTS "recurrence"       TEXT,
    ADD COLUMN IF NOT EXISTS "recurrence_until" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "activity_session" (
    "id"            TEXT         NOT NULL,
    "activity_id"   TEXT         NOT NULL,
    "date"          TIMESTAMP(3) NOT NULL,
    "status"        TEXT         NOT NULL DEFAULT 'SCHEDULED',
    "cancel_reason" TEXT,
    "programme"     JSONB        NOT NULL DEFAULT '[]',
    "notes"         TEXT,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "activity_session_activity_id_date_key"
    ON "activity_session" ("activity_id", "date");
CREATE INDEX IF NOT EXISTS "activity_session_date_idx" ON "activity_session" ("date");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_session_activity_id_fkey') THEN
        ALTER TABLE "activity_session"
            ADD CONSTRAINT "activity_session_activity_id_fkey"
            FOREIGN KEY ("activity_id") REFERENCES "activity"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- One session per existing activity, on its start date.
INSERT INTO "activity_session" ("id", "activity_id", "date")
SELECT md5(a."id" || ':session')::uuid::text, a."id", a."start_date"
FROM "activity" a
WHERE NOT EXISTS (SELECT 1 FROM "activity_session" s WHERE s."activity_id" = a."id")
ON CONFLICT DO NOTHING;

-- Attendance moves onto that session.
ALTER TABLE "activity_attendance" ADD COLUMN IF NOT EXISTS "session_id" TEXT;

UPDATE "activity_attendance" t
SET "session_id" = s."id"
FROM (
    -- The earliest session, should an activity somehow have several already.
    SELECT DISTINCT ON ("activity_id") "id", "activity_id"
    FROM "activity_session"
    ORDER BY "activity_id", "date"
) s
WHERE t."session_id" IS NULL AND s."activity_id" = t."activity_id";

ALTER TABLE "activity_attendance" ALTER COLUMN "session_id" SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'activity_attendance_session_id_fkey') THEN
        ALTER TABLE "activity_attendance"
            ADD CONSTRAINT "activity_attendance_session_id_fkey"
            FOREIGN KEY ("session_id") REFERENCES "activity_session"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- A member has one record per SESSION now, not per activity.
DROP INDEX IF EXISTS "activity_attendance_activity_id_member_id_key";
CREATE UNIQUE INDEX IF NOT EXISTS "activity_attendance_session_id_member_id_key"
    ON "activity_attendance" ("session_id", "member_id");
