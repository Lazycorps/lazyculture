-- AlterTable
ALTER TABLE "BrainrunRoom" ADD COLUMN     "enemyId" TEXT;

-- AlterTable
ALTER TABLE "BrainrunRun" ADD COLUMN     "usedEnemyIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

