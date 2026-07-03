# Brainrun — Roadmap & Checklist

Mode roguelite solo, indépendant du mode Ascension existant (qui reste inchangé et caché du menu). Développement découpé en 4 phases.

## Phase 1 — Fondations ✅ Terminée (commit `0d19c60`)

- [x] Modèle de données : `BrainrunRun` / `BrainrunRoom` (Prisma), migration `20260702182116_add_brainrun` appliquée en base
- [x] Types partagés (`shared/brainrun.ts`, `shared/DTO/brainrunResponseDTO.ts`)
- [x] Constantes économie/difficulté (`server/utils/brainrunConfig.ts`)
- [x] Algorithme de génération des points de choix par acte, avec quotas (≥50% Standard/Elite pur, ≥1 Boutique, ≥1 Repos, ≥2 Événement) — `server/utils/brainrunLogic.ts`
- [x] Sélection de questions par difficulté sans répétition (`QuestionService.getRandomIdsByDifficulty`)
- [x] `BrainrunService` : démarrage/reprise de run, résolution des choix, soumission des réponses, avancement acte/salle, fin de run (XP + achievements)
- [x] Endpoints API (`current`, `answer`, `choice`, `acknowledge`, `new`, `abandon`)
- [x] Composable `useBrainrunSession`
- [x] Composant `BrainrunQuestionRunner` (dédié, ne touche pas à `QuestionSeries.vue`)
- [x] Page `brainrun.vue` : écran de connexion, HUD (acte/PV/or), écran de choix, placeholder Boutique/Événement, **récap de fin de salle (or gagné / PV perdus)**, écran de fin de run
- [x] Entrée de navigation + route `ssr: false`
- [x] Tests unitaires sur la logique pure (`brainrunLogic.test.ts`)
- [x] Bug corrigé : une salle ne se terminait jamais si la dernière question était ratée sans mourir
- [x] Bug corrigé : la page plantait sur l'écran d'erreur 401 de Nuxt au lieu d'afficher l'écran de connexion

### Limites connues / placeholders assumés en Phase 1

- La salle **Boss** se comporte comme une Elite renforcée (pas de vrai mécanisme "contre-la-montre" — c'est la Phase 2)
- **Boutique** et **Événement** n'ont aucun effet de jeu : juste un écran "en construction" puis la suite (vrai contenu en Phase 3)
- Les valeurs d'XP par salle (`BRAINRUN_XP_BY_ROOM_TYPE`, bonus de victoire) sont des valeurs de départ non équilibrées par des tests réels
- Pas de notification/toast pour les achievements Brainrun débloqués (ils sont bien attribués en base, juste pas remontés visuellement au joueur)
- `vp test`/`vp check` n'ont pas pu être exécutés dans l'environnement de développement utilisé pour écrire le code (problème de résolution d'alias `#shared` propre à ce sandbox) — à confirmer en local

## Phase 2 — Boss "Contre-la-montre" ✅ Terminée (migration `20260702190000_add_brainrun_boss_fight`)

- [x] Modèle de données étendu : `BrainrunRoom.bossHealthPoint` / `bossMaxHealthPoint` / `questionStartedAt` (migration appliquée en base)
- [x] Vrai mécanisme de boss : barre de PV (`BRAINRUN_BOSS_MAX_HP` = 5 × `BRAINRUN_BOSS_BASE_DAMAGE`), dégâts liés à la vitesse de réponse (x2 si réponse correcte en moins de 2s, `brainrunBossDamage` dans `server/utils/brainrunLogic.ts`)
- [x] Chrono par question (10s, `BRAINRUN_BOSS_QUESTION_TIME_MS` dans `shared/brainrun.ts`) ; si le temps expire (`isBossAnswerTimedOut`), la réponse est forcée en échec côté serveur (le boss "riposte") quelle que soit la réponse envoyée par le client
- [x] Le boss peut désormais mourir avant d'avoir épuisé toutes ses questions (salle `CLEARED` immédiatement, contre-la-montre gratifiant la rapidité) ; s'il survit à toutes les questions, la salle se termine comme avant (pas d'échec forcé)
- [x] Résolution "Elite renforcée" remplacée par cette vraie logique dans `BrainrunService.submitAnswer`
- [x] Chrono démarré uniquement quand le joueur a fini de lire le feedback de la question précédente, via un nouvel aller-retour dédié (`POST /api/brainrun/boss-ready`, `BrainrunService.prepareNextBossQuestion`, composable `readyNextBossQuestion`) — évite de décompter le temps de lecture du feedback à l'insu du joueur
- [x] UI dédiée dans `BrainrunQuestionRunner.vue` : barre de vie du boss + barre de chrono visible, auto-soumission au timeout
- [x] Tests unitaires sur `isBossAnswerTimedOut` / `brainrunBossDamage`

### Limites connues / placeholders assumés en Phase 2

- Les valeurs (dégâts de base, seuil "rapide", durée du chrono) sont des valeurs de départ non équilibrées par des tests de jeu réels
- `vp test`/`vp check` exécutés avec succès (0 erreur ; le run direct de `vp test brainrunLogic` échoue toujours sur la résolution d'alias `#shared` propre à ce sandbox, problème déjà identifié en Phase 1 et reproductible aussi sur le code d'avant ces changements — à confirmer que `vp test` complet fonctionne en local)
- Pas de feedback visuel dédié "coup critique" quand le bonus de vitesse s'applique (juste les PV du boss qui baissent plus vite)

## Phase 3 — Build (reliques / consommables) + vrai contenu Boutique/Événement

- [ ] Système de reliques passives (ex: Encyclopédie, Chronomètre Brisé, Spécialisation, Seconde Chance, Adrénaline)
- [ ] Consommables/jokers (50/50, Appel à un ami, Bouclier)
- [ ] Vraie Boutique : achat d'objets/reliques avec l'or accumulé (l'or est déjà suivi depuis la Phase 1, sans usage jusqu'ici)
- [ ] Vrais Événements : choix narratifs avec effets (ex: sacrifier des PV pour bannir une catégorie de questions le reste de la run)
- [ ] Écran de sélection de bonus après salle (3 choix aléatoires selon rareté)

## Phase 4 — Metagame

- [ ] Monnaie meta persistante (Points de Savoir) séparée de l'or de run
- [ ] Arbre de talents permanent (ex: +1 PV de départ, meilleure chance de reliques rares, déblocage de thèmes/skins)
- [ ] Écran d'arbre de talents accessible hors-run (menu principal)

## Divers / non lié à Brainrun mais repéré en cours de route

- [ ] `VAPID_PRIVATE_KEY` / `VAPID_PUBLIC_KEY` manquantes dans `.env` (notifications push, aucun impact sur Brainrun)
