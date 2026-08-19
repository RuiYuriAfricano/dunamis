-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "payment_reviewed_at" TIMESTAMP(3),
ADD COLUMN     "payment_reviewed_by_id" TEXT,
ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_payment_reviewed_by_id_fkey" FOREIGN KEY ("payment_reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
