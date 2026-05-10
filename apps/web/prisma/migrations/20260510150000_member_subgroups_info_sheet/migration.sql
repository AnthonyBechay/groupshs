-- CreateTable: subgroup
CREATE TABLE "subgroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unit_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subgroup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "subgroup_unit_id_idx" ON "subgroup"("unit_id");

ALTER TABLE "subgroup" ADD CONSTRAINT "subgroup_unit_id_fkey"
    FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: extend member with information sheet fields
ALTER TABLE "member"
    ADD COLUMN "subgroup_id" TEXT,
    ADD COLUMN "place_of_birth" TEXT,
    ADD COLUMN "email" TEXT,
    ADD COLUMN "blood_type" TEXT,
    ADD COLUMN "city" TEXT,
    ADD COLUMN "street" TEXT,
    ADD COLUMN "building" TEXT,
    ADD COLUMN "floor" TEXT,
    ADD COLUMN "home_phone" TEXT,
    ADD COLUMN "number_of_brothers" INTEGER,
    ADD COLUMN "number_of_sisters" INTEGER,
    ADD COLUMN "doctor_name" TEXT,
    ADD COLUMN "doctor_phone" TEXT,
    ADD COLUMN "doctor_clinic_address" TEXT,
    ADD COLUMN "emergency_contact_name" TEXT,
    ADD COLUMN "emergency_contact_relation" TEXT,
    ADD COLUMN "emergency_contact_phone" TEXT,
    ADD COLUMN "father_name" TEXT,
    ADD COLUMN "father_phone" TEXT,
    ADD COLUMN "father_profession" TEXT,
    ADD COLUMN "father_email" TEXT,
    ADD COLUMN "father_old_scout" TEXT,
    ADD COLUMN "mother_name" TEXT,
    ADD COLUMN "mother_phone" TEXT,
    ADD COLUMN "mother_profession" TEXT,
    ADD COLUMN "mother_email" TEXT,
    ADD COLUMN "mother_old_scout" TEXT,
    ADD COLUMN "allergy_seasonal" TEXT,
    ADD COLUMN "allergy_medication" TEXT,
    ADD COLUMN "allergy_food" TEXT,
    ADD COLUMN "allergy_animals" TEXT,
    ADD COLUMN "chronic_illnesses" TEXT,
    ADD COLUMN "sports_to_avoid" TEXT,
    ADD COLUMN "previous_surgeries" TEXT,
    ADD COLUMN "anti_tetanus_date" TEXT,
    ADD COLUMN "legal_guardian_name" TEXT,
    ADD COLUMN "consent_signed_at" TIMESTAMP(3),
    ADD COLUMN "photo_url" TEXT;

CREATE INDEX "member_unit_id_idx" ON "member"("unit_id");
CREATE INDEX "member_subgroup_id_idx" ON "member"("subgroup_id");

ALTER TABLE "member" ADD CONSTRAINT "member_subgroup_id_fkey"
    FOREIGN KEY ("subgroup_id") REFERENCES "subgroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: group_sibling
CREATE TABLE "group_sibling" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "school_class" TEXT,
    "unit_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "group_sibling_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "group_sibling_member_id_idx" ON "group_sibling"("member_id");

ALTER TABLE "group_sibling" ADD CONSTRAINT "group_sibling_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: member_medication
CREATE TABLE "member_medication" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "start_date" TEXT,
    "end_date" TEXT,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "time_to_take" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_medication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "member_medication_member_id_idx" ON "member_medication"("member_id");

ALTER TABLE "member_medication" ADD CONSTRAINT "member_medication_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: member_move
CREATE TABLE "member_move" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "from_unit_id" TEXT,
    "to_unit_id" TEXT,
    "from_subgroup_id" TEXT,
    "to_subgroup_id" TEXT,
    "from_role" TEXT,
    "to_role" TEXT,
    "from_progression" TEXT,
    "to_progression" TEXT,
    "move_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_move_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "member_move_member_id_idx" ON "member_move"("member_id");

ALTER TABLE "member_move" ADD CONSTRAINT "member_move_member_id_fkey"
    FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
