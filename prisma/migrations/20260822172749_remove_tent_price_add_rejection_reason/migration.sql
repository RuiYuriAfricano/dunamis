-- AlterTable
ALTER TABLE "tent_types" DROP COLUMN "price";

-- AlterTable
ALTER TABLE "participants" ADD COLUMN "payment_rejection_reason" TEXT;
