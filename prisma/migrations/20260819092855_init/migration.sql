-- CreateSequence
CREATE SEQUENCE "registration_number_seq" START 1;

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateTable
CREATE TABLE "transport_stops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "church" TEXT NOT NULL,
    "is_member_tibl" BOOLEAN NOT NULL,
    "first_time" BOOLEAN NOT NULL,
    "transport_required" BOOLEAN NOT NULL,
    "transport_stop_id" TEXT,
    "tent_required" BOOLEAN NOT NULL,
    "mattress_required" BOOLEAN NOT NULL,
    "qr_token" TEXT NOT NULL,
    "checked_in" BOOLEAN NOT NULL DEFAULT false,
    "checked_in_at" TIMESTAMP(3),
    "checked_in_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transport_stops_name_key" ON "transport_stops"("name");

-- CreateIndex
CREATE UNIQUE INDEX "participants_registration_number_key" ON "participants"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "participants_qr_token_key" ON "participants"("qr_token");

-- CreateIndex
CREATE INDEX "participants_full_name_idx" ON "participants"("full_name");

-- CreateIndex
CREATE INDEX "participants_phone_idx" ON "participants"("phone");

-- CreateIndex
CREATE INDEX "participants_church_idx" ON "participants"("church");

-- CreateIndex
CREATE INDEX "participants_checked_in_idx" ON "participants"("checked_in");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "check_ins_participant_id_key" ON "check_ins"("participant_id");

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_transport_stop_id_fkey" FOREIGN KEY ("transport_stop_id") REFERENCES "transport_stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_checked_in_by_id_fkey" FOREIGN KEY ("checked_in_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
