-- AlterTable: Add permission fields to user
ALTER TABLE "user"
    ADD COLUMN "can_manage_units" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "can_manage_members" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "can_manage_activities" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "can_manage_gallery" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "can_manage_partners" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "can_manage_social_links" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "can_manage_news" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "can_view_submissions" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "can_manage_settings" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "allowed_unit_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable: Add activity fields
ALTER TABLE "activity"
    ADD COLUMN "what_to_bring" TEXT,
    ADD COLUMN "pickup_location_url" TEXT,
    ADD COLUMN "dropoff_location_url" TEXT,
    ADD COLUMN "location_url" TEXT,
    ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: Site settings (singleton)
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "group_founded_year" INTEGER NOT NULL DEFAULT 2014,
    "manual_unit_count" INTEGER,
    "manual_member_count" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- Promote cg@groupshs.org to super_admin if exists, with all permissions
UPDATE "user" SET role = 'super_admin' WHERE email = 'cg@groupshs.org';

-- Grant all permissions to existing admin users (so existing admins keep working)
UPDATE "user" SET
    can_manage_units = true,
    can_manage_members = true,
    can_manage_activities = true,
    can_manage_gallery = true,
    can_manage_partners = true,
    can_manage_social_links = true,
    can_manage_news = true,
    can_view_submissions = true,
    can_manage_settings = true
WHERE role IN ('admin', 'super_admin');

-- Insert default settings row
INSERT INTO "site_settings" ("id", "group_founded_year") VALUES ('default', 2014) ON CONFLICT DO NOTHING;
