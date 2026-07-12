-- Charges de 50/50 automatique gagnées via un Événement : chacune applique un 50/50 à la prochaine
-- question de combat présentée puis se consomme (cf. BrainrunService.computeQuestionEntryReveal).
-- Persistent entre les combats, contrairement aux charges de Bouclier.
ALTER TABLE "BrainrunRun" ADD COLUMN     "fiftyFiftyCharges" INTEGER NOT NULL DEFAULT 0;
