-- CreateTable
CREATE TABLE "QuestionReporting" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,
    "commentaire" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionReporting_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuestionReporting" ADD CONSTRAINT "QuestionReporting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionReporting" ADD CONSTRAINT "QuestionReporting_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
