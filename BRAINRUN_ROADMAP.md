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
- [x] Route `ssr: false` ; entrée de navigation retirée du menu principal (`app/layouts/default.vue`) tant que le mode n'est pas terminé — accessible uniquement via l'URL directe `/series/brainrun`
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
- [x] Le boss peut désormais mourir avant d'avoir épuisé toutes ses questions (salle `CLEARED` immédiatement, contre-la-montre gratifiant la rapidité)
- [x] **Correctif** : le combat de boss n'a plus de limite de questions — il ne se terminait auparavant (à tort) qu'après un pool fixe de 5 questions même si le boss n'était pas à 0 PV. Désormais une nouvelle question est tirée à la volée (`BrainrunService.getNextBossQuestionId`) tant que `bossHealthPoint > 0` ; la salle ne se termine (`CLEARED`) que lorsque le boss atteint exactement 0 PV (visible côté UI, barre + `0/max`), ou par la mort du joueur
- [x] Résolution "Elite renforcée" remplacée par cette vraie logique dans `BrainrunService.submitAnswer`
- [x] Chrono démarré uniquement quand le joueur a fini de lire le feedback de la question précédente, via un nouvel aller-retour dédié (`POST /api/brainrun/boss-ready`, `BrainrunService.prepareNextBossQuestion`, composable `readyNextBossQuestion`) — évite de décompter le temps de lecture du feedback à l'insu du joueur
- [x] UI dédiée dans `BrainrunQuestionRunner.vue` : barre de vie du boss + barre de chrono visible, auto-soumission au timeout
- [x] Tests unitaires sur `isBossAnswerTimedOut` / `brainrunBossDamage`

### Limites connues / placeholders assumés en Phase 2

- Les valeurs (dégâts de base, seuil "rapide", durée du chrono) sont des valeurs de départ non équilibrées par des tests de jeu réels
- `vp test`/`vp check` exécutés avec succès (0 erreur ; le run direct de `vp test brainrunLogic` échoue toujours sur la résolution d'alias `#shared` propre à ce sandbox, problème déjà identifié en Phase 1 et reproductible aussi sur le code d'avant ces changements — à confirmer que `vp test` complet fonctionne en local)
- Pas de feedback visuel dédié "coup critique" quand le bonus de vitesse s'applique (juste les PV du boss qui baissent plus vite)
- Un combat de boss très long (joueur ratant beaucoup de questions) peut épuiser le vivier de questions inédites du palier de difficulté ; dans ce cas on retombe sur des questions déjà vues plutôt que de bloquer le combat (`getNextBossQuestionId`, filet de sécurité non testé en conditions réelles)

