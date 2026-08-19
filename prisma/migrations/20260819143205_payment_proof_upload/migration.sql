/*
  Warnings:

  - You are about to drop the column `payment_reference` on the `participants` table. All the data in the column will be lost.
  - Added the required column `payment_proof_path` to the `participants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "participants" DROP COLUMN "payment_reference",
ADD COLUMN     "payment_proof_path" TEXT NOT NULL;
