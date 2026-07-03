-- AlterTable
ALTER TABLE "BrainrunRun" ADD COLUMN     "relics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "consumables" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "shieldArmed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "BrainrunRoom" ADD COLUMN     "offers" JSONB,
ADD COLUMN     "offersRequireChoice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offersResolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "consumableReveal" JSONB;
