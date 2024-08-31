/*
  Warnings:

  - Added the required column `createDate` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `difficulty` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updateDate` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userCreate` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userUpdate` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "createDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "difficulty" INTEGER NOT NULL,
ADD COLUMN     "language" TEXT NOT NULL,
ADD COLUMN     "source" TEXT NOT NULL,
ADD COLUMN     "updateDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userCreate" TEXT NOT NULL,
ADD COLUMN     "userUpdate" TEXT NOT NULL,
ALTER COLUMN "data" DROP NOT NULL;
