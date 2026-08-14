-- Érudition : degrés de difficulté persistants du mode Brainrun (cf. shared/brainrunErudition.ts).
-- Le niveau d'une run est figé à sa création ; 0 = comportement historique, donc les runs
-- existantes gardent exactement leur équilibrage d'origine.
ALTER TABLE "BrainrunRun" ADD COLUMN     "erudition" INTEGER NOT NULL DEFAULT 0;

-- Plus haut niveau d'Érudition jouable : monte de 1 à chaque run GAGNÉE au niveau courant (jamais
-- via une run de debug), plafonné à BRAINRUN_MAX_ERUDITION.
ALTER TABLE "BrainrunMetaProgress" ADD COLUMN     "maxEruditionUnlocked" INTEGER NOT NULL DEFAULT 0;
