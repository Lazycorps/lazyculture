/*
  Warnings:

  - You are about to drop the column `condition` on the `Achievement` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Achievement` table. All the data in the column will be lost.
  - Added the required column `conditionType` to the `Achievement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conditionValue` to the `Achievement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Achievement" DROP COLUMN "condition",
DROP COLUMN "type",
ADD COLUMN     "conditionType" TEXT NOT NULL,
ADD COLUMN     "conditionValue" INTEGER NOT NULL;
