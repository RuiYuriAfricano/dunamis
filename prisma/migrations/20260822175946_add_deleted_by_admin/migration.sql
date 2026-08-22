-- AlterTable
ALTER TABLE "participants" ADD COLUMN "deleted_by_admin_id" TEXT;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_deleted_by_admin_id_fkey" FOREIGN KEY ("deleted_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
