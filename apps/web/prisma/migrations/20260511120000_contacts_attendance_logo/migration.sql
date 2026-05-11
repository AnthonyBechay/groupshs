-- AlterTable: site logo
ALTER TABLE "site_settings" ADD COLUMN "logo_url" TEXT;

-- AlterTable: activity total days for partial attendance math
ALTER TABLE "activity" ADD COLUMN "total_days" INTEGER;

-- CreateTable: unit contacts (multiple contact members per unit)
CREATE TABLE "unit_contact" (
    "id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unit_contact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "unit_contact_unit_id_idx" ON "unit_contact"("unit_id");
CREATE UNIQUE INDEX "unit_contact_unit_id_member_id_key" ON "unit_contact"("unit_id", "member_id");

ALTER TABLE "unit_contact" ADD CONSTRAINT "unit_contact_unit_id_fkey"
    FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "unit_contact" ADD CONSTRAINT "unit_contact_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: activity attendance
CREATE TABLE "activity_attendance" (
    "id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "confirmation" TEXT,
    "confirmation_days" INTEGER,
    "confirmation_reason" TEXT,
    "confirmation_note" TEXT,
    "attended" TEXT,
    "attended_days" INTEGER,
    "attendance_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_attendance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activity_attendance_activity_id_idx" ON "activity_attendance"("activity_id");
CREATE INDEX "activity_attendance_member_id_idx" ON "activity_attendance"("member_id");
CREATE UNIQUE INDEX "activity_attendance_activity_id_member_id_key" ON "activity_attendance"("activity_id", "member_id");

ALTER TABLE "activity_attendance" ADD CONSTRAINT "activity_attendance_activity_id_fkey"
    FOREIGN KEY ("activity_id") REFERENCES "activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "activity_attendance" ADD CONSTRAINT "activity_attendance_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
