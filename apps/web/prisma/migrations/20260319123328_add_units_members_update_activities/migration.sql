/*
  Warnings:

  - You are about to drop the column `date` on the `activity` table. All the data in the column will be lost.
  - The `end_date` column on the `activity` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `start_date` to the `activity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_id` to the `activity` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "activity" DROP COLUMN "date",
ADD COLUMN     "activity_type" TEXT NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "dropoff_location" TEXT,
ADD COLUMN     "dropoff_time" TEXT,
ADD COLUMN     "pickup_location" TEXT,
ADD COLUMN     "pickup_time" TEXT,
ADD COLUMN     "start_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "unit_id" TEXT NOT NULL,
DROP COLUMN "end_date",
ADD COLUMN     "end_date" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "unit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "progression" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unit_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity" ADD CONSTRAINT "activity_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
