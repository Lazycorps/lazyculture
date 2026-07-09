-- Résultat réellement appliqué de l'option d'Événement choisie (cf. BrainrunService.resolveEvent),
-- affiché au joueur à la place du récap générique or/PV une fois la salle CLEARED.
ALTER TABLE "BrainrunRoom" ADD COLUMN     "eventOutcome" JSONB;
