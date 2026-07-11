# Classement Brainrun

Onglet « Brainrun » de la page **Classements** (`/ranking`), au même niveau que XP / BR /
Showdown / Quotidien. Range les joueurs par progression dans le mode roguelite.

## Source de données — aucune table dédiée

Tout est **dérivé des runs existantes** (`BrainrunRun`), sans champ persistant ni migration.
Runs prises en compte : `status ∈ {WON, LOST, ABANDONED}` **et** `isDebugRun = false` (mêmes
exclusions que `BrainrunService.getRunStats` — pas de run en cours, pas de run de debug).

## Règles de classement (dans l'ordre)

1. **Étage max atteint** (décroissant). Étage global linéaire sur les 3 actes via
   `brainrunGlobalFloor(act, row)` (`server/utils/brainrunLogic.ts`), offsets calculés avec
   `getBrainrunRoomsPerAct` (Acte 1 → 1‑10, Acte 2 → 11‑19, Acte 3 → 20‑28). Une run **gagnée**
   (`WON`) est forcée au-dessus du plafond non-gagné (`Number.MAX_SAFE_INTEGER`) : les
   vainqueurs (« Victoire ») sont toujours en tête, même face à une défaite atteignant la
   rangée du boss final.
2. **Entre vainqueurs** : d'abord **moins de runs jusqu'à la 1ʳᵉ victoire** (`runsToFirstVictory`,
   calculé par marche chronologique sur `createDate` jusqu'au 1ᵉʳ `WON` inclus), puis **plus de
   victoires** (`victoryCount`).
3. **Entre non-vainqueurs, à étage égal** : **moins de runs terminées** (`totalRuns`).
4. Départage final stable : `userId`.

## Découpage des couches

- **Logique pure / testable** — `server/utils/brainrunLogic.ts` :
  `brainrunGlobalFloor(act, row)` et `rankBrainrunPlayers(runs)` (agrégation par joueur + tri
  complet ; ne connaît que des runs déjà filtrées). Types `BrainrunRankRun` / `BrainrunRankEntry`.
  Testés dans `brainrunLogic.test.ts` (bornes d'étage, ordre vainqueurs/non-vainqueurs,
  départages, comptage all-finished).
- **Orchestration DB** — `server/services/RankingService.ts` → `getBrainrunTop()` : `findMany`
  (colonnes minimales) → `rankBrainrunPlayers(...).slice(0, 20)` → hydratation des infos
  d'affichage (`name`/avatar/frame) en une requête `user.findMany`. Même style que
  `getBattleRoyaleTop()`.
- **DTO** — `shared/DTO/brainrunRankingDTO.ts` (`BrainrunRankingDTO` : `userId`, `name`,
  `avatarUrl`, `frameStyleKey`, `bestAct`, `bestRow`, `isVictory`, `victoryCount`, `totalRuns`).
- **Route API** — `server/api/ranking/brainrun.get.ts` (délègue à `rankingService.getBrainrunTop()`).
- **UI** — `app/pages/ranking/index.vue` : onglet `currentTab === 'brainrun'`, fetch
  `/api/ranking/brainrun`, branches d'affichage podium + liste réutilisant le design existant.
  Helpers `brainrunFloorText` (« 🏆 Victoire » ou « Acte X · Étage Y ») et `brainrunSubText`
  (nb de victoires pour les vainqueurs, sinon nb de runs).

## Pièges / points d'attention

- **Ne pas** faire un `groupBy` Prisma avec `_max` séparé sur `currentAct` et `currentRow` :
  ça combinerait l'acte max d'une run avec la rangée max d'une autre → étage faux. L'agrégat
  se fait run par run (via `brainrunGlobalFloor`), d'où le choix de trier en mémoire.
- **Mode caché** : le mode reste retiré de la navigation principale
  (`app/layouts/default.vue`, commenté). Cet onglet expose Brainrun dans les Classements
  publics — c'est voulu (demande explicite), mais à garder en tête si on veut tout gater
  jusqu'au lancement.
- Un joueur n'apparaît qu'avec ≥ 1 run terminée non-debug. Message vide générique réutilisé.
