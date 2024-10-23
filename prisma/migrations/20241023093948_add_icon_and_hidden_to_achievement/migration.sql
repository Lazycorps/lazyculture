-- AlterTable
ALTER TABLE "Achievement" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "icon" TEXT NOT NULL DEFAULT '';
