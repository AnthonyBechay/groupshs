-- Normalise Ancien progression values to canonical codes.
--
-- The Anciens form used to store accented display strings ("Première veille",
-- "Départ") while the "leaving the group" flow copies the member's own
-- progressions, which are codes ("PremiereVeille", "Depart"). Two spellings for
-- the same thing meant the form's checkboxes did not match records created by
-- the departure flow, so editing such an Ancien silently cleared their
-- progression.
--
-- Everything is now stored as codes and rendered through progressionLabel().
-- This rewrites the legacy accented values in place.
--
-- Idempotent: values already in canonical form are left untouched.

UPDATE "ancien"
SET "progression" = ARRAY(
    SELECT DISTINCT CASE
        WHEN lower(p) IN ('première veille', 'premiere veille', 'premiereveille')
            THEN 'PremiereVeille'
        WHEN lower(p) IN ('départ', 'depart')
            THEN 'Depart'
        ELSE p
    END
    FROM unnest("progression") AS p
)
WHERE EXISTS (
    SELECT 1 FROM unnest("progression") AS p
    WHERE lower(p) IN ('première veille', 'premiere veille', 'départ')
);
