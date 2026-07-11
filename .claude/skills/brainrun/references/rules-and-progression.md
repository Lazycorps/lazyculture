# Règles du mode de jeu et progression

## Structure d'une run

- 3 actes (`BRAINRUN_TOTAL_ACTS`), chacun = une carte à embranchements (`getBrainrunRoomsPerAct(act)` rangées : 10 pour l'acte 1 — rangée Neutre + 9 étages —, 9 pour les actes 2/3 — pas de rangée Neutre). Détail de la génération de carte → `map.md`.
- PV de départ/max : `BRAINRUN_START_HP` = `BRAINRUN_MAX_HP` = 3. Plafond absolu atteignable (relique Cœur Supplémentaire, cumulable) : `BRAINRUN_ABSOLUTE_MAX_HP` = 8.
- Une mauvaise réponse fait **toujours perdre exactement 1 PV**, quelle que soit la difficulté de la question (pas de palier) — seul le consommable Bouclier peut annuler cette perte (voir `items.md`).
- Un Boss vaincu **régénère intégralement les PV** avant l'acte suivant (`submitAnswer`, `bossDefeated ? run.maxHealthPoint : ...`).

## Types de salle et statuts

`BrainrunRoomType` = `NEUTRAL` | `STANDARD` | `ELITE` | `BOSS` | `REST` | `SHOP` | `EVENT`.
`BrainrunRoomStatus` = `PENDING` (pas encore atteint) → `ACTIVE` (en cours de résolution) → `CLEARED` | `FAILED` (mort du joueur dessus) | `SKIPPED` (non utilisé actuellement dans le flux normal).
`BrainrunRunStatus` = `IN_PROGRESS` | `WON` | `LOST` | `ABANDONED`.

- `BRAINRUN_INSTANT_ROOM_TYPES` = `REST`/`SHOP`/`EVENT` : pas de question, résolution par un choix dédié.
- `BRAINRUN_COMBAT_ROOM_TYPES` = `STANDARD`/`ELITE`/`BOSS` : questions, or, XP.
- `NEUTRAL` : ni l'un ni l'autre — nœud de démarrage cosmétique (rangée 1 de l'acte 1 uniquement), se nettoie instantanément au clic, sans question ni choix (voir `map.md`). N'apparaît dans aucune des deux listes ci-dessus.

## Cycle de vie d'une salle (dans `BrainrunService`)

1. `chooseNode(col)` — le joueur choisit un nœud accessible (`getCandidateNodes`). Le type était déjà assigné à la génération de la carte, jamais fourni par le client. Pour un combat : tire un ennemi/boss (exclusion des thèmes bannis + ennemis déjà rencontrés dans l'acte) puis les questions ; passe la salle en `ACTIVE`.
2. `submitAnswer(questionId, responseId)` — répété question par question pour `STANDARD`/`ELITE`/`BOSS`. Calcule succès, perte de PV, dégâts de boss ; passe en `CLEARED` (or gagné, offres de bonus si Elite/Boss) ou `FAILED` (mort → `finalizeRun("LOST")`).
3. `acknowledgeRoom()` — confirme le récap de fin de salle (`CLEARED`) et avance vers la rangée suivante via `advanceAfterRoomClear`. Bloqué tant qu'un bonus post-combat ou un choix de thème banni est en attente.
4. Pour les salles spéciales, l'équivalent de l'étape 2 est `resolveRest`/`buyShopItem`+`leaveShop`/`resolveEvent` → détail dans `events-shop-library.md`.

`advanceAfterRoomClear` : si la rangée nettoyée était la dernière de l'acte (le Boss), passe à l'acte suivant (crédite les pièces de palier, génère la carte du prochain acte si pas déjà fait — l'ennemi/boss de chaque nœud y est fixé dès cette génération, cf. `map.md`) ; si c'était le Boss du 3e acte, `finalizeRun("WON")`.

## Or, XP, difficulté

- Or par salle de combat (avant reliques) : `BRAINRUN_GOLD_BY_ROOM_TYPE` = STANDARD 10 / ELITE 25 / BOSS 50. REST/SHOP/EVENT ne rapportent pas d'or (sauf effets d'Événement).
- XP par salle : `BRAINRUN_XP_BY_ROOM_TYPE` = STANDARD 15 / ELITE 35 / BOSS 70, + `BRAINRUN_WIN_BONUS_XP` = 150 si la run est gagnée (`calculBrainrunUserXP`). REST/SHOP/EVENT = 0 XP.
- Nombre de questions par salle : `BRAINRUN_QUESTIONS_PER_ROOM` = STANDARD 4 / ELITE 5. **BOSS n'a pas de limite** : de nouvelles questions sont tirées à la volée (`getNextBossQuestionId`) tant que le boss n'est pas à 0 PV.
- Difficulté par acte et type (`BRAINRUN_DIFFICULTY_BY_ACT`, plage inclusive 1-5) : Acte 1 = [1,2] pour tous types, Acte 2 = [2,4], Acte 3 = [3,5]. `culture_generale` a sa propre plage resserrée par acte (`BRAINRUN_CULTURE_GENERALE_DIFFICULTY_BY_ACT` : [1,2]/[2,3]/[4,5]) car ce thème est quasi systématique dans les pools ennemis/boss — évite qu'il soit toujours trop facile ou toujours difficile. Avant d'ajouter un thème/une plage, vérifier le volume réel de questions (voir `enemies-and-bosses.md`).

## Combat de boss (contre-la-montre) — résumé, détail complet dans `enemies-and-bosses.md`

PV du boss = `BRAINRUN_BOSS_MAX_HP` (100 = 5 × 20). Dégâts décroissants linéairement selon le temps de réponse, chrono de `BRAINRUN_BOSS_QUESTION_TIME_MS` (15s) par question, timeout = échec forcé côté serveur.

## Mort et fin de run

`shouldEndRunOnDamage(hp) = hp <= 0`. Filets de sécurité pouvant annuler une mort, dans cet ordre — **règle générale valable pour tout filet similaire** : consommable → relique → talent — : consommable **Dernier Souffle**/`REVIVE_TOKEN` (auto-déclenché, jamais utilisable manuellement) puis relique **Seconde Chance** (`hasExtraLife`, consommée une fois) puis talent ultime **Second Souffle** (Résistance, `hasUltimateRevive`, 1×/run) ; les deux premiers ramènent à 1 PV, le talent à 2 PV. `finalizeRun` calcule XP final, convertit l'or restant en Points de Savoir (majoré du bonus du talent Intérêts Composés), crédite les pièces du dernier palier si `WON`, et déclenche les achievements `brainrunGames`/`brainrunWins`.

## Métagame (persiste entre les runs)

- `BrainrunMetaProgress` (une ligne par joueur, même convention que `UserProgress`) : `knowledgePoints` (monnaie), `unlockedTalents`, `discoveredRelics`/`discoveredConsumables` (glossaire), compteurs de pièces quotidiennes.
- Conversion or→Points de Savoir en fin de run (`WON`/`LOST`/`ABANDONED`) : `goldToKnowledgePoints`, taux `BRAINRUN_KP_PER_GOLD` = 0.2, arrondi inférieur, puis bonus éventuel du talent Intérêts Composés (`BrainrunService.knowledgePointsForRun`).
- **Arbre de talents** à 3 branches (Résistance/Dégâts/Utilitaire, 7 nœuds chacune, prérequis explicites) — détail complet dans `talents.md`. Appliqués via `getActiveTalentEffects`, même principe d'agrégation que les reliques (`getActiveRelicEffects`), à deux exceptions près documentées dans `talents.md` (agrégation par MAX plutôt que par somme).
- Déblocage protégé par un débit atomique conditionnel (`unlockTalent` dans `brainrunMetaHelper.ts`), même filet que l'achat en Boutique, précédé d'une vérification des prérequis du nœud.
- Point d'entrée : `BrainrunLobby.vue` (solde PS, nouvelle run / reprendre / talents) — la run ne s'affiche qu'après un choix explicite, jamais auto-créée à l'arrivée sur la page.

## Pièces globales (UserWallet) — distinct des Points de Savoir

`BRAINRUN_COINS_PER_ACT` = [5, 10, 25] (indexé acte-1), créditées à chaque Boss d'acte vaincu (transition d'acte pour 1/2, `finalizeRun("WON")` pour le 3e), via `grantBrainrunActCoins`. Plafonné à `BRAINRUN_DAILY_COIN_CAP` = 100/jour, **partagé avec le quiz quotidien** (même convention de réinitialisation, heure locale serveur) — remplace, pour Brainrun uniquement, la conversion XP→pièces générique des autres modes.

## Mode caché

Le mode est retiré de la navigation principale (`app/layouts/default.vue`, commenté) tant qu'il n'a pas été testé manuellement en conditions réelles — ne pas le réactiver sans qu'on le demande explicitement.
