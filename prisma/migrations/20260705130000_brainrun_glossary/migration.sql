-- AlterTable
ALTER TABLE "BrainrunMetaProgress" ADD COLUMN     "discoveredRelics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "discoveredConsumables" TEXT[] DEFAULT ARRAY[]::TEXT[];
