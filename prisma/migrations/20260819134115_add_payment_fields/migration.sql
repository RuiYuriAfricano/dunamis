/*
  Warnings:

  - Added the required column `payment_amount` to the `participants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_reference` to the `participants` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "payment_amount" INTEGER NOT NULL,
ADD COLUMN     "payment_reference" TEXT NOT NULL;
