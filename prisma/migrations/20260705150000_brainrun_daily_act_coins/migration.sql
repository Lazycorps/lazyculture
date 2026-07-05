-- Suivi du plafond journalier de pièces gagnées via les paliers d'acte Brainrun
-- (server/utils/brainrunMetaHelper.ts grantBrainrunActCoins).
ALTER TABLE "BrainrunMetaProgress" ADD COLUMN     "coinsEarnedDate" DATE,
ADD COLUMN     "coinsEarnedToday" INTEGER NOT NULL DEFAULT 0;
