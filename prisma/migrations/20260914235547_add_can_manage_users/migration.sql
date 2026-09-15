-- AlterTable
ALTER TABLE "users" ADD COLUMN     "can_manage_users" BOOLEAN NOT NULL DEFAULT false;

-- Rui Malemba is the sole account allowed to manage other admin/operator accounts.
UPDATE "users" SET "can_manage_users" = true WHERE "email" = 'rui.malemba@dunamis.ao';