**PR ouverte** : [#5 — feat: add Brainrun mode (boss fights + foundations)](https://github.com/Lazycorps/lazyculture/pull/5) (commit `752d514`). Avant merge sur `main`, tests de non-régression manuels à effectuer (pas d'E2E automatisé) :

- Run Brainrun complet : salles Standard/Elite/Repos, combat de boss jusqu'à 0 PV exact, mort du joueur (run `LOST`), victoire des 3 actes (run `WON`), reprise après rechargement de page, abandon de run.
- Non-régression sur `QuestionService`/`ResponseService` (refactor `isCorrectAnswer`, `shuffleArray` rendu public) : répondre à une question sur Thèmes / Série quotidienne / Aventure enregistre toujours succès/échec correctement.
- Application propre des deux migrations Prisma (`add_brainrun`, `add_brainrun_boss_fight`) sur une base à jour.

## Phase 3 — Build (reliques / consommables) + vrai contenu Boutique/Événement ✅ Terminée

- [x] Modèle de données étendu : `BrainrunRun.relics`/`consumables`/`shieldArmed`, `BrainrunRoom.offers`/`offersRequireChoice`/`offersResolved`/`eventId`/`consumableReveal` (migration `20260703120000_add_brainrun_relics_shop` appliquée en base)
- [x] Catalogue de contenu partagé client/serveur (`shared/brainrunItems.ts`), sur le modèle de `brainrunConfig.ts` : 6 reliques, 3 consommables, 6 événements
- [x] Système de reliques passives : Encyclopédie (+20% or), Chronomètre Brisé (+3s chrono boss), Spécialisation (-1 PV perdu, plancher 1), Seconde Chance (annule la mort une fois), Adrénaline (+5 dégâts boss), Bourse Providentielle (+5 or flat) — agrégées via `getActiveRelicEffects` et composées par-dessus la logique de combat existante (`applyRelicsToHpLoss`/`ToGold`/`ToBossDamage`, `bossQuestionTimeMsWithRelics`) sans modifier les fonctions pures de la Phase 2
- [x] Consommables : 50/50 (élimine la moitié des mauvaises propositions, arrondi inférieur), Appel à un ami (suggère une réponse, risque d'erreur de 0% à 20% selon la difficulté), Bouclier (annule la prochaine perte de PV, combat ou Événement, non stackable) — `pickFiftyFiftyEliminations`/`pickPhoneAFriendHint`/`consumeShieldIfArmed`
- [x] Vraie Boutique (`BrainrunShop.vue`) : 2 offres reliques + 2 consommables, achat atomique (débit d'or conditionnel `updateMany`), retombe sur de l'or gratuit si le pool de reliques est épuisé, boutons d'achat visuellement désactivés (grisés) si l'or est insuffisant
- [x] Vrais Événements (`BrainrunEvent.vue`) : 6 événements à 2 choix (sûr/risqué) — Marché noir, Autel sacrificiel, Bibliothèque défendue, Oracle mystique, Esprit généreux (consommable aléatoire gratuit), Échange mystique (sacrifie une relique possédée au hasard contre une autre relique aléatoire non possédée, ou rien si aucune relique possédée) ; effets hp/gold/relique aléatoire/consommable aléatoire (`resolveEventOption`)
- [x] Écran de sélection de bonus après salle Elite/Boss (`BrainrunBonusSelect.vue`) : 3 offres (reliques non possédées pondérées par rareté, complétées par des consommables puis de l'or si le pool est épuisé), ou passer (`SKIP`)
- [x] La toute première salle de l'acte 1 est garantie être un combat pur (Standard/Elite), jamais Boutique/Repos/Événement dès le début de la run (`generateActChoicePoints(random, forceFirstPure)`)
- [x] HUD : reliques possédées affichées sous l'en-tête ; à droite sur la même ligne, 3 emplacements fixes de consommables (icône + badge de quantité, remplis de gauche à droite, vides en pointillés sinon) ; boutons d'usage des consommables dans `BrainrunQuestionRunner.vue` pendant une question
- [x] Tests unitaires sur toute la nouvelle logique pure (`brainrunLogic.test.ts`)

### Limites connues / placeholders assumés en Phase 3

- Événement "bannir une catégorie de questions" cité comme piste dans la roadmap initiale : **hors scope**, remplacé par des événements aux effets hp/gold/relique/consommables (aurait nécessité de faire remonter un filtre de thème jusqu'à `QuestionService.getRandomIdsByDifficulty`)
- L'XP de fin de run n'est pas affectée par les reliques (`calculBrainrunUserXP` inchangé) — seuls or/PV/dégâts le sont
- Concurrence : seul l'achat en Boutique est protégé par un débit d'or atomique conditionnel ; `resolveBonus`/`useConsumable`/`resolveEvent` restent en lecture-puis-écriture comme le reste du service Brainrun (risque résiduel mineur de double-clic, déjà présent en Phase 1/2)
- Bouclier non stackable (un seul actif à la fois) ; pas de plafond de stack sur les autres consommables
- Runs Phase 1/2 déjà en base : migrent silencieusement (`relics=[]`, `consumables={}`, `offers=null`), `acknowledgeRoom` traite `offers === null` comme "rien à résoudre"
- `vp check` : 0 erreur après correctifs de formatage. `vp test brainrunLogic`/`vp test` complet : le run direct échoue toujours sur la résolution d'alias `#shared` propre à ce sandbox (problème déjà identifié en Phase 1/2, reproductible aussi sur le code d'avant ces changements) — à confirmer que `vp test` complet fonctionne en local
- Valeurs (prix Boutique, taux de reliques par rareté, montants des Événements) non équilibrées par des tests de jeu réels

## Phase 4 — Metagame

- [ ] Monnaie meta persistante (Points de Savoir) séparée de l'or de run
- [ ] Arbre de talents permanent (ex: +1 PV de départ, meilleure chance de reliques rares, déblocage de thèmes/skins)
- [ ] Écran d'arbre de talents accessible hors-run (menu principal)

## Divers / non lié à Brainrun mais repéré en cours de route

- [ ] `VAPID_PRIVATE_KEY` / `VAPID_PUBLIC_KEY` manquantes dans `.env` (notifications push, aucun impact sur Brainrun)
