-- Separate permission for the Transitions area (Move Up / Maîtrise / Leaving).
--
-- Promoting a whole branch, reassigning the maîtrise or recording a departure
-- are group-level decisions, so they should not come free with the everyday
-- "manage members" permission.
--
-- Defaults to FALSE: existing admins lose nothing they could meaningfully do
-- before (the area is new), and access is granted deliberately per user.
-- Super admins bypass every permission check, so they keep access.

ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS "can_manage_transitions" BOOLEAN NOT NULL DEFAULT FALSE;
