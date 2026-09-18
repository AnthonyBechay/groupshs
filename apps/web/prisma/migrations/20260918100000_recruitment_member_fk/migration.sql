-- Make recruitment_submission.member_id a real foreign key.
--
-- It was a plain text column, so deleting a member left the application still
-- pointing at the old id. "Open member" then 404'd, and the application kept
-- claiming the applicant was enrolled when their record was gone.
--
-- ON DELETE SET NULL: removing a member simply un-links the application rather
-- than deleting the applicant's history.

-- Clear any dangling references first, or adding the constraint fails.
UPDATE "recruitment_submission" s
SET "member_id" = NULL, "enrolled_at" = NULL,
    "status" = CASE WHEN s."status" = 'RECRUITED' THEN 'CONTACTED' ELSE s."status" END
WHERE s."member_id" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "member" m WHERE m."id" = s."member_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'recruitment_submission_member_id_fkey'
    ) THEN
        ALTER TABLE "recruitment_submission"
            ADD CONSTRAINT "recruitment_submission_member_id_fkey"
            FOREIGN KEY ("member_id") REFERENCES "member"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
