-- AlterTable
ALTER TABLE "QuestionSubmission" ADD COLUMN     "deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "QuestionSubmission_deleted_idx" ON "QuestionSubmission"("deleted");
