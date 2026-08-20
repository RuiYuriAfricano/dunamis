-- DropIndex
DROP INDEX "participants_phone_idx";

-- CreateIndex
CREATE UNIQUE INDEX "participants_phone_key" ON "participants"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "participants_whatsapp_key" ON "participants"("whatsapp");

-- CreateIndex
CREATE UNIQUE INDEX "participants_email_key" ON "participants"("email");
