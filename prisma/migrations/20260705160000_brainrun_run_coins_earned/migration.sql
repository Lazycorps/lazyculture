-- Pièces (monnaie globale UserWallet) créditées pendant cette run Brainrun, uniquement aux
-- Boss d'acte vaincus (cf. server/utils/brainrunMetaHelper.ts grantBrainrunActCoins).
ALTER TABLE "BrainrunRun" ADD COLUMN     "coinsEarned" INTEGER NOT NULL DEFAULT 0;
