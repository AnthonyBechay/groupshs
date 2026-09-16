-- Backfill member gender from their branch.
--
-- A YOUTH member's gender is inseparable from their branch: an Eclaireuse is a
-- girl, an Eclaireur is a boy. Every youth member predating the gender column
-- sits in a gendered branch, so the value can be derived rather than asked for.
--
-- LEADERS ARE EXCLUDED. A leader's gender is their own and has nothing to do
-- with the unit they serve: a Cheftaine Meute (CM) is a woman leading the boys'
-- Louveteaux, so deriving MALE from her unit would be wrong. Leadership gender
-- is left NULL to be filled in by hand.
--
-- Note on the two ambiguous role codes: SE and CE mean a youth role inside a
-- branch ("Second de Sizaine", "Chef d'Equipe") and a leadership role inside
-- GROUP ("Secretaire de Groupe", "Chef d'equipe"). They are deliberately NOT in
-- the exclusion list below, because within a branch unit they denote youths.
--
-- Idempotent: only fills rows that are still NULL.

UPDATE "member" m
SET "gender" = 'MALE'
FROM "unit" u
WHERE m."unit_id" = u."id"
  AND m."gender" IS NULL
  AND u."unit_type" IN ('LOUVETEAUX', 'ECLAIREURS', 'ROUTIERS')
  AND (m."role" IS NULL OR m."role" NOT IN
       ('CG','ACG','EA','TR','CT','ACT','CM','ACM','CC','ACC','AU'));

UPDATE "member" m
SET "gender" = 'FEMALE'
FROM "unit" u
WHERE m."unit_id" = u."id"
  AND m."gender" IS NULL
  AND u."unit_type" IN ('LOUVETTES', 'ECLAIREUSES', 'PIONNIERES')
  AND (m."role" IS NULL OR m."role" NOT IN
       ('CG','ACG','EA','TR','CT','ACT','CM','ACM','CC','ACC','AU'));
