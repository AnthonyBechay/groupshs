-- Add canManageHistory permission to users
ALTER TABLE "user" ADD COLUMN "can_manage_history" BOOLEAN NOT NULL DEFAULT false;

-- Create history_milestone table
CREATE TABLE "history_milestone" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "long_description" TEXT,
    "challenges" TEXT,
    "motivations" TEXT,
    "unit_count" INTEGER,
    "member_count" INTEGER,
    "image_urls" TEXT[] NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "history_milestone_pkey" PRIMARY KEY ("id")
);

-- Create ancien table (private — old members of the group)
CREATE TABLE "ancien" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "last_role" TEXT NOT NULL,
    "years_active" TEXT,
    "photo_url" TEXT,
    "bio" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ancien_pkey" PRIMARY KEY ("id")
);
