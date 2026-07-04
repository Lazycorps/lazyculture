-- AlterTable
ALTER TABLE "BrainrunRoom" ADD COLUMN     "bossId" TEXT,
ADD COLUMN     "bossPhase" INTEGER NOT NULL DEFAULT 0;
