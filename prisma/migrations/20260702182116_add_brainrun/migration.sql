-- CreateTable
CREATE TABLE "BrainrunRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "currentAct" INTEGER NOT NULL DEFAULT 1,
    "currentSequence" INTEGER NOT NULL DEFAULT 1,
    "healthPoint" INTEGER NOT NULL,
    "maxHealthPoint" INTEGER NOT NULL,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "usedQuestionIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "xpEarned" INTEGER,
    "createDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),

    CONSTRAINT "BrainrunRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainrunRoom" (
    "id" SERIAL NOT NULL,
    "runId" TEXT NOT NULL,
    "act" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "choiceTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "questionIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "responses" JSONB,
    "goldEarned" INTEGER NOT NULL DEFAULT 0,
    "createDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainrunRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrainrunRun_userId_idx" ON "BrainrunRun"("userId");

-- CreateIndex
CREATE INDEX "BrainrunRun_userId_status_idx" ON "BrainrunRun"("userId", "status");

-- CreateIndex
CREATE INDEX "BrainrunRoom_runId_idx" ON "BrainrunRoom"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "BrainrunRoom_runId_act_sequence_key" ON "BrainrunRoom"("runId", "act", "sequence");

-- AddForeignKey
ALTER TABLE "BrainrunRun" ADD CONSTRAINT "BrainrunRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainrunRoom" ADD CONSTRAINT "BrainrunRoom_runId_fkey" FOREIGN KEY ("runId") REFERENCES "BrainrunRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

