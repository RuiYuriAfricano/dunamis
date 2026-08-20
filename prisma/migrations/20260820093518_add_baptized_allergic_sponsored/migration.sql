-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "allergic_to" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "baptized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_sponsored" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "payment_proof_path" DROP NOT NULL;
