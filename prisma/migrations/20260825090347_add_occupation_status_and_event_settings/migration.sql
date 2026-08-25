-- CreateEnum
CREATE TYPE "OccupationStatus" AS ENUM ('STUDENT', 'WORKER');

-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "occupation_status" "OccupationStatus" NOT NULL DEFAULT 'STUDENT';

-- CreateTable
CREATE TABLE "event_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "registration_deadline" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_settings_pkey" PRIMARY KEY ("id")
);
