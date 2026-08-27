-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "authorId" TEXT;

-- CreateTable
CREATE TABLE "QuestionSubmission" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "themes" TEXT[],
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvalCount" INTEGER NOT NULL DEFAULT 0,
    "rejectionCount" INTEGER NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "createdQuestionId" INTEGER,
    "createDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionSubmissionVote" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionSubmissionVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionSubmission_status_idx" ON "QuestionSubmission"("status");

-- CreateIndex
CREATE INDEX "QuestionSubmission_userId_idx" ON "QuestionSubmission"("userId");

-- CreateIndex
CREATE INDEX "QuestionSubmissionVote_submissionId_idx" ON "QuestionSubmissionVote"("submissionId");

-- CreateIndex
CREATE INDEX "QuestionSubmissionVote_userId_idx" ON "QuestionSubmissionVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionSubmissionVote_submissionId_userId_key" ON "QuestionSubmissionVote"("submissionId", "userId");

-- CreateIndex
CREATE INDEX "Question_authorId_idx" ON "Question"("authorId");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSubmission" ADD CONSTRAINT "QuestionSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSubmissionVote" ADD CONSTRAINT "QuestionSubmissionVote_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "QuestionSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSubmissionVote" ADD CONSTRAINT "QuestionSubmissionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
