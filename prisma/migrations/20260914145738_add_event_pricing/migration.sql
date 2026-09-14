-- AlterTable
ALTER TABLE "event_settings" ADD COLUMN     "payment_amount_sponsored" INTEGER NOT NULL DEFAULT 5000,
ADD COLUMN     "payment_amount_student" INTEGER NOT NULL DEFAULT 15000,
ADD COLUMN     "payment_amount_worker" INTEGER NOT NULL DEFAULT 20000;
