-- Brainrun : arbre de talents (Résistance/Dégâts/Utilitaire).
-- Bouclier armé (booléen) -> compteur de charges partagé entre le consommable Bouclier et les
-- talents Bouclier d'Acte/du Boss ; conversion true->1, false->0 avant suppression de la colonne.
ALTER TABLE "BrainrunRun" ADD COLUMN "shieldCharges" INTEGER NOT NULL DEFAULT 0;
UPDATE "BrainrunRun" SET "shieldCharges" = CASE WHEN "shieldArmed" THEN 1 ELSE 0 END;
ALTER TABLE "BrainrunRun" DROP COLUMN "shieldArmed";

-- Talent ultime Second Souffle (Résistance) : résurrection à 2 PV, une fois par run.
ALTER TABLE "BrainrunRun" ADD COLUMN "talentReviveUsed" BOOLEAN NOT NULL DEFAULT false;

-- Talent Intérêts Composés (Utilitaire) : part bonus de knowledgePointsEarned, pour l'affichage
-- détaillé du récap de fin de run ("+24 PS (+3)").
ALTER TABLE "BrainrunRun" ADD COLUMN "knowledgePointsBonus" INTEGER NOT NULL DEFAULT 0;
