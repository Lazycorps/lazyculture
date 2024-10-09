-- CreateTable
CREATE TABLE "QuestionSeries" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "data" JSONB,
    "createDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userCreate" TEXT NOT NULL,
    "userUpdate" TEXT NOT NULL,

    CONSTRAINT "QuestionSeries_pkey" PRIMARY KEY ("id")
);
