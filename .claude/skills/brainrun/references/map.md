# Gestion de la carte (map à embranchements)

Deuxième redesign (2026-07-09, sur la base du redesign "branching map" du 2026-07-05) : rework façon
Slay the Spire — un vrai nœud de démarrage neutre, un palier de repos garanti juste avant le boss,
plus de largeur, et une garantie stricte sur le nombre d'Élites rencontrées par run.

## Forme de la carte

9 "étages" par acte (le nœud neutre de démarrage ne compte pas dans les 9) :

| #                                  | Contenu                                                                                                                                                                                                                                                       | Largeur | Générée par                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------ |
| Neutre (**acte 1 uniquement**)     | `NEUTRAL`, aucune question, déjà `CLEARED` dès la création de la run                                                                                                                                                                                          | 1       | `generateActGraph` (pas `assignNodeTypes`) |
| Étage 1                            | forcé **3× Standard**, aucune Élite/salle spéciale, sur **chaque acte**                                                                                                                                                                                       | 3       | `assignNodeTypes`                          |
| Étages 2-7 ("du milieu", 6 étages) | libres (Standard/Élite/Boutique/Repos/Événement par quotas), largeurs volontairement variées (`BRAINRUN_MID_FLOOR_WIDTHS` = `[2, 3, 4, 4, 3, 2]`) — les rangées à 4 nœuds restent rares (2 sur les 6), des rangées à 2 nœuds resserrent la carte par endroits | 2 à 4   | `assignNodeTypes`                          |
| → dont un de ces 6 étages          | forcé **100% Élite** (position fixée par `BRAINRUN_FORCED_ELITE_MID_FLOOR_INDEX`)                                                                                                                                                                             | idem    | `assignNodeTypes`                          |
| Étage 8                            | forcé **100% Bibliothèque (REST)** — repos garanti avant le boss, comme les feux de camp de Slay the Spire                                                                                                                                                    | 3       | `assignNodeTypes`                          |
| Étage 9                            | Boss                                                                                                                                                                                                                                                          | 1       | `generateActGraph`                         |

- **Acte 1** : rangée 1 = nœud Neutre, rangées 2-10 = étages 1-9. **10 rangées** au total
  (`getBrainrunActRowWidths(1)` = `[1, 3, 2, 3, 4, 4, 3, 2, 3, 1]`).
- **Actes 2 et 3** : pas de nœud Neutre persisté — dès que le boss de l'acte précédent est nettoyé,
  l'acte suivant démarre directement sur son étage 1 (3× Standard), exactement comme un changement
  d'acte réinitialise `currentRow` à 1 (`getCandidateCols` : "aucun nœud `CLEARED` en amont" ⇒ tous
  les nœuds de la rangée 1 sont candidats). Le nœud de boss de l'acte précédent reste affiché à
  l'écran comme le sommet visuel de la carte suivante, mais **aucune arête réelle ne relie les deux
  actes en base** (les rooms restent scopées par `act`, `getCandidateCols`/`computeVisibleCols`
  n'ont pas été modifiés pour traverser la frontière d'acte — choix délibéré pour ne pas complexifier
  ce scoping). **9 rangées** au total (`getBrainrunActRowWidths(2 | 3)` = `[3, 2, 3, 4, 4, 3, 2, 3, 1]`).
- `getBrainrunRoomsPerAct(act)` (`shared/brainrun.ts`) donne le nombre de rangées d'un acte (10 pour
  l'acte 1, 9 sinon) — utilisé côté client pour l'affichage "rangée X / Y" (Lobby, HUD, panneau debug)
  et côté serveur par `nextRowAfterClear` pour détecter fin d'acte/de run.

## Génération du graphe (`server/utils/brainrunLogic.ts`)

