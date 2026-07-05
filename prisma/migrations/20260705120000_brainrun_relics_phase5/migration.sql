-- AlterTable
ALTER TABLE "BrainrunRun" ADD COLUMN     "bannedThemes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pendingThemeBanChoice" BOOLEAN NOT NULL DEFAULT false;
