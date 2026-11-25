-- Reports and blocks (feat(moderation)). Idempotent: these tables were first
-- created with `prisma db push`, so this must be a no-op where they exist.

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ReportTarget" AS ENUM ('POST', 'COMMENT', 'MESSAGE', 'PROFILE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'IMPERSONATION', 'SCAM', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "content_report" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "target_type" "ReportTarget" NOT NULL,
    "target_id" TEXT NOT NULL,
    "subject_id" TEXT,
    "reason" "ReportReason" NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "resolution" TEXT,

    CONSTRAINT "content_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "member_block" (
    "blocker_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_block_pkey" PRIMARY KEY ("blocker_id","blocked_id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "content_report_status_created_at_idx" ON "content_report"("status", "created_at");
CREATE INDEX IF NOT EXISTS "content_report_subject_id_idx" ON "content_report"("subject_id");
CREATE UNIQUE INDEX IF NOT EXISTS "content_report_reporter_id_target_type_target_id_key" ON "content_report"("reporter_id", "target_type", "target_id");
CREATE INDEX IF NOT EXISTS "member_block_blocked_id_idx" ON "member_block"("blocked_id");

-- AddForeignKey (cascade on graduate deletion, so lib/account-deletion.ts needs no change)
DO $$ BEGIN
  ALTER TABLE "content_report" ADD CONSTRAINT "content_report_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "content_report" ADD CONSTRAINT "content_report_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "graduate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "member_block" ADD CONSTRAINT "member_block_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "member_block" ADD CONSTRAINT "member_block_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
