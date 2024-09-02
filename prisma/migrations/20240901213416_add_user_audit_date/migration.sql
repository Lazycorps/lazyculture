/*
  Warnings:

  - Added the required column `createDate` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updateDate` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updateDate" TIMESTAMP(3) NOT NULL;
