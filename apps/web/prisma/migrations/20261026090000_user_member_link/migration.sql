-- An admin account can be linked to the member it belongs to, so the app knows
-- that this user IS the CM of the Meute and can offer a "My unit" view.
-- Optional: existing accounts stay unlinked and keep working as before.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "member_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "user_member_id_key" ON "user" ("member_id");

-- Deleting the member must not delete the account, only unlink it.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_member_id_fkey') THEN
        ALTER TABLE "user"
            ADD CONSTRAINT "user_member_id_fkey"
            FOREIGN KEY ("member_id") REFERENCES "member"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
