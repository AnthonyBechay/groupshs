-- Links sent to families to fill in a member's file (contacts, doctor, medical).
-- A submission is a proposal only; a leader reviews and applies it.

CREATE TABLE IF NOT EXISTS "member_update_request" (
    "id"               TEXT         NOT NULL,
    "member_id"        TEXT         NOT NULL,
    "token"            TEXT         NOT NULL,
    "status"           TEXT         NOT NULL DEFAULT 'OPEN',
    "expires_at"       TIMESTAMP(3) NOT NULL,
    "sent_to"          TEXT,
    "created_by_id"    TEXT,
    "created_by_name"  TEXT,
    "opened_at"        TIMESTAMP(3),
    "submitted_at"     TIMESTAMP(3),
    "submitted_by"     TEXT,
    "changes"          JSONB        NOT NULL DEFAULT '{}',
    "reviewed_by_id"   TEXT,
    "reviewed_by_name" TEXT,
    "reviewed_at"      TIMESTAMP(3),
    "review_note"      TEXT,
    "applied_fields"   TEXT[]       NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_update_request_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "member_update_request_token_key" ON "member_update_request" ("token");
CREATE INDEX IF NOT EXISTS "member_update_request_member_id_idx" ON "member_update_request" ("member_id");
CREATE INDEX IF NOT EXISTS "member_update_request_status_idx" ON "member_update_request" ("status");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'member_update_request_member_id_fkey') THEN
        ALTER TABLE "member_update_request"
            ADD CONSTRAINT "member_update_request_member_id_fkey"
            FOREIGN KEY ("member_id") REFERENCES "member"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
