-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED');

-- CreateEnum
CREATE TYPE "OwnTransportType" AS ENUM ('INDIVIDUAL', 'TAXI');

-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "bringing_children" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "car_route_stops" TEXT,
ADD COLUMN     "car_seats" INTEGER,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "marital_status" "MaritalStatus",
ADD COLUMN     "mattresses_can_provide" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "number_of_children" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "own_transport_type" "OwnTransportType",
ADD COLUMN     "registered_by_admin_id" TEXT,
ADD COLUMN     "tent_purchase_quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tent_purchase_type_id" TEXT,
ADD COLUMN     "tents_can_provide" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wants_to_buy_tent" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "tent_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tent_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tent_types_name_key" ON "tent_types"("name");

-- CreateIndex
CREATE INDEX "participants_deleted_at_idx" ON "participants"("deleted_at");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_tent_purchase_type_id_fkey" FOREIGN KEY ("tent_purchase_type_id") REFERENCES "tent_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_registered_by_admin_id_fkey" FOREIGN KEY ("registered_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
