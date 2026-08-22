-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "mattress_purchase_quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paid_in_hand" BOOLEAN,
ADD COLUMN     "wants_to_buy_mattress" BOOLEAN NOT NULL DEFAULT false;
