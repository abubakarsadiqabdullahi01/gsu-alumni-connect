-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('REUNION', 'MEETUP', 'WORKSHOP', 'NETWORKING', 'WEBINAR');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "last_seen_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "EventType" NOT NULL,
    "location" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "capacity" INTEGER,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendee" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "graduate_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_setting" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "platform_name" TEXT NOT NULL DEFAULT 'GSU Alumni Connect',
    "support_email" TEXT NOT NULL DEFAULT 'alumni@gsu.edu.ng',
    "welcome_message" TEXT,
    "allow_self_registration" BOOLEAN NOT NULL DEFAULT false,
    "require_email_verification" BOOLEAN NOT NULL DEFAULT true,
    "force_password_change_on_first" BOOLEAN NOT NULL DEFAULT true,
    "enable_two_factor" BOOLEAN NOT NULL DEFAULT true,
    "feature_job_board" BOOLEAN NOT NULL DEFAULT true,
    "feature_mentorship" BOOLEAN NOT NULL DEFAULT true,
    "feature_messaging" BOOLEAN NOT NULL DEFAULT true,
    "feature_map" BOOLEAN NOT NULL DEFAULT true,
    "feature_groups" BOOLEAN NOT NULL DEFAULT true,
    "feature_skills" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_starts_at_idx" ON "event"("starts_at" DESC);

-- CreateIndex
CREATE INDEX "event_type_idx" ON "event"("type");

-- CreateIndex
CREATE INDEX "event_attendee_graduate_id_idx" ON "event_attendee"("graduate_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendee_event_id_graduate_id_key" ON "event_attendee"("event_id", "graduate_id");

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendee" ADD CONSTRAINT "event_attendee_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendee" ADD CONSTRAINT "event_attendee_graduate_id_fkey" FOREIGN KEY ("graduate_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
