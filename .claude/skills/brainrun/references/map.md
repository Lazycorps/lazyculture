# Gestion de la carte (map à embranchements)

Deuxième redesign (2026-07-09, sur la base du redesign "branching map" du 2026-07-05) : rework façon
Slay the Spire — un vrai nœud de démarrage neutre, un palier de repos garanti juste avant le boss,
plus de largeur, et une garantie stricte sur le nombre d'Élites rencontrées par run.

## Forme de la carte

9 "étages" par acte (le nœud neutre de démarrage ne compte pas dans les 9) :

| #                                  | Contenu                                                                                                                                                             | Largeur | Générée par                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------ |
| Neutre (**acte 1 uniquement**)     | `NEUTRAL`, aucune question, déjà `CLEARED` dès la création de la run                                                                                                | 1       | `generateActGraph` (pas `assignNodeTypes`) |
| Étage 1                            | forcé **3× Standard**, aucune Élite/salle spéciale, sur **chaque acte**                                                                                             | 3       | `assignNodeTypes`                          |
| Étages 2-7 ("du milieu", 6 étages) | libres (Standard/Élite/Boutique/Repos/Événement par quotas), largeurs **tirées à chaque génération d'acte** (`pickBrainrunMidFloorWidths`) — cf. section Silhouette | 2 à 4   | `assignNodeTypes`                          |
| → dont un de ces 6 étages          | forcé **100% Élite** (position fixée par `BRAINRUN_FORCED_ELITE_MID_FLOOR_INDEX`)                                                                                   | idem    | `assignNodeTypes`                          |
| Étage 8                            | forcé **100% Bibliothèque (REST)** — repos garanti avant le boss, comme les feux de camp de Slay the Spire                                                          | 3       | `assignNodeTypes`                          |
| Étage 9                            | Boss                                                                                                                                                                | 1       | `generateActGraph`                         |

- **Acte 1** : rangée 1 = nœud Neutre, rangées 2-10 = étages 1-9. **10 rangées** au total
  (ex. `[1, 3, 2, 3, 4, 4, 3, 2, 3, 1]` — les 6 valeurs centrales varient d'un acte à l'autre).
- **Actes 2 et 3** : pas de nœud Neutre persisté — dès que le boss de l'acte précédent est nettoyé,
  l'acte suivant démarre directement sur son étage 1 (3× Standard), exactement comme un changement
  d'acte réinitialise `currentRow` à 1 (`getCandidateCols` : "aucun nœud `CLEARED` en amont" ⇒ tous
  les nœuds de la rangée 1 sont candidats). Le nœud de boss de l'acte précédent reste affiché à
  l'écran comme le sommet visuel de la carte suivante, mais **aucune arête réelle ne relie les deux
  actes en base** (les rooms restent scopées par `act`, `getCandidateCols`/`computeVisibleCols`
  n'ont pas été modifiés pour traverser la frontière d'acte — choix délibéré pour ne pas complexifier
  ce scoping). **9 rangées** au total (ex. `[3, 2, 3, 4, 4, 3, 2, 3, 1]`).
- `getBrainrunRoomsPerAct(act)` (`shared/brainrun.ts`) donne le nombre de rangées d'un acte (10 pour
  l'acte 1, 9 sinon) — utilisé côté client pour l'affichage "rangée X / Y" (Lobby, HUD, panneau debug)
  et côté serveur par `nextRowAfterClear` pour détecter fin d'acte/de run.

## Silhouette : largeurs tirées par acte (`pickBrainrunMidFloorWidths`, `brainrunConfig.ts`)

Jusqu'au 2026-07-21 les 6 largeurs du milieu étaient une constante (`[2, 3, 4, 4, 3, 2]`) : **toutes
les cartes avaient la même forme**, et les transitions n'admettant qu'une seule solution valide se
généraient à l'identique d'une run à l'autre. Elles sont désormais tirées à chaque appel de
`generateActGraph` — donc **une silhouette différente par acte, pas seulement par run**. Mesuré sur
2000 tirages : ~116 silhouettes distinctes, la plus fréquente à ~2%.

Le **nombre** d'étages reste fixe (`BRAINRUN_MID_FLOOR_COUNT` = 6) : il détermine le nombre de
rangées d'un acte, dont dépendent `getBrainrunRoomsPerAct` (`shared/brainrun.ts`, valeurs 10/9 en
dur) et `nextRowAfterClear`. **Ne jamais faire varier ce nombre sans mettre les deux à jour** ; le
test `keeps the row count of an act constant despite varying widths` verrouille cette relation.

