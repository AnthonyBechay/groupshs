-- Girls branches, gender fields, the age-based transition engine,
-- maitrise transfers, and the member departure ("became an ancien") flow.

-- ─── Gender ──────────────────────────────────────────────────────────────────
ALTER TABLE "recruitment_submission"
    ADD COLUMN IF NOT EXISTS "gender" TEXT;

ALTER TABLE "member"
    ADD COLUMN IF NOT EXISTS "gender" TEXT;

-- ─── Transition settings (singleton site_settings row) ───────────────────────
-- Boys' and girls' tracks each get their own configurable thresholds.
ALTER TABLE "site_settings"
    ADD COLUMN IF NOT EXISTS "fiscal_year_start_month"         INTEGER NOT NULL DEFAULT 9,
    ADD COLUMN IF NOT EXISTS "age_louveteaux_to_eclaireurs"    INTEGER NOT NULL DEFAULT 12,
    ADD COLUMN IF NOT EXISTS "age_eclaireurs_to_routiers"      INTEGER NOT NULL DEFAULT 17,
    ADD COLUMN IF NOT EXISTS "age_louvettes_to_eclaireuses"    INTEGER NOT NULL DEFAULT 12,
    ADD COLUMN IF NOT EXISTS "age_eclaireuses_to_pionnieres"   INTEGER NOT NULL DEFAULT 17;

-- ─── Batch tracking on member moves (enables batch revert) ───────────────────
ALTER TABLE "member_move"
    ADD COLUMN IF NOT EXISTS "batch_id"     TEXT,
    ADD COLUMN IF NOT EXISTS "batch_label"  TEXT,
    ADD COLUMN IF NOT EXISTS "reverted_at"  TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "reverted_by"  TEXT;

CREATE INDEX IF NOT EXISTS "member_move_batch_id_idx" ON "member_move" ("batch_id");

-- ─── Member lifecycle: leaving the group ─────────────────────────────────────
-- Members are never hard deleted on departure; they are marked LEFT and
-- mirrored into an `ancien` row.
ALTER TABLE "member"
    ADD COLUMN IF NOT EXISTS "status"    TEXT NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS "left_at"   TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "left_note" TEXT,
    ADD COLUMN IF NOT EXISTS "ancien_id" TEXT;

CREATE INDEX IF NOT EXISTS "member_status_idx" ON "member" ("status");

-- Back-link so a departure can be reverted.
ALTER TABLE "ancien"
    ADD COLUMN IF NOT EXISTS "source_member_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ancien_source_member_id_key"
    ON "ancien" ("source_member_id");
