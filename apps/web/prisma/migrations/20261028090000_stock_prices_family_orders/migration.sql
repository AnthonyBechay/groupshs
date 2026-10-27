-- Stock, second step: numeric buying / selling prices, items scoped to the
-- branches they are for, and requests that families place from the public
-- order page. All additive; one guarded backfill.

ALTER TABLE "stock_item"
    ADD COLUMN IF NOT EXISTS "cost_price"     DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS "sell_price"     DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS "currency"       TEXT NOT NULL DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS "for_unit_types" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- The old free-text price becomes the selling price when it is a plain amount
-- ("12", "$12", "12.50"). Anything else ("450,000 LL") is left for a person.
UPDATE "stock_item"
SET "sell_price" = REPLACE(REPLACE(TRIM("price"), '$', ''), ' ', '')::DECIMAL(12,2)
WHERE "sell_price" IS NULL
  AND "price" IS NOT NULL
  AND REPLACE(REPLACE(TRIM("price"), '$', ''), ' ', '') ~ '^[0-9]{1,9}(\.[0-9]{1,2})?$';

ALTER TABLE "item_request"
    ADD COLUMN IF NOT EXISTS "source"             TEXT NOT NULL DEFAULT 'LEADER',
    ADD COLUMN IF NOT EXISTS "requested_for_name" TEXT,
    ADD COLUMN IF NOT EXISTS "contact_name"       TEXT,
    ADD COLUMN IF NOT EXISTS "contact_phone"      TEXT,
    ADD COLUMN IF NOT EXISTS "order_ref"          TEXT,
    ADD COLUMN IF NOT EXISTS "unit_price"         DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS "currency"           TEXT;

CREATE INDEX IF NOT EXISTS "item_request_order_ref_idx" ON "item_request" ("order_ref");
