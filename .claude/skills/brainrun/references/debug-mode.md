# Mode debug (dev uniquement)

Ajouté le 2026-07-09. Outil de playtesting pour atteindre rapidement une situation précise (PV,
or, acte/rangée, ennemi/boss donné) sans devoir la provoquer en jouant normalement. Gate d'accès :
`import.meta.dev` côté serveur ET côté client — jamais actif dans un build de production, pas de
vérification de rôle admin (repo local, pas d'exposition publique).

## Gate serveur

`assertDevOnly()` (`server/utils/auth.ts`) lève une 403 si `!import.meta.dev`. Appelée en tout
premier dans `BrainrunService.debugSetStats`/`debugJumpToNode`, avant même `getOwnedInProgressRun`.

## Traçabilité `BrainrunRun.isDebugRun` — aucun gain persistant

Dès qu'une des deux méthodes ci-dessous touche une run, elle pose `isDebugRun: true` en base
(jamais réinitialisé — une run debug le reste jusqu'à sa fin). Ce flag bloque tout gain persistant
en aval, pour qu'une run de test n'ait strictement aucun effet sur la progression réelle :

- `finalizeRun` (fin de run WON/LOST) : `xpEarned`/`knowledgePointsEarned` forcés à 0, pas d'appel à
  `updateUserProgress`/`grantKnowledgePoints`, pas de `grantBrainrunActCoins` pour le palier du 3e acte.
- `advanceAfterRoomClear` (transition d'acte 1→2/2→3) : pas de `grantBrainrunActCoins` pour le palier
  de l'acte franchi.
- `abandonRun` : `knowledgePointsEarned` forcé à 0, pas d'appel à `grantKnowledgePoints`.
- Achievements `brainrunGames`/`brainrunWins` (comptages dans `finalizeRun`/`abandonRun`) : les
  requêtes de comptage (`prisma.brainrunRun.count`) filtrent `isDebugRun: false`, donc une run debug
  ne fait jamais franchir un palier d'achievement, qu'elle soit WON/LOST/ABANDONED.
- `getRunStats` (méta-progression : `totalRuns`/`bestRun` affichés au lobby) filtre aussi
  `isDebugRun: false` — une run debug n'apparaît jamais comme "meilleure run".

Exposé au client via `BrainrunRunDTO.isDebugRun` (`toRunDTO`) ; `app/pages/brainrun/index.vue`
affiche un bandeau "Run de debug — aucun gain persistant" tant que c'est vrai, pour ne pas laisser
croire à une vraie progression pendant le test.

**Ce qui n'est PAS bloqué** : l'or en cours de run (`gold`, monnaie locale utilisée pour la
Boutique) et les reliques/consommables ramassés restent fonctionnels normalement pendant la run —
seule la conversion finale en récompenses persistantes (XP, pièces UserWallet, Points de Savoir,
achievements) est neutralisée.

## `debugSetStats(runId, userId, { healthPoint?, maxHealthPoint?, gold? })`

Écrase directement `BrainrunRun.healthPoint`/`maxHealthPoint`/`gold` (clamp : maxHealthPoint dans
`[1, BRAINRUN_ABSOLUTE_MAX_HP]`, healthPoint dans `[1, maxHealthPoint]` — plancher à 1, pas 0, pour
ne pas laisser la run dans un état "0 PV mais toujours IN_PROGRESS" que le client ne gère pas : la
mort ne se déclenche normalement que dans `submitAnswer`). Pose aussi `isDebugRun: true`.

## `debugJumpToNode(runId, userId, { act, row, col, roomType?, forcedCombatId? })`

Téléporte vers un nœud précis, qui doit être `PENDING` (refuse un nœud déjà `ACTIVE`/`CLEARED`/
`FAILED` avec une 409 — pas de ré-résolution d'une salle déjà traitée).

1. Valide act (1..`BRAINRUN_TOTAL_ACTS`), row (1..longueur de `BRAINRUN_ACT_ROW_WIDTHS`), col
   (0..largeur de la rangée - 1).
2. Invariant protégé : la dernière rangée est **toujours et seulement** le Boss (cf. `map.md`,
   dont dépend `nextRowAfterClear` pour détecter fin d'acte/de run) — refuse de forcer `BOSS` hors
   dernière rangée, ou un autre type sur la dernière rangée.
3. Si l'acte cible n'est pas encore semé (`BrainrunRoom` absent pour cet acte), appelle
   `seedActGraph` à la volée — mêmes reliques actives (`eventBonusChance`) que la génération
   normale, mais **aucun octroi de pièces/XP** contrairement à une vraie transition d'acte
   (`advanceAfterRoomClear`) : sauter un acte via debug ne doit pas fausser l'économie.
4. Si `roomType` diffère du type déjà assigné au nœud, l'écrase directement en base (bypass des
   quotas de `assignNodeTypes`, acceptable pour un seul nœud ciblé manuellement).
5. Met à jour `currentAct`/`currentRow` (+ reset `usedEnemyIds` si l'acte change, même règle que
   `advanceAfterRoomClear`), puis délègue la résolution du nœud à `resolveNodeChoice` — la même
   méthode privée que `chooseNode` utilise pour un choix normal (extraite de `chooseNode` lors de
   l'ajout du debug, pour ne pas dupliquer la logique de tirage ennemi/boss + questions).
6. `forcedCombatId` (optionnel) : si fourni, impose cet id au lieu du tirage aléatoire —
   `getBrainrunBossesByAct`/`getBrainrunEnemiesByActAndTier` de l'acte **cible** (pas l'acte
   d'origine) pour trouver l'entrée ; 400 si l'id n'existe pas dans ce pool (ex. id d'un ennemi
   d'acte 1 alors que la cible est l'acte 2). Ignoré si le nœud n'est pas un type de combat
   (STANDARD/ELITE/BOSS).

## API / client

`POST /api/brainrun/debug/set-stats`, `POST /api/brainrun/debug/jump` (`server/api/brainrun/debug/`,
DTOs `BrainrunDebugSetStatsDTO`/`BrainrunDebugJumpDTO` dans `shared/DTO/brainrunResponseDTO.ts`).
Côté client : `useBrainrunSession().debugSetStats`/`debugJump`, consommés uniquement par
`app/components/brainrun/BrainrunDebugPanel.vue` — panneau replié par défaut (bouton "🐛 Debug"),
rendu dans `app/pages/brainrun/index.vue` seulement pour l'écran de run (`v-else` après le lobby),
gardé par `isDev = import.meta.dev` en plus de la gate serveur (défense en profondeur, pas
strictement nécessaire puisque le serveur rejette de toute façon hors dev).

## Pièges

- Ne jamais réutiliser `resolveNodeChoice` avec un `forcedCombatId` en dehors d'un contexte debug :
  la méthode ne revérifie pas `import.meta.dev` elle-même, seuls ses deux appelants publics le font
  (`chooseNode` ne passe jamais de `forcedCombatId`, `debugJumpToNode` le fait après `assertDevOnly()`).
- Sauter directement à un acte avancé ne génère **que** cet acte, pas les actes intermédiaires
  sautés — cohérent avec le fait qu'ils ne sont jamais visités, mais leur `BrainrunRoom` n'existera
  jamais pour cette run si on ne les traverse pas normalement.
