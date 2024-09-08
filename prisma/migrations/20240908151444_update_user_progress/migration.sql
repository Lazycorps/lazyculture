/*
  Warnings:

  - You are about to drop the column `level` on the `UserProgress` table. All the data in the column will be lost.
  - Added the required column `levelId` to the `UserProgress` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Level" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Level_id_seq";

-- AlterTable
ALTER TABLE "UserProgress" DROP COLUMN "level",
ADD COLUMN     "levelId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
