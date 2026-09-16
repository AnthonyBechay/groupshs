-- Indexes for the recruitment list.
--
-- The admin page reads applications newest-first and usually narrowed by
-- status. At today's volumes a sequential scan is fine, but applications only
-- accumulate, so index the two access patterns now while the table is small.

CREATE INDEX IF NOT EXISTS "recruitment_submission_status_created_at_idx"
    ON "recruitment_submission" ("status", "created_at");

CREATE INDEX IF NOT EXISTS "recruitment_submission_created_at_idx"
    ON "recruitment_submission" ("created_at");
