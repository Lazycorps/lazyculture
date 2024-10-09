/*
  Warnings:

  - Added the required column `date` to the `QuestionSeries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `QuestionSeries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QuestionSeries" ADD COLUMN     "date" DATE NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;