1. **`generateActEdges(act, random)`** — construit les arêtes entre rangées consécutives, à partir
   de `getBrainrunActRowWidths(act)` (`brainrunConfig.ts`). Pour chaque nœud, `pickInitialTargets`
   choisit une cible centrale (position proportionnelle via `proportionalCol`, pour éviter que les
   arêtes s'entrecroisent trop) et, avec probabilité `BRAINRUN_BRANCH_CHANCE` = 0.8, une 2e cible
   parmi les voisins immédiats — les mono-routes (un seul choix possible) doivent rester rares.
2. **`attachOrphans`** — après le tirage initial, rattache tout nœud sans arête entrante au nœud le
   plus proche de la rangée précédente. **Aucun nœud de la carte n'est jamais inaccessible.**
3. **`assignNodeTypes(act, random, eventBonusChance)`** — assigne un type à chaque nœud non-Boss et
   non-Neutre (la rangée Neutre, si elle existe pour cet acte, n'est ni typée ici ni comptée dans les
   quotas ci-dessous ; `getActFloorLayout` calcule les numéros de rangée fixes une fois pour toutes) :
   - Étage 1 (`floor1Row`) : toujours forcé 3× `STANDARD`, sur tout acte — remplace l'ancien
     `forceFirstPure` (qui ne s'appliquait qu'à l'acte 1 avec un mix Standard/Élite).
   - Un étage du milieu (`forcedEliteRow`, position fixe = `floor1Row + BRAINRUN_FORCED_ELITE_MID_FLOOR_INDEX`)
     : toujours forcé 100% `ELITE`. Comme la carte se parcourt en file simple (un nœud par rangée par
     route, cf. section Navigation), forcer une rangée entière garantit **mécaniquement** qu'aucune
     route ne peut l'éviter — la garantie "au moins 1 Élite par route" est structurelle, pas
     probabiliste.
   - Avant-dernière rangée (`restRow`) : toujours forcée 100% `REST`.
   - Les étages du milieu restants (5 sur 6) suivent les quotas habituels : `BRAINRUN_MIN_PURE_COMBAT_RATIO`
     (au moins 50% de combat), `BRAINRUN_MIN_SHOP_OFFERS`/`MIN_REST_OFFERS`/`MIN_EVENT_OFFERS` (2
     chacun) — mêmes constantes qu'avant, calculées sur les étages "libres" uniquement (hors Neutre,
     étage 1, étage forcé Élite, étage Repos).
   - L'Aimant à Événements (`maybeConvertNodeToEvent`) ne s'applique **jamais** aux 3 rangées fixes
     (étage 1, étage forcé Élite, étage Repos) — seulement aux étages libres, comme avant pour l'ancien
     `forceFirstPure`.
4. **`enforceEliteRouteBounds(nodes, bossRow, protectedRow)`** — après assignation, énumère toutes
   les routes racine→boss du graphe (petit graphe, ≤4 de large, branchement ≤2 par nœud — énumération
   triviale) et, si une route dépasse `BRAINRUN_MAX_ELITE_PER_ROUTE` (4) Élites, retype en `STANDARD`
   une des Élites qu'elle traverse (jamais celle de `protectedRow`, l'étage forcé Élite qui garantit
   le minimum) puis recompte, en boucle jusqu'à convergence. Garantit donc **entre 1 et 4 Élites**
   sur n'importe quelle route, jamais 0, jamais plus de 4.
5. **`maybeConvertNodeToEvent`** — relique **Aimant à Événements** : convertit après coup un nœud
   `STANDARD`/`ELITE` pas encore atteint en `EVENT`, avec probabilité `eventBonusChance`. Ne touche
   jamais une salle spéciale déjà présente, le Boss, ni les 3 rangées fixes ci-dessus.
6. **`generateActGraph(act, random, eventBonusChance)`** — combine 1-5, assigne `BOSS` à la dernière
   rangée et `NEUTRAL` à la rangée 1 de l'acte 1 (seul cas où elle existe), puis applique
   `enforceEliteRouteBounds`. C'est la fonction appelée par `BrainrunService.seedActGraph` pour
   peupler `BrainrunRoom` (un enregistrement par nœud) à la création d'un acte.

## Ennemi/boss fixé à la génération (pas à l'entrée en salle)

Depuis le 2026-07-09 (pour permettre la prévisualisation par la relique Prévoyance, cf. plus haut),
l'ennemi/boss de chaque nœud `STANDARD`/`ELITE`/`BOSS` est fixé **une fois pour toutes à la
génération de la carte**, dans `BrainrunService.seedActGraph`, juste après `generateActGraph` :

