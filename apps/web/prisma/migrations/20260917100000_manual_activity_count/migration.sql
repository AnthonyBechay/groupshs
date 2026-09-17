-- Manual override for the "Activities" figure on the landing page.
--
-- Units and members could already be overridden from Settings; activities could
-- not, so the landing page showed whatever was counted (often 0) with no way to
-- change it. NULL means "use the computed count".

ALTER TABLE "site_settings"
    ADD COLUMN IF NOT EXISTS "manual_activity_count" INTEGER;
