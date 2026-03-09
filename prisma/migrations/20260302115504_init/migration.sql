-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "DegreeClass" AS ENUM ('FIRST_CLASS', 'SECOND_CLASS_UPPER', 'SECOND_CLASS_LOWER', 'THIRD_CLASS', 'PASS');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'SELF_EMPLOYED', 'UNEMPLOYED', 'STUDENT');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('COHORT', 'DEPARTMENT', 'FACULTY', 'STATE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GroupMemberRole" AS ENUM ('ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "MentorshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'REMOTE', 'HYBRID', 'INTERNSHIP');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('WELCOME', 'PROFILE_VIEW', 'CONNECTION_REQUEST', 'CONNECTION_ACCEPTED', 'MESSAGE_RECEIVED', 'GROUP_POST', 'JOB_MATCH', 'MENTORSHIP_REQUEST', 'MENTORSHIP_ACCEPTED', 'ENDORSEMENT', 'GRADUATION_ANNIVERSARY', 'ADMIN_BROADCAST', 'ACCOUNT_CREATED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('JOINED_PLATFORM', 'UPDATED_JOB', 'JOINED_GROUP', 'POSTED_IN_GROUP', 'POSTED_JOB', 'PROFILE_COMPLETED', 'GRADUATION_ANNIVERSARY');

-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('FIRST_CLASS_HONOURS', 'PROFILE_COMPLETE', 'EARLY_ADOPTER', 'MENTOR', 'JOB_POSTER', 'TOP_CONNECTOR', 'VERIFIED');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'LOVE', 'CLAP', 'FIRE', 'INSIGHTFUL');

