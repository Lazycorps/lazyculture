/*
  Warnings:

  - Added the required column `closed` to the `QuestionReporting` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QuestionReporting" ADD COLUMN     "closed" BOOLEAN NOT NULL;
