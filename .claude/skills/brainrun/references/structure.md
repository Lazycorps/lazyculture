# Structure du code Brainrun

Carte des ~50 fichiers par couche. Les catalogues de contenu et les constantes d'équilibrage sont **en code**, pas en base — pas de table admin à modifier pour changer un ennemi ou un prix.

## Modèle de données (Prisma)

`prisma/schema.prisma` — modèles `BrainrunRun`, `BrainrunRoom`, `BrainrunMetaProgress`. Historique des migrations (toutes sous `prisma/migrations/`, ordre chronologique = ordre des phases) :

- `20260702182116_add_brainrun` — fondations (`BrainrunRun`/`BrainrunRoom`)
- `20260702190000_add_brainrun_boss_fight` — `bossHealthPoint`/`bossMaxHealthPoint`/`questionStartedAt`
- `20260703120000_add_brainrun_relics_shop` — `relics`/`consumables`/`shieldArmed`, `offers`/`offersRequireChoice`/`offersResolved`/`eventId`/`consumableReveal`
- `20260703130000_add_brainrun_meta_progress` — `BrainrunMetaProgress` (Points de Savoir, talents), `knowledgePointsEarned`
- `20260704180000_brainrun_enemy_identity` / `20260704190000_add_brainrun_boss_identity` — `enemyId`/`bossId`/`bossPhase`, `usedEnemyIds`
- `20260705120000_brainrun_relics_phase5` — reliques de la vague 2 (Purge Thématique, Sixième Sens, etc.)
- `20260705130000_brainrun_glossary` — `discoveredRelics`/`discoveredConsumables`
- `20260705140000_brainrun_branching_map` — **a supprimé toutes les anciennes lignes `BrainrunRoom`** en remplaçant `sequence` par `row`+`col`+`nextCols` (pas de mapping sensé de l'ancien format) ; `BrainrunRun.currentSequence` → `currentRow`+`currentCol`. Les agrégats run-level (or, xpEarned) ont été préservés.
- `20260705150000_brainrun_daily_act_coins` / `20260705160000_brainrun_run_coins_earned` — pièces `UserWallet` par palier d'acte

## Constantes et types partagés (client + serveur)

- `shared/brainrun.ts` — constantes visibles côté client (nombre d'actes/rangées, chrono boss, dégâts boss), types `BrainrunRoomType`/`BrainrunRoomStatus`/`BrainrunRunStatus`, tous les DTO (`BrainrunRunDTO`, `BrainrunRoomDTO`, `BrainrunStateDTO`, `BrainrunMapNodeDTO`, `BrainrunMetaProgressDTO`), la fonction `brainrunPotentialBossDamage` (partagée pour que le client puisse prévisualiser les dégâts sans attendre le serveur).
- `server/utils/brainrunConfig.ts` — toutes les constantes d'équilibrage serveur-only (PV/or/XP de base, plages de difficulté par acte, forme de la carte, quotas, probabilités des reliques). **C'est le premier fichier à ouvrir pour ajuster une valeur numérique.**
- `shared/DTO/brainrunResponseDTO.ts` — DTO des payloads entrants des endpoints (`BrainrunResponseDTO`, `BrainrunChoiceDTO`, `BrainrunBonusChoiceDTO`, `BrainrunShopBuyDTO`, `BrainrunEventChoiceDTO`, `BrainrunRestChoiceDTO`, `BrainrunConsumableUseDTO`, `BrainrunTalentUnlockDTO`).

## Catalogues de contenu (shared, définis en code)

- `shared/brainrunEnemies.ts` — `BRAINRUN_ENEMIES` (ennemis Classiques/Élites par acte + thèmes)
- `shared/brainrunBosses.ts` — `BRAINRUN_BOSSES` (6 boss nommés, malus, thèmes)
- `shared/brainrunItems.ts` — `BRAINRUN_RELICS`, `BRAINRUN_CONSUMABLES`, `BRAINRUN_EVENTS`, types d'offre (`BrainrunOffer`)
- `shared/brainrunTalents.ts` — `BRAINRUN_TALENTS` (métagame)

## Logique pure (testable, sans accès DB)

`server/utils/brainrunLogic.ts` (~740 lignes) — tout ce qui peut être calculé sans I/O : dégâts/pertes de PV, agrégation d'effets de reliques/talents (`getActiveRelicEffects`/`getActiveTalentEffects`), génération d'offres (`generateBonusOffers`/`generateShopOffers`), résolution d'événement (`resolveEventOption`), génération du graphe de carte (`generateActEdges`/`assignNodeTypes`/`generateActGraph`), calcul de visibilité (`computeVisibleCols`), conversion or→Points de Savoir. Testé par `brainrunLogic.test.ts` (776 lignes) — voir le piège de résolution d'alias `#shared` dans `integrations-and-gotchas.md`.

## Persistance du métagame

`server/utils/brainrunMetaHelper.ts` — lecture/écriture de `BrainrunMetaProgress` : Points de Savoir, découverte de reliques/consommables (glossaire), pièces avec plafond quotidien, déblocage de talent (débit atomique conditionnel).

## Orchestration serveur (DB + logique pure)

`server/services/BrainrunService.ts` (~1600 lignes) — seul point d'entrée pour les routes API. Méthodes clés : `getOrStartRun`/`startNewRun`/`abandonRun`, `chooseNode` (résout le type de salle choisi, tire ennemi/boss/questions), `submitAnswer` (résout une réponse, gère mort/victoire de salle), `acknowledgeRoom`/`resolveBonus` (récap post-combat), `buyShopItem`/`leaveShop`, `resolveRest`, `resolveEvent`/`resolveThemeBan`, `useConsumable`, `prepareNextBossQuestion`, `unlockTalent`. Construit les DTO exposés au client (`buildState`/`toRunDTO`/`toRoomDTO`).

## Routes API (fines, délèguent tout au service)

`server/api/brainrun/*.{get,post}.ts` — chaque fichier fait ~8 lignes et appelle une méthode de `BrainrunService` : `current.get`, `new.post`, `abandon.post`, `choice.post` (→ `chooseNode`), `answer.post` (→ `submitAnswer`), `acknowledge.post`, `bonus.post` (→ `resolveBonus`), `shop-buy.post`, `shop-leave.post`, `rest.post` (→ `resolveRest`), `event.post` (→ `resolveEvent`), `theme-ban.post` (→ `resolveThemeBan`), `consumable.post` (→ `useConsumable`), `boss-ready.post` (→ `prepareNextBossQuestion`), `meta.get`, `talent-unlock.post`.

## Composables client

- `app/composables/useBrainrunSession.ts` — état de session côté client, wrappe tous les appels API ci-dessus.
- `app/composables/useBrainrunMeta.ts` — métagame (lobby/talents).
- `app/composables/useBrainrunBossMalus.ts` — effets d'affichage des 6 malus de boss (renvoi `enemies-and-bosses.md`).
- `app/composables/useBrainrunOfferDisplay.ts` — nom/description/icône/rareté d'une offre (relique/consommable/or), utilisé par Boutique et bonus post-combat.
- `app/composables/useBrainrunRoomTypeDisplay.ts` — libellés/icônes des types de salle (**c'est ici que "Bibliothèque"/"Librairie" sont définis**, pas dans le code serveur).
- `app/composables/useBrainrunLongPress.ts` — utilitaire d'interaction (appui long), non spécifique au métier.

## Composants et pages

`app/components/brainrun/` : `BrainrunLobby.vue` (point d'entrée), `BrainrunMap.vue` (carte à embranchements), `BrainrunCombatIntro.vue` (transition d'entrée en combat), `BrainrunQuestionRunner.vue` (~560 lignes, moteur de question générique + UI spécifique boss), `BrainrunShop.vue`, `BrainrunEvent.vue`, `BrainrunBonusSelect.vue` (bonus post Elite/Boss), `BrainrunGlossaryModal.vue` (encyclopédie des reliques/consommables découverts), `BrainrunHelpModal.vue`.

`app/pages/brainrun/index.vue` (~800 lignes) — machine à états des écrans (lobby → carte → combat/salle spéciale → récap → fin de run). `app/pages/brainrun/talents.vue` — arbre de talents.

## Documentation existante (à traiter avec prudence)

`BRAINRUN_ROADMAP.md` à la racine du repo retrace l'historique des 4 phases de développement, mais **ne reflète plus le contenu actuel des catalogues** (ex. documente 6 reliques/3 consommables alors qu'il y en a 14/10 aujourd'hui). Utile pour comprendre le _pourquoi_ de certains choix passés, jamais comme référence de l'état actuel — voir `integrations-and-gotchas.md`.
