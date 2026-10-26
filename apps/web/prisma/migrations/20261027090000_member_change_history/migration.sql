-- A history of edits to a member's file: one row per changed field, whether a
-- leader made it or it came from a family's update link. New table only.

CREATE TABLE IF NOT EXISTS "member_change" (
    "id"              TEXT         NOT NULL,
    "member_id"       TEXT         NOT NULL,
    "field"           TEXT         NOT NULL,
    "old_value"       TEXT,
    "new_value"       TEXT,
    "source"          TEXT         NOT NULL DEFAULT 'ADMIN',
    "changed_by_id"   TEXT,
    "changed_by_name" TEXT,
    "request_id"      TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_change_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "member_change_member_id_created_at_idx" ON "member_change" ("member_id", "created_at");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'member_change_member_id_fkey') THEN
        ALTER TABLE "member_change"
            ADD CONSTRAINT "member_change_member_id_fkey"
            FOREIGN KEY ("member_id") REFERENCES "member"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
