-- Link a recruitment submission to the Member created from it.
--
-- Until now "RECRUITED" was only a label: nothing connected an applicant to an
-- actual member in a unit. These columns close the loop so the last step of
-- recruitment is assigning the person to a unit, and so an enrolment can be
-- traced (and undone).

ALTER TABLE "recruitment_submission"
    ADD COLUMN IF NOT EXISTS "member_id"   TEXT,
    ADD COLUMN IF NOT EXISTS "enrolled_at" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "recruitment_submission_member_id_key"
    ON "recruitment_submission" ("member_id");