-- CreateEnum
CREATE TYPE "Proficiency" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'EXPERT');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "role" TEXT DEFAULT 'user',
    "banned" BOOLEAN DEFAULT false,
    "ban_reason" TEXT,
    "ban_expires" TIMESTAMP(3),
    "two_factor_enabled" BOOLEAN DEFAULT false,
    "registration_no" TEXT NOT NULL,
    "default_password" BOOLEAN NOT NULL DEFAULT true,
    "account_status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "phone" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,
    "impersonated_by" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backup_codes" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "two_factor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "graduate" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "registration_no" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "surname" TEXT,
    "other_names" TEXT,
    "sex" "Sex",
    "state_of_origin" TEXT,
    "lga" TEXT,
    "faculty_code" TEXT,
    "faculty_name" TEXT,
    "course_code" TEXT,
    "department_name" TEXT,
    "cgpa" DECIMAL(4,2),
    "degree_class" "DegreeClass",
    "graduation_year" TEXT,
    "entry_year" INTEGER,
    "jamb_number" TEXT,
    "source_sheet" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "bio" TEXT,
    "linkedin_url" TEXT,
    "twitter_url" TEXT,
    "github_url" TEXT,
    "personal_website" TEXT,
    "nysc_state" TEXT,
    "nysc_year" INTEGER,
    "show_cgpa" BOOLEAN NOT NULL DEFAULT true,
    "show_email" BOOLEAN NOT NULL DEFAULT false,
    "show_phone" BOOLEAN NOT NULL DEFAULT false,
    "show_dob" BOOLEAN NOT NULL DEFAULT false,
    "show_in_directory" BOOLEAN NOT NULL DEFAULT true,
    "allow_messages" BOOLEAN NOT NULL DEFAULT true,
    "show_activity_feed" BOOLEAN NOT NULL DEFAULT true,
    "open_to_opportunities" BOOLEAN NOT NULL DEFAULT false,
    "available_for_mentorship" BOOLEAN NOT NULL DEFAULT false,
    "profile_completed" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_step" INTEGER NOT NULL DEFAULT 0,
    "profile_views" INTEGER NOT NULL DEFAULT 0,
    "salary_min" DECIMAL(14,2),
    "salary_max" DECIMAL(14,2),
    "salary_currency" TEXT NOT NULL DEFAULT 'NGN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "graduate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment" (
    "id" TEXT NOT NULL,
    "graduate_id" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "industry" TEXT,
    "employment_type" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education" (
    "id" TEXT NOT NULL,
    "graduate_id" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "field_of_study" TEXT,
    "start_year" INTEGER,
    "end_year" INTEGER,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill" (
    "id" TEXT NOT NULL,
    "graduate_id" TEXT NOT NULL,
    "skill_name" TEXT NOT NULL,
    "proficiency" "Proficiency" NOT NULL DEFAULT 'INTERMEDIATE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "endorsement" (
    "id" TEXT NOT NULL,
    "endorser_id" TEXT NOT NULL,
    "endorsed_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "endorsement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "graduate_location" (
    "id" TEXT NOT NULL,
    "graduate_id" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "latitude" DECIMAL(10,6),
    "longitude" DECIMAL(10,6),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "graduate_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement" (
    "id" TEXT NOT NULL,
    "graduate_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "year" INTEGER,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_badge" (
    "id" TEXT NOT NULL,
    "graduate_id" TEXT NOT NULL,
    "badge_type" "BadgeType" NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alumni_group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "cover_image_url" TEXT,
    "type" "GroupType" NOT NULL DEFAULT 'CUSTOM',
    "is_auto" BOOLEAN NOT NULL DEFAULT false,
    "cohort_year" TEXT,
    "faculty_code" TEXT,
    "course_code" TEXT,
    "state_code" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alumni_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_member" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "graduate_id" TEXT NOT NULL,
    "role" "GroupMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_at" TIMESTAMP(3),

    CONSTRAINT "group_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_post" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "image_url" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_comment" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_reaction" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "graduate_id" TEXT NOT NULL,
    "reaction" "ReactionType" NOT NULL,

    CONSTRAINT "post_reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation" (
    "id" TEXT NOT NULL,
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "group_name" TEXT,
    "group_image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participant" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "graduate_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_at" TIMESTAMP(3),
    "is_admin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "conversation_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "file_url" TEXT,
    "file_type" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connection" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_view" (
    "id" TEXT NOT NULL,
    "viewed_id" TEXT NOT NULL,
    "viewer_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_view_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_posting" (
    "id" TEXT NOT NULL,
    "posted_by_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "description" TEXT,
    "requirements" TEXT,
    "industry" TEXT,
    "job_type" "JobType" NOT NULL DEFAULT 'FULL_TIME',
    "location_city" TEXT,
    "location_state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "salary_min" DECIMAL(14,2),
    "salary_max" DECIMAL(14,2),
    "salary_visible" BOOLEAN NOT NULL DEFAULT false,
    "currency_code" TEXT NOT NULL DEFAULT 'NGN',
    "application_url" TEXT,
    "application_email" TEXT,
    "deadline" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_posting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_application" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "applicant_id" TEXT NOT NULL,
    "cover_note" TEXT,
    "cv_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentorship" (
    "id" TEXT NOT NULL,
    "mentee_id" TEXT NOT NULL,
    "mentor_id" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT,
    "status" "MentorshipStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "accepted_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentorship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "graduate_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "action_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_feed_item" (
    "id" TEXT NOT NULL,
    "graduate_id" TEXT NOT NULL,
    "action_type" "ActivityType" NOT NULL,
    "headline" TEXT NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_feed_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_audit_log" (
    "id" TEXT NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "total_rows" INTEGER NOT NULL,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "status" "UploadStatus" NOT NULL DEFAULT 'PROCESSING',
    "error_report_url" TEXT,
    "notes" TEXT,
    "sheets_processed" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "upload_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_registration_no_key" ON "user"("registration_no");

-- CreateIndex
CREATE UNIQUE INDEX "user_phone_key" ON "user"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "graduate_user_id_key" ON "graduate"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "graduate_registration_no_key" ON "graduate"("registration_no");

-- CreateIndex
CREATE INDEX "graduate_registration_no_idx" ON "graduate"("registration_no");

-- CreateIndex
CREATE INDEX "graduate_graduation_year_idx" ON "graduate"("graduation_year");

-- CreateIndex
CREATE INDEX "graduate_faculty_code_course_code_idx" ON "graduate"("faculty_code", "course_code");

-- CreateIndex
CREATE INDEX "graduate_degree_class_idx" ON "graduate"("degree_class");

-- CreateIndex
CREATE INDEX "graduate_state_of_origin_idx" ON "graduate"("state_of_origin");

-- CreateIndex
CREATE INDEX "employment_graduate_id_idx" ON "employment"("graduate_id");

-- CreateIndex
CREATE INDEX "employment_company_name_idx" ON "employment"("company_name");

-- CreateIndex
CREATE INDEX "employment_industry_idx" ON "employment"("industry");

-- CreateIndex
CREATE INDEX "education_graduate_id_idx" ON "education"("graduate_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_graduate_id_skill_name_key" ON "skill"("graduate_id", "skill_name");

-- CreateIndex
CREATE UNIQUE INDEX "endorsement_endorser_id_endorsed_id_skill_id_key" ON "endorsement"("endorser_id", "endorsed_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "graduate_location_graduate_id_key" ON "graduate_location"("graduate_id");

-- CreateIndex
CREATE INDEX "graduate_location_state_idx" ON "graduate_location"("state");

-- CreateIndex
CREATE INDEX "achievement_graduate_id_idx" ON "achievement"("graduate_id");

-- CreateIndex
CREATE UNIQUE INDEX "profile_badge_graduate_id_badge_type_key" ON "profile_badge"("graduate_id", "badge_type");

-- CreateIndex
CREATE UNIQUE INDEX "alumni_group_slug_key" ON "alumni_group"("slug");

-- CreateIndex
CREATE INDEX "alumni_group_type_idx" ON "alumni_group"("type");

-- CreateIndex
CREATE INDEX "alumni_group_slug_idx" ON "alumni_group"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "group_member_group_id_graduate_id_key" ON "group_member"("group_id", "graduate_id");

-- CreateIndex
CREATE INDEX "group_post_group_id_created_at_idx" ON "group_post"("group_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "post_comment_post_id_idx" ON "post_comment"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_reaction_post_id_graduate_id_key" ON "post_reaction"("post_id", "graduate_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participant_conversation_id_graduate_id_key" ON "conversation_participant"("conversation_id", "graduate_id");

-- CreateIndex
CREATE INDEX "message_conversation_id_created_at_idx" ON "message"("conversation_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "connection_requester_id_receiver_id_key" ON "connection"("requester_id", "receiver_id");

-- CreateIndex
CREATE INDEX "profile_view_viewed_id_viewed_at_idx" ON "profile_view"("viewed_id", "viewed_at" DESC);

-- CreateIndex
CREATE INDEX "job_posting_is_active_created_at_idx" ON "job_posting"("is_active", "created_at" DESC);

-- CreateIndex
CREATE INDEX "job_posting_industry_idx" ON "job_posting"("industry");

-- CreateIndex
CREATE UNIQUE INDEX "job_application_job_id_applicant_id_key" ON "job_application"("job_id", "applicant_id");

-- CreateIndex
CREATE INDEX "mentorship_mentor_id_status_idx" ON "mentorship"("mentor_id", "status");

-- CreateIndex
CREATE INDEX "notification_graduate_id_is_read_created_at_idx" ON "notification"("graduate_id", "is_read", "created_at" DESC);

-- CreateIndex
CREATE INDEX "activity_feed_item_created_at_idx" ON "activity_feed_item"("created_at" DESC);

-- CreateIndex
CREATE INDEX "activity_feed_item_graduate_id_idx" ON "activity_feed_item"("graduate_id");

-- CreateIndex
CREATE INDEX "upload_audit_log_uploaded_by_user_id_idx" ON "upload_audit_log"("uploaded_by_user_id");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graduate" ADD CONSTRAINT "graduate_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employment" ADD CONSTRAINT "employment_graduate_id_fkey" FOREIGN KEY ("graduate_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education" ADD CONSTRAINT "education_graduate_id_fkey" FOREIGN KEY ("graduate_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill" ADD CONSTRAINT "skill_graduate_id_fkey" FOREIGN KEY ("graduate_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsement" ADD CONSTRAINT "endorsement_endorser_id_fkey" FOREIGN KEY ("endorser_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsement" ADD CONSTRAINT "endorsement_endorsed_id_fkey" FOREIGN KEY ("endorsed_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endorsement" ADD CONSTRAINT "endorsement_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "graduate_location" ADD CONSTRAINT "graduate_location_graduate_id_fkey" FOREIGN KEY ("graduate_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement" ADD CONSTRAINT "achievement_graduate_id_fkey" FOREIGN KEY ("graduate_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_badge" ADD CONSTRAINT "profile_badge_graduate_id_fkey" FOREIGN KEY ("graduate_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "alumni_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_graduate_id_fkey" FOREIGN KEY ("graduate_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_post" ADD CONSTRAINT "group_post_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "alumni_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_post" ADD CONSTRAINT "group_post_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comment" ADD CONSTRAINT "post_comment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "group_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comment" ADD CONSTRAINT "post_comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comment" ADD CONSTRAINT "post_comment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "post_comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reaction" ADD CONSTRAINT "post_reaction_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "group_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reaction" ADD CONSTRAINT "post_reaction_graduate_id_fkey" FOREIGN KEY ("graduate_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participant" ADD CONSTRAINT "conversation_participant_graduate_id_fkey" FOREIGN KEY ("graduate_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection" ADD CONSTRAINT "connection_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connection" ADD CONSTRAINT "connection_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_view" ADD CONSTRAINT "profile_view_viewed_id_fkey" FOREIGN KEY ("viewed_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_view" ADD CONSTRAINT "profile_view_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_posting" ADD CONSTRAINT "job_posting_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_application" ADD CONSTRAINT "job_application_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job_posting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_application" ADD CONSTRAINT "job_application_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship" ADD CONSTRAINT "mentorship_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship" ADD CONSTRAINT "mentorship_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_graduate_id_fkey" FOREIGN KEY ("graduate_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_feed_item" ADD CONSTRAINT "activity_feed_item_graduate_id_fkey" FOREIGN KEY ("graduate_id") REFERENCES "graduate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
