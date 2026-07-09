# Intégrations externes et pièges connus

## Dépendances vers le reste de la plateforme

Brainrun ne réimplémente pas ces systèmes, il les appelle — vérifier l'effet d'un changement de ce côté-là aussi :

- **`QuestionService.getRandomIdsByDifficulty`** (`server/services/QuestionService.ts`) — sélection de questions par plage de difficulté, thèmes, exclusion des questions déjà tirées dans la run (`run.usedQuestionIds`), exclusion des thèmes bannis, et override de plage par thème (utilisé pour la difficulté resserrée de `culture_generale`, voir `rules-and-progression.md`). Toute la logique "quel thème/difficulté pour cette salle" en amont vit dans Brainrun ; ce service ne fait qu'exécuter la requête.
- **`userProgressHelper.updateUserProgress`** — crédite l'XP calculée par `calculBrainrunUserXP` à la fin d'une run. Les reliques/talents n'affectent **pas** l'XP (seulement or/PV/dégâts) — si on veut changer ça un jour, c'est un changement de comportement à documenter ici.
- **`walletHelper.grantCoins`** — pièces `UserWallet`, appelées via `grantBrainrunActCoins` (plafond quotidien partagé avec le quiz du jour — voir `rules-and-progression.md`).
- **`achievementHelper.checkAndAwardAchievements`** — clés `"brainrunGames"` (nombre de runs terminées, toutes issues confondues) et `"brainrunWins"` (nombre de victoires), déclenchées dans `abandonRun`/`finalizeRun`.

## `BRAINRUN_ROADMAP.md` est obsolète — ne pas s'y fier

Ce fichier à la racine du repo documente l'historique des 4 phases de développement (utile pour comprendre _pourquoi_ certains choix ont été faits) mais **ne reflète plus le contenu actuel des catalogues**. Exemple concret constaté : il documente "6 reliques, 3 consommables, 6 événements" (état de fin de Phase 3) alors que le code a aujourd'hui 14 reliques et 10 consommables (des reliques/consommables ont été ajoutés après la Phase 3 sans mise à jour du roadmap). **Source de vérité = le code** (`shared/brainrunItems.ts` etc.), jamais ce markdown pour l'état actuel. Si tu factures une tâche qui clôt une nouvelle "phase" ou un nouveau sous-système notable, envisage de mettre à jour ce fichier aussi — mais ne le lis jamais comme référence fiable en entrant dans une tâche.

## Valeurs de jeu non équilibrées

Quasiment toutes les constantes numériques (`brainrunConfig.ts`, prix/probabilités de `brainrunItems.ts`) sont explicitement documentées en commentaire comme "valeurs de départ, non équilibrées par des tests de jeu réels". Un ajustement de valeur demandé par l'utilisateur n'a donc pas besoin d'être justifié par un historique d'équilibrage préexistant — ce sont des points de départ assumés, pas des valeurs calibrées à respecter scrupuleusement.

## Souci de test connu : alias `#shared`

`server/utils/brainrunLogic.test.ts` peut échouer au chargement du module dans certains environnements sandbox à cause d'un problème de résolution de l'alias `#shared` — problème pré-existant, reproductible même sur du code d'avant les changements en cours, **pas une régression introduite par ta modification**. Voir aussi la mémoire `project_known_test_issue_shared_alias`. Si `vp test brainrunLogic` échoue spécifiquement sur une erreur de résolution de module (pas une assertion qui échoue), ne pas chercher à corriger le code métier pour ça — vérifier plutôt que `vp test` (suite complète) passe, et signaler le point à l'utilisateur pour confirmation en local.

## Concurrence — ce qui est protégé et ce qui ne l'est pas

Seules 2 opérations ont un débit atomique conditionnel anti-double-clic : l'achat en Librairie (`buyShopItem`, `updateMany` avec condition sur l'or) et le déblocage de talent (`unlockTalent`). **Tout le reste** (`resolveBonus`, `useConsumable`, `resolveEvent`, `grantConsumable`, découverte de glossaire) est en lecture-puis-écriture, risque résiduel mineur de double-clic déjà assumé depuis la Phase 1. Si tu ajoutes une opération qui débite une ressource limitée (or, PV, quantité de consommable), aligne-toi sur le patron atomique existant plutôt que d'introduire un nouveau read-then-write non protégé — sauf si l'enjeu est aussi faible que l'existant (auquel cas, cohérence avec le reste > sur-ingénierie).

## Mode caché de la navigation principale

`app/layouts/default.vue` a l'entrée de menu Brainrun commentée — le mode n'est accessible que via l'URL directe. Ne pas la décommenter sans qu'on te le demande explicitement (le mode n'a pas encore été validé par du testing manuel réel, cf. `rules-and-progression.md`).
