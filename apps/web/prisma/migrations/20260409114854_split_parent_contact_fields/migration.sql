-- AlterTable
ALTER TABLE "recruitment_submission" ADD COLUMN     "parent_name" TEXT,
ADD COLUMN     "parent_phone" TEXT,
ALTER COLUMN "parent_contact_info" DROP NOT NULL;
