-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "registration_rating" INTEGER,
    "transport_rating" INTEGER,
    "check_in_rating" INTEGER,
    "discipleship_rating" INTEGER,
    "worship_rating" INTEGER,
    "preaching_rating" INTEGER,
    "activities_rating" INTEGER,
    "music_rating" INTEGER,
    "food_rating" INTEGER,
    "accommodation_rating" INTEGER,
    "comments" TEXT DEFAULT '',
    "contact_name" TEXT,
    "contact_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);
