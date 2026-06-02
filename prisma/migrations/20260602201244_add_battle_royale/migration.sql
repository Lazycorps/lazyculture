-- CreateTable
CREATE TABLE "BattleRoyaleMatch" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "currentQuestionId" INTEGER,
    "currentQuestionStart" TIMESTAMP(3),
    "currentQuestionDuration" INTEGER,
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleRoyaleMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleRoyalePlayer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lives" INTEGER NOT NULL DEFAULT 3,
    "lastAnsweredRound" INTEGER NOT NULL DEFAULT -1,
    "lastAnswerCorrect" BOOLEAN,
    "lastAnswerTime" TIMESTAMP(3),
    "eliminatedAtRound" INTEGER,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleRoyalePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BattleRoyalePlayer_matchId_userId_key" ON "BattleRoyalePlayer"("matchId", "userId");

-- AddForeignKey
ALTER TABLE "BattleRoyalePlayer" ADD CONSTRAINT "BattleRoyalePlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "BattleRoyaleMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRoyalePlayer" ADD CONSTRAINT "BattleRoyalePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
