# Coefficients de thème & cartes post-combat

Système ajouté sur la branche `feat/brainrun-theme-coefficients` (2026-07). Le joueur oriente la
nature des questions qu'il rencontre en investissant dans des thèmes au fil de la run (via des
**cartes de thème** gagnées après chaque combat), pendant que chaque ennemi pousse temporairement
ses propres thèmes. Anti-répétition sur les cartes et les questions pour varier les runs.

## Modèle de données

`BrainrunRun` (migration `prisma/migrations/20260713120000_brainrun_theme_coefficients/`) :

- `themeCoefficients` — `Json` défaut `{}` : `Record<slug, number>`, thème absent = 0. Monté par les
  cartes post-combat. Exposé au client via `BrainrunRunDTO.themeCoefficients` (`toRunDTO`).
- `reachedFirstBoss` — `Boolean @default(false)` : marqué à l'entrée du Boss de l'Acte 1
  (`chooseNode`). Identifie les **runs valides** pour l'anti-répétition des cartes.
- `excludedCardThemes` — `String[]` : figé au démarrage (union des top-3 des 2 dernières runs
  valides). Thèmes exclus des cartes proposées cette run.
- `excludedQuestionIds` — `Int[]` : figé au démarrage (union des `usedQuestionIds` des 2 runs
  précédentes). Exclusion **souple** des questions récemment servies.

`BrainrunRoom` :

- `themeCardOffer` — `Json?` : `BrainrunThemeCardDTO[]` (3 cartes) ou `null` si pas d'étape carte.
- `themeCardResolved` — `Boolean @default(false)` : passe à `true` une fois la carte choisie/passée.

DTO partagés (`shared/brainrun.ts`) : `BrainrunThemeCardRarity` (`STANDARD`|`RARE`|`EPIC`|
`LEGENDARY`), `BrainrunThemeCardDTO` (`themeSlug`/`themeName`/`themeImage`/`rarity`/`coefBefore`/
`coefAfter`). Choix client : `BrainrunThemeCardChoiceDTO` (`pick` = slug ou `"SKIP"`).

## Constantes (`server/utils/brainrunConfig.ts`)

- `BRAINRUN_THEME_CARD_COUNT` = 3.
- `BRAINRUN_THEME_CARD_COEFFICIENT_BY_RARITY` = STANDARD +1 / RARE +2 / EPIC +3 / LEGENDARY +5.
- `BRAINRUN_THEME_CARD_RARITY_WEIGHT` = 65 / 22 / 10 / 3 (total 100 → % directs).
- `BRAINRUN_THEME_CARD_INVESTED_CHANCE` = 0.1 : proba, **par carte**, que le thème soit tiré parmi
  ceux déjà investis (coef > 0) plutôt que dans le pool d'ennemi (cf. injection ci-dessous).
- `BRAINRUN_THEME_COEFFICIENT_MAX` = 10 : plafond du coefficient d'un thème sur une run. `coefAfter`
  est tronqué à cette valeur ; un thème déjà au plafond n'est plus injecté comme « thème investi »
  (une carte à +0 serait inutile). Seule source d'écriture des coefs à ne pas oublier : le debug
  (`debugSetStats`) n'applique **pas** ce plafond (échappatoire dev assumée).
- `BRAINRUN_THEME_MIN_QUESTION_VOLUME` = 25 : volume minimal (toutes difficultés) pour qu'un thème
  soit proposable en carte / tirable — écarte les thèmes trop maigres.
- `BRAINRUN_ENEMY_THEME_BONUS_BY_ACT` = `{1:1, 2:2, 3:3}` ; `BRAINRUN_ENEMY_THEME_BONUS_TIER_MULTIPLIER`
  = `{CLASSIC:1, ELITE:2, BOSS:3}`.

## Tirage des questions piloté par coefficients

