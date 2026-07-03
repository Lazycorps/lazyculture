-- AlterTable
ALTER TABLE "BrainrunRun" ADD COLUMN     "knowledgePointsEarned" INTEGER;

-- CreateTable
CREATE TABLE "BrainrunMetaProgress" (
    "userId" TEXT NOT NULL,
    "knowledgePoints" INTEGER NOT NULL DEFAULT 0,
    "unlockedTalents" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainrunMetaProgress_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "BrainrunMetaProgress" ADD CONSTRAINT "BrainrunMetaProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
