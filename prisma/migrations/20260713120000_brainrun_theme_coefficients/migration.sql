-- Rework des drops de questions : coefficients de thème par run (cf. BRAINRUN_THEME_COEFFICIENTS_PLAN.md).
-- themeCoefficients : Record<themeSlug, number>, pondère le tirage des questions ; monté par les cartes post-combat.
-- excludedQuestionIds : anti-répétition inter-runs (exclusion souple, questions des 2 runs précédentes).
-- excludedCardThemes : thèmes jamais proposés en carte cette run (top-3 des 2 dernières runs valides).
-- reachedFirstBoss : marque une run "valide" (a atteint le boss de l'Acte 1) pour l'anti-répétition.
ALTER TABLE "BrainrunRun" ADD COLUMN     "excludedQuestionIds" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "themeCoefficients" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "excludedCardThemes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reachedFirstBoss" BOOLEAN NOT NULL DEFAULT false;

-- Étape carte de thème post-combat, persistée sur la salle (résolue avant offers pour élite/boss).
ALTER TABLE "BrainrunRoom" ADD COLUMN     "themeCardOffer" JSONB,
ADD COLUMN     "themeCardResolved" BOOLEAN NOT NULL DEFAULT false;
