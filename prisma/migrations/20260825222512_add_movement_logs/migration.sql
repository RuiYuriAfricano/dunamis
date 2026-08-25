-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('EXIT', 'ENTRY');

-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "inside_venue" BOOLEAN NOT NULL DEFAULT false;

-- Anyone already checked in is presumed to be on-site until an exit is
-- logged against them, since movement tracking starts from this migration.
UPDATE "participants" SET "inside_venue" = true WHERE "checked_in" = true;

-- CreateTable
CREATE TABLE "movement_logs" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by_id" TEXT NOT NULL,

    CONSTRAINT "movement_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "movement_logs_participant_id_idx" ON "movement_logs"("participant_id");

-- AddForeignKey
ALTER TABLE "movement_logs" ADD CONSTRAINT "movement_logs_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movement_logs" ADD CONSTRAINT "movement_logs_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
