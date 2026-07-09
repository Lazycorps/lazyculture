# Gestion de la carte (map à embranchements)

Redesign post-roadmap (2026-07-05, migration `20260705140000_brainrun_branching_map`) : l'ancien flux linéaire "popup de choix de type de salle" a été remplacé par une vraie carte visuelle façon Slay-the-Spire — plusieurs nœuds par rangée reliés par des arêtes, le joueur clique le nœud vers lequel avancer.

## Forme de la carte

`BRAINRUN_ACT_ROW_WIDTHS` (`brainrunConfig.ts`) = `[2, 3, 3, 3, 3, 2, 1]` — nombre de nœuds par rangée (index 0 = rangée 1). La dernière rangée est **toujours** le Boss (1 seul nœud), tous les nœuds de l'avant-dernière rangée y convergent.

## Génération du graphe (`server/utils/brainrunLogic.ts`)

1. **`generateActEdges`** — construit les arêtes entre rangées consécutives. Pour chaque nœud, `pickInitialTargets` choisit une cible centrale (position proportionnelle via `proportionalCol`, pour éviter que les arêtes s'entrecroisent trop) et, avec probabilité `BRAINRUN_BRANCH_CHANCE` = 0.8, une 2e cible parmi les voisins immédiats — les mono-routes (un seul choix possible) doivent rester rares.
2. **`attachOrphans`** — après le tirage initial, rattache tout nœud sans arête entrante au nœud le plus proche de la rangée précédente. **Aucun nœud de la carte n'est jamais inaccessible.**
3. **`assignNodeTypes`** — assigne un type à chaque nœud non-Boss, avec quotas garantis :
   - `BRAINRUN_MIN_PURE_COMBAT_RATIO` = 0.5 : au moins 50% des nœuds hors Boss sont `STANDARD`/`ELITE` (50/50 entre les deux).
   - `BRAINRUN_MIN_SHOP_OFFERS` / `MIN_REST_OFFERS` / `MIN_EVENT_OFFERS` = 2 chacun (remontés de 1 à 2 par rapport à l'ancien système linéaire : avec l'embranchement, un trajet donné pourrait sinon rater totalement une salle spéciale si elle n'existe qu'en un seul exemplaire sur toute la carte).
   - `forceFirstPure` (vrai uniquement pour la rangée 1 de l'acte 1) : garantit un Standard + un Elite sur cette rangée, jamais de Boutique/Repos/Événement dès la toute première salle de la run.
   - Lève une erreur si les quotas sont incohérents avec `BRAINRUN_ACT_ROW_WIDTHS` (garde-fou de configuration, pas un cas runtime normal).
4. **`maybeConvertNodeToEvent`** — relique **Aimant à Événements** : convertit après coup un nœud `STANDARD`/`ELITE` pas encore atteint en `EVENT`, avec probabilité `eventBonusChance`. Ne touche jamais une salle spéciale déjà présente ni le Boss.
5. **`generateActGraph`** — combine 1-4, assigne `BOSS` à la dernière rangée. C'est la fonction appelée par `BrainrunService.seedActGraph` pour peupler `BrainrunRoom` (un enregistrement par nœud) à la création d'un acte.

## Navigation

La carte se parcourt **en file simple** : un seul nœud actif à la fois par rangée (pas de retour en arrière, pas de nœuds parallèles actifs). `getCandidateCols(actRooms, currentRow)` : colonnes accessibles = toutes celles de la rangée 1 si aucun nœud `CLEARED` en amont (début d'acte), sinon `nextCols` de l'unique nœud `CLEARED` de la rangée précédente.

## Brouillard de guerre

Par défaut le joueur ne voit que le type des nœuds déjà résolus + ceux immédiatement accessibles (`BRAINRUN_MAP_BASE_VISION_ROWS` = 1). `computeVisibleCols` fait un parcours en largeur depuis les colonnes de départ sur `extraRows` rangées supplémentaires. Relique **Prévoyance** (`FORESIGHT`) : `BRAINRUN_FORESIGHT_BONUS_VISION_ROWS` = 2 rangées de vision en plus (cumulable si plusieurs exemplaires — non stackable en pratique aujourd'hui car ce n'est pas dans `BRAINRUN_STACKABLE_RELIC_IDS`, un seul exemplaire possible actuellement).

Le type d'un nœud non révélé est renvoyé au client comme `null` dans `BrainrunMapNodeDTO.type` (`buildState` dans `BrainrunService.ts`) — le masquage se fait côté serveur, jamais en filtrant côté client.

## Composant client

`app/components/brainrun/BrainrunMap.vue` (~310 lignes) — rendu du graphe (position/tracé toujours visibles même si le type est masqué), affichage des icônes de type via `useBrainrunRoomTypeDisplay`.

## Si tu ajoutes/modifies un type de salle ou change la forme de la carte

- Un nouveau type de salle spécial doit être ajouté à `BrainrunRoomType` (`shared/brainrun.ts`), aux quotas `assignNodeTypes`, à `BRAINRUN_INSTANT_ROOM_TYPES`/`BRAINRUN_COMBAT_ROOM_TYPES` selon son comportement, et avoir une résolution dédiée côté `BrainrunService` (comme `resolveRest`/`resolveEvent`) — voir `events-shop-library.md` pour le patron à suivre.
- Changer `BRAINRUN_ACT_ROW_WIDTHS` change la longueur/largeur de la carte pour **tous les actes** (pas de configuration par acte aujourd'hui) et peut invalider les quotas minimums — relire `assignNodeTypes` si tu touches à cette constante.
