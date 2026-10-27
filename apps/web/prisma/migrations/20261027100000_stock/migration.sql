-- Stock management: storage rooms and shelves, stock items with clear
-- ownership (group, unit or sub-group), a log of every quantity change, and
-- the requests leaders make for a scout's uniform or badges. New tables and
-- one new permission column only; nothing existing is rewritten.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "can_manage_stock" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "storage_location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "storage_location_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "stock_item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_of_measure" TEXT NOT NULL DEFAULT 'pcs',
    "min_quantity" INTEGER,
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "expires_at" TIMESTAMP(3),
    "unit_id" TEXT,
    "subgroup_id" TEXT,
    "location_id" TEXT,
    "requestable" BOOLEAN NOT NULL DEFAULT false,
    "variants" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price" TEXT,
    "photo_url" TEXT,
    "notes" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "stock_movement" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "quantity_after" INTEGER NOT NULL,
    "reason" TEXT,
    "request_id" TEXT,
    "by_id" TEXT,
    "by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "item_request" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "member_id" TEXT,
    "variant" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "from_stock" BOOLEAN NOT NULL DEFAULT false,
    "status_note" TEXT,
    "requested_by_id" TEXT,
    "requested_by_name" TEXT,
    "handled_by_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_request_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "storage_location_parent_id_idx" ON "storage_location"("parent_id");
CREATE INDEX IF NOT EXISTS "stock_item_category_idx" ON "stock_item"("category");
CREATE INDEX IF NOT EXISTS "stock_item_unit_id_idx" ON "stock_item"("unit_id");
CREATE INDEX IF NOT EXISTS "stock_item_location_id_idx" ON "stock_item"("location_id");
CREATE INDEX IF NOT EXISTS "stock_movement_item_id_created_at_idx" ON "stock_movement"("item_id", "created_at");
CREATE INDEX IF NOT EXISTS "item_request_status_idx" ON "item_request"("status");
CREATE INDEX IF NOT EXISTS "item_request_unit_id_idx" ON "item_request"("unit_id");
CREATE INDEX IF NOT EXISTS "item_request_item_id_idx" ON "item_request"("item_id");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'storage_location_parent_id_fkey') THEN
        ALTER TABLE "storage_location" ADD CONSTRAINT "storage_location_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "storage_location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_item_unit_id_fkey') THEN
        ALTER TABLE "stock_item" ADD CONSTRAINT "stock_item_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_item_subgroup_id_fkey') THEN
        ALTER TABLE "stock_item" ADD CONSTRAINT "stock_item_subgroup_id_fkey" FOREIGN KEY ("subgroup_id") REFERENCES "subgroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_item_location_id_fkey') THEN
        ALTER TABLE "stock_item" ADD CONSTRAINT "stock_item_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "storage_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'stock_movement_item_id_fkey') THEN
        ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "stock_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_request_item_id_fkey') THEN
        ALTER TABLE "item_request" ADD CONSTRAINT "item_request_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "stock_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_request_unit_id_fkey') THEN
        ALTER TABLE "item_request" ADD CONSTRAINT "item_request_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_request_member_id_fkey') THEN
        ALTER TABLE "item_request" ADD CONSTRAINT "item_request_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