- **`assignCombatIdentities(nodes, classicPool, elitePool, bossPool, random)`** (`brainrunLogic.ts`)
  affecte l'identité différemment selon le tier :
  - **Standard** : exclusion globale au fil des nœuds via **`pickCombatCandidate(pool, excludeIds,
random)`** (retombe sur le pool complet si épuisé) — conserve la variété d'affichage de la carte,
    doublon sur un trajet marginal vu le pool de 10.
  - **Élite** : identité par **profondeur de route** (`computeTierRouteDepths`), pas par exclusion
    globale — **garantit qu'aucune route ne fait affronter deux fois la même Élite**, même si la
    carte a plus de nœuds Élite que le pool (l'étage forcé 100% Élite fait 4 de large). L'ancienne
    exclusion globale épuisait le pool de 5 Élites puis en réutilisait une au hasard qui pouvait
    retomber sur le trajet du joueur (bug corrigé 2026-07-12). Détail dans `enemies-and-bosses.md`.
  - **Boss** (1 seul nœud par acte) : pas d'exclusion nécessaire.
- `BrainrunService.resolveNodeChoice` ne tire plus rien à l'entrée en salle : il lit
  `node.enemyId`/`node.bossId` déjà persistés. `forcedCombatId` (debug uniquement, cf.
  `debugJumpToNode`) reste le seul moyen de l'écraser explicitement.
- Purge Thématique (bannissement de thème) **n'exclut plus l'ennemi lui-même** de la carte — elle
  retire dynamiquement le thème banni du pool de thèmes utilisés pour les questions (et pour
  l'affichage dans la modale Prévoyance) via **`effectiveThemes(themes, bannedThemes)`**
  (`brainrunLogic.ts`), sans jamais changer l'identité déjà fixée. Voir `items.md` pour le détail.
- `run.usedEnemyIds` (champ Prisma) a été supprimé : l'exclusion se fait maintenant une seule fois,
  à la génération, plutôt que dynamiquement au fil de la run.
- **L'événement de chaque nœud `EVENT` est fixé de la même façon** depuis le 2026-07-12 :
  `seedActGraph` appelle `assignEventIdentities` (tirage **sans remise** dans le pool de l'acte,
  `getBrainrunEventIdsByAct`) après `assignCombatIdentities`, garantissant qu'aucun Événement
  n'apparaît deux fois sur une run. `resolveNodeChoice` lit `node.eventId` au lieu de tirer à
  l'entrée (filet `pickFallbackEventId` si absent). La conversion `STANDARD`/`ELITE` → `EVENT` par
  l'Aimant à Événements (ci-dessous) assigne aussi un eventId, en excluant ceux déjà placés. Détail
  dans `events-shop-library.md`.

## Résolution du nœud Neutre

Le joueur n'a jamais besoin de cliquer sur le nœud Neutre : `BrainrunService.seedActGraph` le marque
`CLEARED` et positionne `run.currentRow` à 2 **dès la création de la run** (`createRun`), avant même
le premier appel client — la run démarre directement avec l'étage 1 (3 combats Standard) proposé en
choix. `resolveNodeChoice` garde tout de même une branche `choice === "NEUTRAL"` (clear instantané +
`advanceAfterRoomClear`, sans passer par `ACTIVE` comme REST/SHOP/EVENT) : filet de sécurité pour le
seul cas où un nœud Neutre serait encore `PENDING` (ex. `debugJumpToNode` qui re-séderait l'acte 1).
`NEUTRAL` n'appartient ni à `BRAINRUN_INSTANT_ROOM_TYPES` ni à `BRAINRUN_COMBAT_ROOM_TYPES`
(`brainrunConfig.ts`).

## Navigation

La carte se parcourt **en file simple** : un seul nœud actif à la fois par rangée (pas de retour en
arrière, pas de nœuds parallèles actifs). `getCandidateCols(actRooms, currentRow)` : colonnes
accessibles = toutes celles de la rangée 1 si aucun nœud `CLEARED` en amont (début d'acte), sinon
`nextCols` de l'unique nœud `CLEARED` de la rangée précédente. Cette fonction n'a pas changé — elle
s'applique aussi bien à la rangée 1 = Neutre (acte 1) qu'à la rangée 1 = étage 1 (actes 2/3).

## Pas de brouillard de guerre

Toutes les salles d'un acte affichent toujours leur type (`BrainrunMapNodeDTO.type` n'est jamais
masqué/`null`, cf. `buildState` dans `BrainrunService.ts`) — retiré le 2026-07-09 (l'ancien système
révélait seulement la rangée accessible + `extraRows` rangées supplémentaires via une relique).

## Relique Prévoyance (`FORESIGHT`) : prévisualisation d'ennemi

Repensée le 2026-07-09 en même temps que le retrait du brouillard de guerre : elle ne touche plus la
vision de la carte, elle permet de **cliquer n'importe quel nœud de combat** (Standard/Élite/Boss,
où qu'il soit sur la carte de l'acte, accessible ou non) pour ouvrir une modale
(`BrainrunNodePreviewModal.vue`) affichant les thèmes de son ennemi/boss, avec un bouton
"Se déplacer" si le nœud fait partie des `candidateCols` actuels. Pas de modale sur une salle non-
combat, ni du tout si la relique n'est pas possédée.

- `BrainrunRelicEffects.hasForesight: boolean` (`brainrunLogic.ts`, `getActiveRelicEffects`) —
  simple booléen, plus un effet numérique agrégé.
- `BrainrunMapNodeDTO.themes: string[] | null` (`shared/brainrun.ts`) : calculé dans `buildState`
  uniquement si `effects.hasForesight` et que le nœud est un type de combat ; sinon `null`. Les
  thèmes exposés sont les thèmes **effectifs** (`effectiveThemes`, cf. section suivante), pas les
  thèmes bruts du catalogue.
- Côté client, `BrainrunMap.vue` intercepte le clic sur un nœud de combat quand `hasForesight` est
  vrai (`canPreview(node)`) : émet `preview-node` (ouvre la modale) au lieu de `select-node` (qui
  déplacerait directement), **même si le nœud est par ailleurs accessible** — le déplacement ne se
  fait plus que via le bouton de la modale.

## Composant client

`app/components/brainrun/BrainrunMap.vue` (~310 lignes) — rendu du graphe (position/tracé toujours
visibles même si le type est masqué), affichage des icônes de type via `useBrainrunRoomTypeDisplay`
(inclut désormais `NEUTRAL` : libellé "Départ", icône `i-heroicons-flag`). Le composant est générique
sur `row`/`col`/largeur, aucun changement nécessaire pour la largeur max passée de 3 à 4.

## Si tu ajoutes/modifies un type de salle ou change la forme de la carte

- Un nouveau type de salle spécial doit être ajouté à `BrainrunRoomType` (`shared/brainrun.ts`), aux
  quotas `assignNodeTypes`, à `BRAINRUN_INSTANT_ROOM_TYPES`/`BRAINRUN_COMBAT_ROOM_TYPES` selon son
  comportement (sauf s'il est "instantané sans choix" comme `NEUTRAL`, auquel cas il n'appartient à
  aucune des deux listes — gérer sa résolution directement dans `resolveNodeChoice`), et avoir une
  résolution dédiée côté `BrainrunService` (comme `resolveRest`/`resolveEvent`) — voir
  `events-shop-library.md` pour le patron à suivre.
- Changer `getBrainrunActRowWidths`/`getBrainrunRoomsPerAct` change la longueur/largeur de la carte
  et peut invalider les rangées fixes (`floor1Row`/`forcedEliteRow`/`restRow` dans
  `getActFloorLayout`) ou les quotas minimums — relire `assignNodeTypes`/`getActFloorLayout` si tu
  touches à ces constantes. Les deux fonctions doivent rester cohérentes entre elles (même nombre de
  rangées par acte) et avec `nextRowAfterClear` (détection de fin d'acte).
- Changer `BRAINRUN_FORCED_ELITE_MID_FLOOR_INDEX`/`BRAINRUN_MAX_ELITE_PER_ROUTE` ajuste directement
  la garantie d'Élites par route ; garder `BRAINRUN_MAX_ELITE_PER_ROUTE` ≥ 1 (sinon
  `enforceEliteRouteBounds` ne peut pas satisfaire la contrainte et sort en boucle via son
  garde-fou `guard`).