Contraintes du tirage (par rejet, 50 essais puis repli sur l'ancienne forme fixe) :

- largeurs dans `[2, 4]` ;
- **silhouette lissée** : deux rangées consécutives ne diffèrent jamais de plus d'un nœud, les
  étages fixes à 3 nœuds comptant comme voisins du premier et du dernier étage du milieu. C'est
  aussi ce qui rend l'adjacence (`BRAINRUN_MAX_TARGET_DRIFT`) satisfiable partout entre étages du
  milieu — relâcher ce lissage y désactiverait silencieusement la règle "pas de saut de nœud" (cf.
  `canEnforceTargetDrift`) ;
- **1 à 2 rangées larges** (4 nœuds) : elles donnent à la carte ses vrais moments d'embranchement ;
  au plus deux, pour qu'elles restent des respirations ;
- **`BRAINRUN_MID_FLOOR_MIN_FREE_NODES`** : la silhouette doit laisser assez de nœuds "libres"
  (étages du milieu hors étage forcé Élite) pour que les quotas de `assignNodeTypes` restent
  satisfiables — sinon cette fonction **lève**. Le plancher est dérivé des quotas eux-mêmes
  (`2 × (SHOP + REST + EVENT)`, +1 de marge), pas codé en dur : il suit automatiquement un
  changement de `BRAINRUN_MIN_*_OFFERS`. C'est le piège principal de ce système — une carte plus
  étroite n'est pas seulement moins jolie, elle casse l'assignation des types.

## Génération du graphe (`server/utils/brainrunLogic.ts`)

1. **`generateActEdges(widths, random)`** — construit les arêtes entre rangées consécutives, à partir
   de la silhouette **déjà tirée** que lui passe `generateActGraph` (elle est tirée une seule fois par
   acte, puis partagée par toutes les étapes ci-dessous — ne jamais la re-tirer en cours de route).
   Depuis le 2026-07-21, les cibles ne sont
   plus tirées **nœud par nœud** (ancien `pickInitialTargets`, supprimé) mais **rangée par rangée**
   via `buildRowTargets`/`solveRowTargets` : chaque nœud reçoit un intervalle **contigu** de colonnes
   de la rangée suivante (≤ `BRAINRUN_MAX_TARGETS_PER_NODE` = 2, élargi seulement si la rangée
   suivante est trop large pour être couverte, ex. le nœud Neutre seul → 3 nœuds), résolu par
   backtracking sous 4 contraintes :
   - **monotonie** : `start`/`end` croissants de gauche à droite ⇒ **deux routes ne se croisent
     jamais**, comme dans Slay the Spire. Une version intermédiaire réintroduisait des croisements
     volontaires (échange des cibles de deux nœuds voisins) : abandonnée le 2026-07-21 après
     comparaison avec la carte de référence — ne pas la réintroduire sans demande explicite ;
   - **unicité** : deux nœuds d'une même rangée ne peuvent pas viser exactement la même combinaison
     de nœuds. C'est le correctif du 2026-07-21 : l'ancien tirage indépendant produisait couramment
     des rangées où tous les nœuds pointaient vers le même couple (cas dégénéré 2→2 : `{0,1}` et
     `{0,1}`), d'où l'impression que tous les chemins menaient partout ;
   - **couverture sans trou** : l'union des intervalles couvre toute la rangée suivante ⇒ aucun
     orphelin à rattraper ;
   - **adjacence** (`BRAINRUN_MAX_TARGET_DRIFT` = 1) : la colonne visée reste à au plus une colonne
     de celle du nœud source, en **indices bruts** — une arête ne saute donc jamais par-dessus un
     nœud (pas de `0 → 2`, pas de `nextCols` à trou). Règle de lisibilité de la carte, pas
     d'équilibrage. `canEnforceTargetDrift` la désactive sur les deux seules transitions dont la
     géométrie l'interdit : le nœud Neutre seul → étage 1 (3 nœuds), et l'avant-dernière rangée
     (3 nœuds) → l'unique Boss. Partout ailleurs le lissage de la silhouette (marche ≤ 1) la rend
     toujours satisfiable. **Attention** : cette règle porte sur `col`, pas sur `proportionalCol` —
     une première version basée sur la position proportionnelle laissait passer des arêtes `1 → 3`
     entre une rangée de 3 et une de 4 ;
   - **cadence de branchement** (`mustBranch`) : un nœud marqué doit avoir au moins 2 cibles. C'est
     l'étape 2 ci-dessous qui calcule ce marquage. Le nombre de sorties n'est plus biaisé par
     ailleurs : les mono-cibles sont assumées.

   Ordre de relâchement de `buildRowTargets` quand la géométrie rend le tout insoluble : la cadence
   (garantie de jeu) avant l'unicité (lisibilité), puis en dernier recours une cible centrale unique
   pour tous. Comme l'étape 2 ne demande jamais plus de branchements qu'une rangée ne peut en offrir
   sans doublon, les deux ne se disputent qu'en cas géométriquement forcé.

2. **Cadence de branchement** — calculée dans `generateActEdges`, appliquée via le paramètre
   `mustBranch` de `solveRowTargets`. Les rangées sont donc résolues **séquentiellement, de bas en
   haut** : la contrainte se propage d'une rangée à l'autre.
   - Règle : jamais plus de `BRAINRUN_MAX_CONSECUTIVE_MONO_NODES` (3) nœuds mono-cible consécutifs
     sur un trajet ⇒ **le joueur retrouve un vrai choix au moins tous les 3 nœuds en montant**. Les
     mono-cibles entre-temps sont assumées : c'est la respiration d'une carte façon Slay the Spire,
     plus un défaut à minimiser (l'ancien `BRAINRUN_BRANCH_CHANCE`, qui les rendait rares, a été
     supprimé — ~48 % des nœuds sont désormais mono-cible).
   - **`computeForcedMonoDepths(widths)`** anticipe les mono-cibles _structurellement inévitables_ :
     sur une rangée qui rétrécit (3 → 2), l'adjacence ne laisse qu'une seule cible au nœud le plus à
     droite ; toute l'avant-dernière rangée converge vers l'unique Boss. Sans cette anticipation, la
     contrainte n'est détectée que sur une rangée incapable de la satisfaire. Récurrence
     descendante : un nœud qui peut brancher vaut 0, sinon 1 + la valeur de son unique cible.
   - **Deux niveaux de demande**, parce qu'une rangée ne peut pas offrir un choix à tous ses nœuds
     (l'unicité limite le nombre d'intervalles de 2 colonnes distincts : une rangée cible de 3 nœuds
     n'a que `{0,1}` et `{1,2}`). Tout exiger d'un coup rendait la rangée insoluble et relâchait les
     contraintes en bloc — le bug qui a coûté le plus de temps ici :
     - **impératif** (urgence > limite) : ne pas brancher dépasserait la limite, aucun rattrapage
       possible plus haut ;
     - **souhaitable** (urgence == limite) : la chaîne atteint la limite sans la dépasser, ces nœuds
       peuvent attendre une rangée et ne sont servis que dans la place restante, en ordre aléatoire
       (sinon ce serait toujours la même colonne qui patiente, et une voie resterait mono-cible tout
       l'acte).
   - Conséquence sur l'unicité : elle reste vraie partout sauf ~0,02 % des rangées, où la géométrie
     force deux nœuds voisins à offrir la même paire d'options. Ce n'est **pas** le défaut d'origine
     (une rangée entière partageant une combinaison) — ce cas-là, lui, ne se produit jamais ; deux
     trajets mono-cible qui fusionnent vers le même nœud restent normaux et fréquents.
3. **`attachOrphans`** — rattache tout nœud sans arête entrante au nœud le plus proche de la rangée
   précédente. Désormais un **filet de sécurité** : la contrainte de couverture de `solveRowTargets`
   garantit déjà qu'**aucun nœud de la carte n'est jamais inaccessible**, sauf sur le repli de
   dernier recours ci-dessus.
4. **`assignNodeTypes(act, random, eventBonusChance)`** — assigne un type à chaque nœud non-Boss et
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
5. **`enforceEliteRouteBounds(nodes, bossRow, protectedRow)`** — après assignation, énumère toutes
   les routes racine→boss du graphe (petit graphe, ≤4 de large, branchement ≤2 par nœud — énumération
   triviale) et, si une route dépasse `BRAINRUN_MAX_ELITE_PER_ROUTE` (4) Élites, retype en `STANDARD`
   une des Élites qu'elle traverse (jamais celle de `protectedRow`, l'étage forcé Élite qui garantit
   le minimum) puis recompte, en boucle jusqu'à convergence. Garantit donc **entre 1 et 4 Élites**
   sur n'importe quelle route, jamais 0, jamais plus de 4.
6. **`maybeConvertNodeToEvent`** — relique **Aimant à Événements** : convertit après coup un nœud
   `STANDARD`/`ELITE` pas encore atteint en `EVENT`, avec probabilité `eventBonusChance`. Ne touche
   jamais une salle spéciale déjà présente, le Boss, ni les 3 rangées fixes ci-dessus.
7. **`generateActGraph(act, random, eventBonusChance)`** — combine 1-6, assigne `BOSS` à la dernière
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

## Placement des nœuds à l'affichage (`shared/brainrunMapLayout.ts`)

Ajouté le 2026-07-21. Purement visuel — **aucune règle de jeu, aucune arête n'est modifiée**.

**Le point central** : chaque rangée occupe **la même largeur quel que soit son nombre de nœuds**
(`justify-between` sur une largeur fixe de `ROW_SPAN_PERCENT` = 76 %). Avec des rangées centrées et
un écart fixe — la première version —, une rangée de 2 nœuds occupait deux fois moins de large
qu'une rangée de 4 et se ramassait au milieu : la carte prenait une allure de **grappe compacte**
au lieu de longues voies qui montent. C'est la correction la plus importante de ce module ; ne pas
revenir à un `gap` fixe.

Trois couches se cumulent :

1. la répartition de base, en CSS (`justify-between`) ;
2. **`rowShift`** — décalage de la rangée entière (somme de deux sinusoïdes de périodes
   incommensurables, à phases tirées de la graine : un serpentement irrégulier, pas une vague
   régulière). Déplacer une rangée d'un bloc ne change aucun écart ⇒ jamais de collision, ce qui
   permet une grosse amplitude (`MEANDER_PERCENT` = 12 % de la largeur d'une rangée) ;
3. **`nodeDrift`** — dispersion individuelle, plus forte au centre qu'aux bords
   (`EDGE_DRIFT_FACTOR`), pour que les voies ne soient pas rectilignes.

Points à connaître :

- **Amplitudes relatives, pas en pixels.** `LANE_DRIFT_RATIO` (0.12) s'exprime en fraction de
  l'écart entre deux voies. La non-collision en découle algébriquement — il reste toujours 76 % de
  l'écart entre deux centres — **quelles que soient la largeur d'écran et la largeur de rangée**.
  La première version bornait en pixels et devait synchroniser une constante avec la classe `gap-6`
  du template ; cette dépendance implicite a disparu.
- **`left` et non `translateX` pour les nœuds** : les pourcentages d'une translation se rapportent à
  la taille de l'élément (le nœud), pas à celle du parent. Seul le positionnement relatif donne un
  pourcentage rapporté à la largeur de la rangée. Le `rowShift`, lui, utilise bien `translateX` —
  l'élément translaté _est_ la rangée.
- **Déterministe, jamais `Math.random`** : les positions sont recalculées à chaque re-rendu (resize,
  changement de statut d'un nœud) ; un tirage aléatoire réarrangerait la carte sous les yeux du
  joueur. La graine décrit la carte (`row,col,type` de chaque nœud) — **volontairement sans le
  statut**, qui évolue pendant la run et redistribuerait tout à chaque salle nettoyée.
- **Débordement** : `ROW_SPAN + 2 × MEANDER × ROW_SPAN / 100` doit rester ≤ 100 % (le conteneur est
  en `overflow-hidden`). Un test verrouille cette inégalité.
- Les arêtes SVG suivent automatiquement : elles sont tracées à partir des positions DOM réelles
  (`getBoundingClientRect`), lues après application du placement.
- Testé dans `shared/brainrunMapLayout.test.ts` (non-chevauchement pour toute largeur de rangée,
  non-débordement, bords moins mobiles que le centre, amplitude verticale, serpentement qui change
  bien de sens, stabilité par graine).

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
- **La forme d'un acte n'est PAS recalculable après coup** : elle est tirée à la génération. Toute
  validation de bornes rangée/colonne (ex. `debugJumpToNode`) doit se lire sur les `BrainrunRoom`
  persistés, jamais en rappelant `pickBrainrunActRowWidths` — qui redonnerait une autre carte.
- Changer les contraintes de `pickBrainrunMidFloorWidths` (largeurs min/max, nombre de rangées
  larges, lissage) change la silhouette mais **jamais le nombre de rangées** ; changer
  `BRAINRUN_MID_FLOOR_COUNT` ou `getBrainrunRoomsPerAct` change la longueur de la carte et peut
  invalider les rangées fixes (`floor1Row`/`forcedEliteRow`/`restRow` dans `getActFloorLayout`) —
  relire `assignNodeTypes`/`getActFloorLayout` et garder les deux cohérents entre eux et avec
  `nextRowAfterClear` (détection de fin d'acte).
- Élargir les quotas (`BRAINRUN_MIN_*_OFFERS`) resserre automatiquement le tirage de silhouette via
  `BRAINRUN_MID_FLOOR_MIN_FREE_NODES` : si plus aucune silhouette ne passe, le repli fixe est
  utilisé à chaque fois et la variété disparaît silencieusement. Le test
  `actually varies from one draw to the next` sert de garde-fou.
- Changer `BRAINRUN_FORCED_ELITE_MID_FLOOR_INDEX`/`BRAINRUN_MAX_ELITE_PER_ROUTE` ajuste directement
  la garantie d'Élites par route ; garder `BRAINRUN_MAX_ELITE_PER_ROUTE` ≥ 1 (sinon
  `enforceEliteRouteBounds` ne peut pas satisfaire la contrainte et sort en boucle via son
  garde-fou `guard`).
