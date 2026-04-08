-- AlterTable
ALTER TABLE "recruitment_submission" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "status_note" TEXT;

-- AlterTable
ALTER TABLE "unit" ADD COLUMN     "contact_name" TEXT,
ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "image_url" TEXT;
