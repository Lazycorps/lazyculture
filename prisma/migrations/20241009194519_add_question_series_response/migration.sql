-- CreateTable
CREATE TABLE "QuestionSeriesResponse" (
    "id" SERIAL NOT NULL,
    "seriesId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB,
    "createDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionSeriesResponse_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QuestionSeriesResponse" ADD CONSTRAINT "QuestionSeriesResponse_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "QuestionSeries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionSeriesResponse" ADD CONSTRAINT "QuestionSeriesResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
