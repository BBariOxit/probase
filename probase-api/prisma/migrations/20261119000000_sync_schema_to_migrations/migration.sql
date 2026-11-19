-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('DOCUMENT', 'IMAGE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PROPOSAL_REVISION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'PROPOSAL_RESUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'PROPOSAL_COMMENTED';
ALTER TYPE "NotificationType" ADD VALUE 'PROPOSAL_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'OUTLINE_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'OUTLINE_REVISION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'OUTLINE_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'STUDENT_ELIGIBILITY_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'PROGRESS_LOG_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'PROGRESS_LOG_FEEDBACK';
ALTER TYPE "NotificationType" ADD VALUE 'PROGRESS_REPORT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'PROGRESS_REPORT_GRADED';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEWER_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'COUNCIL_SCHEDULED';
ALTER TYPE "NotificationType" ADD VALUE 'COUNCIL_DEFENSE_COMPLETED';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'GVCN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TopicProposalStatus" ADD VALUE 'DRAFT';
ALTER TYPE "TopicProposalStatus" ADD VALUE 'NEEDS_REVISION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TopicStatus" ADD VALUE 'DRAFT';
ALTER TYPE "TopicStatus" ADD VALUE 'PENDING_DEPARTMENT';
ALTER TYPE "TopicStatus" ADD VALUE 'APPROVED_OPEN';
ALTER TYPE "TopicStatus" ADD VALUE 'ASSIGNED';
ALTER TYPE "TopicStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "council_topics" ADD COLUMN     "defenseOrder" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "evaluations" JSONB,
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minuteNotes" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "councils" ADD COLUMN     "majorId" INTEGER,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PREP';

-- AlterTable
ALTER TABLE "lecturer_profiles" ADD COLUMN     "isAcademicAssistant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHeadOfDepartment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHomeroomTeacher" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "majorId" INTEGER;

-- AlterTable
ALTER TABLE "majors" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "registration_rounds" ADD COLUMN     "archiveDeadline" TIMESTAMP(3),
ADD COLUMN     "defenseEndDate" TIMESTAMP(3),
ADD COLUMN     "defenseStartDate" TIMESTAMP(3),
ADD COLUMN     "finalSubmissionDeadline" TIMESTAMP(3),
ADD COLUMN     "officialEndDate" TIMESTAMP(3),
ADD COLUMN     "officialStartDate" TIMESTAMP(3),
ADD COLUMN     "outlineDeadline" TIMESTAMP(3),
ADD COLUMN     "progress1Deadline" TIMESTAMP(3),
ADD COLUMN     "progress2Deadline" TIMESTAMP(3),
ADD COLUMN     "reviewerAssignmentDeadline" TIMESTAMP(3),
ADD COLUMN     "targetCohort" TEXT,
ADD COLUMN     "topicSubmissionEnd" TIMESTAMP(3),
ADD COLUMN     "topicSubmissionStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "semesters" ADD COLUMN     "defenseWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "progress1Weight" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
ADD COLUMN     "progress2Weight" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
ALTER COLUMN "councilWeight" SET DEFAULT 0.5,
ALTER COLUMN "mentorWeight" SET DEFAULT 0.2;

-- AlterTable
ALTER TABLE "topic_proposals" ADD COLUMN     "maxStudents" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "topics" ADD COLUMN     "departmentFeedback" TEXT,
ADD COLUMN     "departmentReviewerId" INTEGER,
ADD COLUMN     "majorId" INTEGER,
ADD COLUMN     "objectives" TEXT,
ADD COLUMN     "techStack" TEXT,
ADD COLUMN     "titleEn" TEXT,
ADD COLUMN     "titleVi" TEXT,
ALTER COLUMN "maxStudents" SET DEFAULT 3,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "round_student_eligibilities" (
    "id" SERIAL NOT NULL,
    "roundId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "round_student_eligibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "round_lecturer_quotas" (
    "id" SERIAL NOT NULL,
    "roundId" INTEGER NOT NULL,
    "lecturerId" INTEGER NOT NULL,
    "targetQuota" INTEGER,
    "isExempt" BOOLEAN NOT NULL DEFAULT false,
    "exemptReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "round_lecturer_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_attachments" (
    "id" SERIAL NOT NULL,
    "proposalId" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "filePublicId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileType" "AttachmentType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_comments" (
    "id" SERIAL NOT NULL,
    "proposalId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposal_comment_reactions" (
    "id" SERIAL NOT NULL,
    "commentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposal_comment_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_outlines" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "topicId" INTEGER NOT NULL,
    "attachmentUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "publicId" TEXT,
    "submittedById" INTEGER,
    "submittedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
    "lecturerFeedback" TEXT,
    "approvedAt" TIMESTAMP(3),
    "objectives" TEXT,
    "scopeAndContent" TEXT,
    "toolsAndTech" TEXT,
    "expectedResults" TEXT,
    "weeklyPlans" JSONB,
    "references" TEXT,
    "pdfExportUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_outlines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_reviews" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "lecturerId" INTEGER NOT NULL,
    "reviewerType" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "evaluationCriteria" JSONB,
    "generalComment" TEXT NOT NULL,
    "isDefenseAllowed" BOOLEAN NOT NULL DEFAULT true,
    "pdfExportUrl" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_archives" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "topicId" INTEGER NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "databaseUrl" TEXT NOT NULL,
    "thesisUrl" TEXT NOT NULL,
    "abstractVi" TEXT,
    "abstractEn" TEXT,
    "keywords" TEXT,
    "isVerifiedBySupervisor" BOOLEAN NOT NULL DEFAULT false,
    "isVerifiedByAcademic" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_archives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_change_requests" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "topicId" INTEGER NOT NULL,
    "requestType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "supervisorComment" TEXT,
    "facultyComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topic_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_similarity_checks" (
    "id" SERIAL NOT NULL,
    "topicId" INTEGER NOT NULL,
    "matchedTopicId" INTEGER NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "matchedFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_similarity_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_logs" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "title" TEXT,
    "completionPercentage" INTEGER NOT NULL DEFAULT 0,
    "gitCommitUrl" TEXT,
    "summaryNotes" TEXT NOT NULL,
    "blockers" TEXT,
    "submittedById" INTEGER,
    "lecturerComment" TEXT,
    "isAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "feedbackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_reports" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "reportFileUrl" TEXT,
    "reportFileName" TEXT,
    "reportFileSize" INTEGER,
    "sourceCodeUrl" TEXT,
    "submittedById" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supervisorGrade" DOUBLE PRECISION,
    "supervisorFeedback" TEXT,
    "reviewerGrade" DOUBLE PRECISION,
    "reviewerFeedback" TEXT,
    "finalStageGrade" DOUBLE PRECISION,
    "workloadPercentage" INTEGER,
    "isPassed" BOOLEAN,
    "finalisedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_assignments" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "topicId" INTEGER NOT NULL,
    "supervisorId" INTEGER NOT NULL,
    "reviewerId" INTEGER NOT NULL,
    "assignedById" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_grades" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "progress1Grade" DOUBLE PRECISION,
    "progress2Grade" DOUBLE PRECISION,
    "defenseGrade" DOUBLE PRECISION,
    "finalGradeNum" DOUBLE PRECISION,
    "finalGradeLetter" TEXT,
    "note" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "permission" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "permission" VARCHAR(100) NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by_id" INTEGER,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "round_student_eligibilities_roundId_idx" ON "round_student_eligibilities"("roundId");

-- CreateIndex
CREATE INDEX "round_student_eligibilities_studentId_idx" ON "round_student_eligibilities"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "round_student_eligibilities_roundId_studentId_key" ON "round_student_eligibilities"("roundId", "studentId");

-- CreateIndex
CREATE INDEX "round_lecturer_quotas_roundId_idx" ON "round_lecturer_quotas"("roundId");

-- CreateIndex
CREATE INDEX "round_lecturer_quotas_lecturerId_idx" ON "round_lecturer_quotas"("lecturerId");

-- CreateIndex
CREATE UNIQUE INDEX "round_lecturer_quotas_roundId_lecturerId_key" ON "round_lecturer_quotas"("roundId", "lecturerId");

-- CreateIndex
CREATE INDEX "proposal_attachments_proposalId_idx" ON "proposal_attachments"("proposalId");

-- CreateIndex
CREATE INDEX "proposal_comments_proposalId_idx" ON "proposal_comments"("proposalId");

-- CreateIndex
CREATE INDEX "proposal_comments_authorId_idx" ON "proposal_comments"("authorId");

-- CreateIndex
CREATE INDEX "proposal_comment_reactions_commentId_idx" ON "proposal_comment_reactions"("commentId");

-- CreateIndex
CREATE INDEX "proposal_comment_reactions_userId_idx" ON "proposal_comment_reactions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "proposal_comment_reactions_commentId_userId_key" ON "proposal_comment_reactions"("commentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "topic_outlines_groupId_key" ON "topic_outlines"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "topic_reviews_groupId_reviewerType_key" ON "topic_reviews"("groupId", "reviewerType");

-- CreateIndex
CREATE UNIQUE INDEX "topic_archives_groupId_key" ON "topic_archives"("groupId");

-- CreateIndex
CREATE INDEX "topic_similarity_checks_topicId_idx" ON "topic_similarity_checks"("topicId");

-- CreateIndex
CREATE INDEX "weekly_logs_groupId_weekNumber_idx" ON "weekly_logs"("groupId", "weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "progress_reports_groupId_stage_key" ON "progress_reports"("groupId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "topic_assignments_groupId_key" ON "topic_assignments"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "student_grades_groupId_studentId_key" ON "student_grades"("groupId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_role_permission" ON "role_permissions"("role", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_permission" ON "user_permissions"("user_id", "permission");

-- AddForeignKey
ALTER TABLE "lecturer_profiles" ADD CONSTRAINT "lecturer_profiles_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "majors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_student_eligibilities" ADD CONSTRAINT "round_student_eligibilities_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "registration_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_student_eligibilities" ADD CONSTRAINT "round_student_eligibilities_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_lecturer_quotas" ADD CONSTRAINT "round_lecturer_quotas_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "registration_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "round_lecturer_quotas" ADD CONSTRAINT "round_lecturer_quotas_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "lecturer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_attachments" ADD CONSTRAINT "proposal_attachments_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "topic_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_comments" ADD CONSTRAINT "proposal_comments_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "topic_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_comments" ADD CONSTRAINT "proposal_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_comment_reactions" ADD CONSTRAINT "proposal_comment_reactions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "proposal_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposal_comment_reactions" ADD CONSTRAINT "proposal_comment_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "majors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_departmentReviewerId_fkey" FOREIGN KEY ("departmentReviewerId") REFERENCES "lecturer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "councils" ADD CONSTRAINT "councils_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "majors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_outlines" ADD CONSTRAINT "topic_outlines_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "registration_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_outlines" ADD CONSTRAINT "topic_outlines_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_outlines" ADD CONSTRAINT "topic_outlines_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_reviews" ADD CONSTRAINT "topic_reviews_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "registration_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_reviews" ADD CONSTRAINT "topic_reviews_lecturerId_fkey" FOREIGN KEY ("lecturerId") REFERENCES "lecturer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_archives" ADD CONSTRAINT "topic_archives_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "registration_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_archives" ADD CONSTRAINT "topic_archives_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_change_requests" ADD CONSTRAINT "topic_change_requests_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "registration_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_change_requests" ADD CONSTRAINT "topic_change_requests_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_similarity_checks" ADD CONSTRAINT "topic_similarity_checks_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_similarity_checks" ADD CONSTRAINT "topic_similarity_checks_matchedTopicId_fkey" FOREIGN KEY ("matchedTopicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_logs" ADD CONSTRAINT "weekly_logs_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "registration_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_logs" ADD CONSTRAINT "weekly_logs_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_reports" ADD CONSTRAINT "progress_reports_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "registration_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_reports" ADD CONSTRAINT "progress_reports_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_assignments" ADD CONSTRAINT "topic_assignments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "registration_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_assignments" ADD CONSTRAINT "topic_assignments_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_assignments" ADD CONSTRAINT "topic_assignments_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "lecturer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_assignments" ADD CONSTRAINT "topic_assignments_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "lecturer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_assignments" ADD CONSTRAINT "topic_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_grades" ADD CONSTRAINT "student_grades_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "registration_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_grades" ADD CONSTRAINT "student_grades_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

