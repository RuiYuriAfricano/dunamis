-- CreateTable
CREATE TABLE "participant_edit_logs" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "edited_by_id" TEXT NOT NULL,
    "edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changes" JSONB NOT NULL,

    CONSTRAINT "participant_edit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "participant_edit_logs_participant_id_idx" ON "participant_edit_logs"("participant_id");

-- AddForeignKey
ALTER TABLE "participant_edit_logs" ADD CONSTRAINT "participant_edit_logs_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_edit_logs" ADD CONSTRAINT "participant_edit_logs_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
