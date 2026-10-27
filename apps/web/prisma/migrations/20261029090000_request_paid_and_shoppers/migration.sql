-- Paid flag on item requests, and a right to see every unit's requests.
ALTER TABLE "item_request" ADD COLUMN IF NOT EXISTS "paid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "item_request" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "can_see_all_requests" BOOLEAN NOT NULL DEFAULT false;

-- The QG is a shop: buying is picking up. "Bought, not arrived yet" no longer
-- exists, so anything left there is ready to hand over.
UPDATE "item_request" SET "status" = 'READY' WHERE "status" = 'ORDERED';