`enemyThemeBonus(act, tier)` (`brainrunLogic.ts`) = base d'acte × multiplicateur de tier (ex. boss
Acte 3 → 3×3 = 9). `buildCombatThemeWeights(playerCoefs, enemyThemes, enemyBonus, banned)` construit
le **pool éligible** = thèmes de l'ennemi (déjà filtrés des bannis via `effectiveThemes`) ∪ thèmes
investis (coef > 0, hors bannis) ; **poids** d'un thème = coefficient joueur + bonus de l'ennemi (ce
dernier seulement sur les thèmes de l'ennemi). Ne renvoie que des poids strictement positifs.

Côté service, `chooseNode`/`getNextBossQuestionId` tirent via **`QuestionService.
getRandomIdsByThemeWeights(...)`** (nouvelle méthode, `getRandomIdsByDifficulty` gardée intacte pour
ses appelants génériques) : sélection du thème **par question** au poids, puis une question de ce
thème, fresh-first, avec `softExcludeIds` (= `excludedQuestionIds`) relâché par thème avant
l'élargissement de difficulté ; filet de secours = `getRandomIdsByDifficulty`. Override
`culture_generale` par acte et no-doublon intra-run (`usedQuestionIds`) conservés en dur.

> Gap mineur assumé : le consommable Nouvelle Pioche (`getReplacementQuestionId`) reste uniforme sur
> les thèmes de la salle (pas pondéré par coefficients), mais reste on-theme.

## Cartes de thème (récompense post-combat)

Après **chaque combat gagné** (standard/élite/boss non final), `generateThemeCardOffer`
(`BrainrunService`) construit **deux pools** : (1) le pool d'ennemi = thèmes des catalogues
ennemis/boss, hors bannis/exclus (**filet** : si l'exclusion laisse < 3 proposables, on relâche
`excludedCardThemes`) ; (2) les **thèmes déjà investis** de la run (coef > 0, hors bannis — mais
PAS filtrés par `excludedCardThemes`, ce sont les investissements en cours qu'on veut renforcer).
Les métadonnées (name/picture) des deux pools viennent d'une seule requête `prisma.questionTheme`.
`generateThemeCards(candidates, coefficients, count, random, investedCandidates)` (`brainrunLogic.ts`,
pure/testable) tire `count` thèmes **distincts** : pour chaque carte, `BRAINRUN_THEME_CARD_INVESTED_CHANCE`
(10 %) de la tirer dans le pool investi (repli sur le pool d'ennemi s'il est vide, et inversement),
sinon tirage uniforme (Fisher-Yates) dans le pool d'ennemi ; puis rareté pondérée et
`coefBefore → coefAfter`. Une carte injectée depuis le pool investi a donc un `coefBefore > 0`
(progression visible côté UI).

`resolveThemeCard(runId, pick, userId)` : `pick` = slug → `themeCoefficients[slug] = coefAfter`
persisté ; `pick` = `"SKIP"` → **sélection obligatoire par défaut**, le SKIP est refusé (403) sauf
si la relique **Libre Arbitre** (`canSkipThemeCard`) est possédée, auquel cas il applique **aussi**
**Lot de Consolation** (`goldOnBonusSkip`, réutilise `getActiveRelicEffects`, comme un bonus passé).
Côté client, le bouton « Passer » (`BrainrunThemeCardSelect.vue`) n'est rendu qu'avec la relique
(`canSkip`, dérivé de `run.relics` dans `index.vue`, même patron que `hasForesight`). Ne fait **pas**
avancer la salle — c'est
`acknowledgeRoom` qui le fait, une fois carte ET bonus éventuel résolus. `acknowledgeRoom` **bloque**
tant que `themeCardOffer` non-null et non résolu (même patron bloquant que `offersRequireChoice`).
Route : `POST /api/brainrun/theme-card` → `resolveThemeCard`.

**Séquence** (machine à états `app/pages/brainrun/index.vue`) : **carte** → récap →
(bonus relique/consommable pour élite/boss) → salle suivante. La carte est présentée **avant** le
récap : la chaîne `v-else-if` place le bloc `BrainrunThemeCardSelect` (piloté directement par
`pendingThemeCards`, l'offre serveur non résolue) devant le bloc récap. Choisir/passer la carte
résout l'offre (→ `null`), le récap s'affiche alors à sa place ; son bouton « Continuer »
(`handleRecapContinue`) enchaîne sur le bonus ou avance la salle. Standard = carte seule. Boss final
(`isRunWinningBoss`) = **aucun drop** (le serveur ne génère pas de carte).

## Anti-répétition

- **Cartes** : `computeRunExclusions` (câblé dans `createRun`) fige `excludedCardThemes` = union des
  `topThemes(coefs, 3)` des 2 dernières runs **valides** (`reachedFirstBoss = true`). Une run valide
  = a atteint le Boss de l'Acte 1, quel que soit son issue.
- **Questions** : `excludedQuestionIds` = union des `usedQuestionIds` des 2 runs précédentes (toutes
  runs confondues). Exclusion **souple** best-effort, relâchée automatiquement si le vivier
  thème×difficulté devient trop maigre, avant l'élargissement de difficulté. Le no-doublon intra-run
  reste garanti en dur.

## Difficulté par type de combat (à plat sur les actes)

`BRAINRUN_DIFFICULTY_BY_COMBAT_TYPE` (renommage de l'ancien `BRAINRUN_DIFFICULTY_BY_ACT`) = STANDARD
[1,3] / ELITE [1,4] / BOSS [2,5] — plus de modulation par acte. **Exception `culture_generale`** :
garde un override par acte (`BRAINRUN_CULTURE_GENERALE_DIFFICULTY_BY_ACT` = [1,2]/[2,3]/**[3,5]** —
seul changement : l'ancien [4,5] de l'Acte 3 devient [3,5]). Conséquence assumée : un boss d'Acte 1
tire ses thèmes non-CG en [2,5] (plus dur qu'avant). Voir `rules-and-progression.md`.

## UI

- `BrainrunThemeCardSelect.vue` : 3 cartes (illustration/libellé du thème en fond, rareté
  classique/bleu/mauve/orange + lueur, progression « coefBefore → coefAfter (+delta) », bouton Passer).
- `BrainrunCoefficientsModal.vue` + bouton HUD (icône graphique près du compteur de rangée) : thèmes
  investis (coef > 0) triés coef décroissant puis alphabétique (`topThemes` côté serveur, tri inline
  côté client), barre relative + valeur, état vide.
- Composable `useBrainrunSession` : `resolveThemeCard(pick)` + computed `pendingThemeCards` (offre non
  résolue de `currentRoom`).

## Debug

`debugSetStats` accepte `themeCoefficients?: Record<slug, number>` (fusion dans les coefs de la run,
un coef ≤ 0 retire le thème) — DTO + route + composable + select de thème investissable (union des
catalogues ennemis/boss) dans `BrainrunDebugPanel.vue`. Voir `debug-mode.md`.

## Pièges

- **Volume de questions** : bandes plus larges = viviers plus grands, mais un thème de niche investi
  peut manquer de questions en Élite [1,4]/Boss [2,5] → le tirage par question DOIT retomber sur un
  autre thème si le thème pioché est vide en bande. Re-vérifier le volume réel (union dédupliquée par
  bande) via une requête Prisma, pas le snapshot mémoire.
- **Purge Thématique** : un thème banni ne doit être ni tirable (`effectiveThemes` /
  `buildCombatThemeWeights` filtre `banned`) ni proposable en carte (filtre de `generateThemeCardOffer`).
- **Lot de Consolation** : réutiliser `goldOnBonusSkip` existant, ne pas dupliquer.
- **Concurrence** : `resolveThemeCard` modifie la run — passer par le patron bloquant
  (`themeCardResolved` / `acknowledgeRoom`), pas un chemin non protégé.
- **DTO/toRunDTO/toRoomDTO** : tout nouveau champ persistant doit remonter jusqu'au client.
