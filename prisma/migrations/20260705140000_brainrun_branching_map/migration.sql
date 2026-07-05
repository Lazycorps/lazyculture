-- Passage de Brainrun d'une progression linéaire (sequence 1..7) à une carte à embranchements
-- (row/col + arêtes). Les BrainrunRoom existantes appartiennent toutes à des runs déjà
-- terminées/abandonnées (aucune run IN_PROGRESS au moment de cette migration, cf. script de
-- purge exécuté avant) : leur détail salle par salle n'est jamais réaffiché une fois la run
-- close (seuls les agrégats gold/xpEarned/knowledgePointsEarned sur BrainrunRun le sont), donc
-- on les supprime plutôt que d'inventer des valeurs row/col/type arbitraires pour les colonnes
-- désormais NOT NULL ci-dessous.
DELETE FROM "BrainrunRoom";

-- DropIndex
DROP INDEX "BrainrunRoom_runId_act_sequence_key";

-- AlterTable
ALTER TABLE "BrainrunRun" DROP COLUMN "currentSequence",
ADD COLUMN     "currentCol" INTEGER,
ADD COLUMN     "currentRow" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "BrainrunRoom" DROP COLUMN "choiceTypes",
DROP COLUMN "sequence",
ADD COLUMN     "col" INTEGER NOT NULL,
ADD COLUMN     "nextCols" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "row" INTEGER NOT NULL,
ALTER COLUMN "type" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BrainrunRoom_runId_act_row_col_key" ON "BrainrunRoom"("runId", "act", "row", "col");
