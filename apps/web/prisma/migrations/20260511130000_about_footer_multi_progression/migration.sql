-- Footer / About settings
ALTER TABLE "site_settings"
    ADD COLUMN "footer_description" TEXT,
    ADD COLUMN "footer_address" TEXT,
    ADD COLUMN "footer_phone" TEXT,
    ADD COLUMN "footer_email" TEXT,
    ADD COLUMN "about_title" TEXT,
    ADD COLUMN "about_subtitle" TEXT,
    ADD COLUMN "about_intro" TEXT,
    ADD COLUMN "about_mission" TEXT;

-- About page timeline sections
CREATE TABLE "about_section" (
    "id" TEXT NOT NULL,
    "year" INTEGER,
    "date_label" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "about_section_pkey" PRIMARY KEY ("id")
);

-- Convert member.progression (TEXT) into progressions (TEXT[])
ALTER TABLE "member" ADD COLUMN "progressions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Copy any existing single value into the array
UPDATE "member"
SET "progressions" = ARRAY["progression"]::TEXT[]
WHERE "progression" IS NOT NULL AND "progression" <> '';

ALTER TABLE "member" DROP COLUMN "progression";

-- Convert member_move.from_progression and to_progression to arrays
ALTER TABLE "member_move" ADD COLUMN "from_progression_new" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "member_move" ADD COLUMN "to_progression_new" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "member_move"
SET "from_progression_new" = ARRAY["from_progression"]::TEXT[]
WHERE "from_progression" IS NOT NULL AND "from_progression" <> '';

UPDATE "member_move"
SET "to_progression_new" = ARRAY["to_progression"]::TEXT[]
WHERE "to_progression" IS NOT NULL AND "to_progression" <> '';

ALTER TABLE "member_move" DROP COLUMN "from_progression";
ALTER TABLE "member_move" DROP COLUMN "to_progression";
ALTER TABLE "member_move" RENAME COLUMN "from_progression_new" TO "from_progression";
ALTER TABLE "member_move" RENAME COLUMN "to_progression_new" TO "to_progression";
