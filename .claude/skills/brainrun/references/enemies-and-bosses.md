# Ennemis, Élites et Boss

## Catalogue ennemis/élites (`shared/brainrunEnemies.ts`)

`BRAINRUN_ENEMIES: BrainrunEnemyDef[]` — chaque entrée : `id`, `name`, `act` (1-3), `tier` (`CLASSIC` | `ELITE`), `themes` (slugs de `QuestionTheme` : 2-3 pour un Classique, 4-5 pour un Élite). ~10 Classiques + 5 Élites par acte, thématisés (ex. "Le Fan de Ciné" = cinema/series_cultes/culture_generale).

Accès : `getBrainrunEnemiesByActAndTier(act, tier)`, `getBrainrunEnemyById(id)`.

## Catalogue boss (`shared/brainrunBosses.ts`)

`BRAINRUN_BOSSES: BrainrunBossDef[]` — 9 boss nommés, 3 par acte depuis l'ajout de The Rock/Flash/Alain le 2026-07-10 : `id`, `name`, `act`, `malus` (`BrainrunBossMalusId`), `themes` (5-6 selon le boss depuis l'élargissement 2026-07-09, `culture_generale` **systématiquement inclus**). Un seul boss par acte, tiré au hasard parmi les candidats de l'acte (`pickCombatCandidate`/`assignCombatIdentities` ne supposent aucun nombre fixe de candidats).

Accès : `getBrainrunBossesByAct(act)`, `getBrainrunBossById(id)`.

## Logique de tirage — fixée à la génération de la carte, pas à l'entrée en salle

Depuis le 2026-07-09 (pour permettre la prévisualisation par la relique Prévoyance, cf. `map.md`), l'ennemi/boss de chaque nœud est tiré **une fois, à la génération de l'acte** (`BrainrunService.seedActGraph` → `assignCombatIdentities`/`pickCombatCandidate` dans `brainrunLogic.ts`), pas en entrant dans la salle comme avant :

- **Standard/Elite** : tire dans le pool de l'acte+tier, en excluant les ennemis déjà assignés **sur cette carte** au même tier (exclusion locale à la génération, plus de champ `run.usedEnemyIds` persistant). Si le pool filtré est vide, retombe sur le pool complet plutôt que de bloquer.
- **Boss** : tire parmi les 2 boss de l'acte (pas d'exclusion utile, une seule salle Boss par acte).
- `BrainrunService.resolveNodeChoice` ne tire plus rien : il lit `node.enemyId`/`node.bossId` déjà persistés. `forcedCombatId` (debug uniquement, `debugJumpToNode`) reste le seul moyen de l'écraser.
- **Purge Thématique** (relique) n'intervient plus sur ce tirage — elle ne change jamais l'ennemi/boss déjà fixé sur un nœud. Elle retire dynamiquement le thème banni du pool de thèmes utilisé pour les questions via `effectiveThemes(themes, bannedThemes)` (retombe sur les thèmes non filtrés si ça viderait la liste) — voir `items.md`.
- Les questions de la salle sont ensuite tirées via `QuestionService.getRandomIdsByDifficulty` avec les thèmes **effectifs** de l'ennemi/boss retenu, la plage de difficulté de l'acte, et l'override spécifique à `culture_generale` (voir `rules-and-progression.md`).

## ⚠️ Piège de volume de questions (déjà rencontré en pratique)

Avant d'ajouter un ennemi/boss ou de changer ses thèmes, vérifier le **volume réel de questions par thème et par difficulté** — voir la mémoire `project_question_bank_theme_difficulty_stats` (re-lancer la requête si la décision est à enjeu ou si le dernier snapshot date). Piège concret déjà rencontré : des thèmes "univers" de niche (`star_wars`, `lord_of_the_ring`, `nintendo`, `tintin`, `world_of_warcraft`, `disney`) ont des totaux qui semblent corrects en sommant par thème, mais s'effondrent quasiment à zéro sur l'**union dédupliquée** à une difficulté ≥4. Toujours calculer l'union dédupliquée à la bande de difficulté exacte visée, jamais sommer les totaux par thème indépendamment.

## ⚠️ Piège des questions répétées en combat de boss (rencontré 2026-07-09)

Le combat de boss n'a pas de limite de questions (`getNextBossQuestionId` pioche en boucle jusqu'à 0 PV) et `QuestionService.getRandomIdsByDifficulty` exclut d'abord les questions déjà **réussies par le joueur** (`Response: { none: { userId, success: true } }`) avant de retomber sur le pool complet. Pour un joueur qui a déjà beaucoup joué (typiquement en test/debug), ce filtre réduit vite le pool "inédit" — et d'autant plus vite que les thèmes du boss sont petits. Symptôme observé : les mêmes questions revenaient pour La Sorcière (`mythologie` = 31 questions dans la bande Acte2 [2,4]), Le Phoenix (`babylon_5` = 15 questions dans la bande Acte3 [3,5]) et Gérard (`inventions`=37/`football`=32), alors que Gilbert/Le Joker/François (thème le plus petit ≥54) ne posaient pas ce problème.

Correctif appliqué : élargissement de tous les boss à 5-6 thèmes (au lieu de 4 fixes), en ajoutant pour chacun un thème à fort volume et/ou à pourcentage élevé de questions difficiles (%difficulté≥4), sans créer de nouveau thème partagé entre les 2 boss d'un même acte (voir piège suivant). Si le problème réapparaît malgré cet élargissement (croissance du nombre de runs/tests), ré-auditer le volume par thème (union dédupliquée sur la bande de difficulté exacte de l'acte) plutôt que d'ajouter des thèmes au hasard.

## ⚠️ Piège du thème partagé entre les 2 boss d'un acte

`BrainrunService.computeUnsafeToBanThemes` protège de la relique Purge Thématique tout thème présent dans **tous** les boss d'un même acte (le bannir viderait `unbannedBossPool` pour cet acte, ce qui ferait retomber `chooseNode` sur le pool complet non filtré — annulant silencieusement le ban pour ce combat). C'est déjà le cas pour `anime-manga` en Acte 2 (partagé par La Sorcière et François) — comportement voulu, pas un bug. En ajoutant un thème à un boss, vérifier si l'autre boss du même acte l'a aussi ; si ce n'est pas intentionnel, préférer un thème différent pour ne pas retirer silencieusement un thème de plus de la liste des thèmes bannissables de l'acte.

## Malus de boss (combat contre-la-montre)

`BrainrunBossMalusId` (9 valeurs) — les 6 malus historiques sont des effets purement d'**affichage** côté client (`app/composables/useBrainrunBossMalus.ts`), la soumission de réponse repose toujours sur les `proposition.id` d'origine, jamais modifiés par un malus :

| Malus                | Boss (ex.)           | Effet                                                                                        |
| -------------------- | -------------------- | -------------------------------------------------------------------------------------------- |
| `hidden_answer`      | Gilbert (acte 1)     | Une proposition tirée au hasard est masquée ("???"), reste cliquable                         |
| `swap_answers`       | Le Joker (acte 1)    | 2 propositions échangent leur position toutes les 4s (`SWAP_INTERVAL_MS`)                    |
| `damage_resist`      | The Rock (acte 1)    | Encaisse 2x moins de dégâts — voir mécanique dédiée ci-dessous                               |
| `mirror_answers`     | La Sorcière (acte 2) | Propositions affichées en miroir                                                             |
| `scrambling_letters` | François (acte 2)    | Lettres mélangées 1s sur 5 (`SCRAMBLE_INTERVAL_MS`/`SCRAMBLE_RATIO`), reviennent après 700ms |
| `speed_reduction`    | Flash (acte 2)       | Le temps de réponse rétrécit à chaque question — voir mécanique dédiée ci-dessous            |
| `phoenix_revive`     | Le Phoenix (acte 3)  | Ressuscite à 50% puis 25% PV — voir mécanique dédiée ci-dessous                              |
| `progressive_blur`   | Gérard (acte 3)      | Flou qui se dissipe jusqu'à net à 3s restantes (`BLUR_CLEAR_AT_MS`)                          |
| `memory_recall`      | Alain (acte 3)       | Les réponses affichées sont toujours celles de la question précédente — voir ci-dessous      |

Les 5 malus impactant l'affichage des réponses (`hidden_answer`/`swap_answers`/`mirror_answers`/`scrambling_letters`/`progressive_blur`) sont désactivés dès que la réponse est validée (`revealed` passé à `useBrainrunBossMalus`) : plus de masquage/swap/miroir/mélange/flou pendant le feedback, pour que le joueur voie les réponses réelles. `setupForCurrentQuestion` (tirage de la proposition masquée par Gilbert, redémarrage des timers de swap/scramble) ne doit se redéclencher que sur un **changement réel de question** — `BrainrunQuestionRunner.vue` compare `question.id`, pas la référence d'objet, car chaque round-trip serveur (y compris l'usage d'un consommable qui ne change pas de question, ex. 50/50) renvoie un nouvel objet `currentQuestion` ; comparer par référence re-tirait au hasard une nouvelle réponse masquée à chaque consommable utilisé, révélant l'ancienne (bug corrigé le 2026-07-10).

`damage_resist` et `speed_reduction` (ajoutés le 2026-07-10) sont des malus **numériques côté serveur** plutôt que purement d'affichage — aucun rendu client dédié dans `useBrainrunBossMalus.ts` n'était nécessaire (le joueur observe l'effet directement via la barre de PV du boss / le chrono, déjà pilotés par l'état serveur). Les deux respectent le consommable Antidote (`MALUS_CANCEL`, `reveal.malusCancelled`) exactement comme les malus d'affichage — annulé pour la question en cours uniquement. `memory_recall` (même date) est d'une troisième catégorie encore différente : un malus de **flux de questions**, qui déforme la relation entre `currentQuestion` et `previewQuestion` plutôt que le contenu d'une question isolée — voir sa section dédiée.

### The Rock (`damage_resist`)

`applyBossMalusToDamage` (`server/utils/brainrunLogic.ts`) multiplie le total de dégâts déjà bonifié (reliques + talent + Coup de Grâce) par `BRAINRUN_ROCK_DAMAGE_RESIST_MULTIPLIER` = 0.5, arrondi — appliqué en tout dernier dans `BrainrunService.submitAnswer`, pour que le reste du kit offensif du joueur reste utile normalement, juste divisé par 2.

### Flash (`speed_reduction`)

`flashMalusBonusTimeMs` (`server/utils/brainrunLogic.ts`) retourne un bonus de temps **négatif** (composé avec `bossTimeBonusMs`/`chronoBonusMs` via le même `bonusTimeMs` déjà utilisé par `isBossAnswerTimedOut`/`brainrunBossDamage`/le calcul de `questionDeadline`) : `-BRAINRUN_FLASH_TIME_REDUCTION_STEP_RATIO` (10%) du temps initial (`BRAINRUN_BOSS_QUESTION_TIME_MS`) par question déjà répondue dans ce combat (`responses.length`), cumulatif, plafonné à `BRAINRUN_FLASH_MAX_TIME_REDUCTION_RATIO` (50%, donc 7.5s minimum sur les 15s de base). Réutilise donc le même point d'extension que la relique Chronomètre Brisé plutôt que d'introduire un chemin de calcul séparé.

### Alain (`memory_recall`)

Le malus de flux le plus complexe du système : à chaque étape, l'énoncé affiché appartient à la question **suivante** (à mémoriser), pendant que les propositions cliquables appartiennent à la question **précédente** (celle réellement validée). Deux exceptions ponctuelles :

- **1re question du combat** : rien à valider (pas de "précédente"). `isAlainMemoryIntro(malus, responsesCount, questionIdsCount)` (`server/utils/brainrunLogic.ts`, vrai ssi `responsesCount === 0 && questionIdsCount <= 1`) déclenche un décompte de mémorisation forcée de `BRAINRUN_ALAIN_INTRO_MS` (5 tics de 1,5s = 7,5s, `shared/brainrun.ts`) : énoncé affiché sans aucune proposition, pas de dégâts/PV possibles. `BrainrunService.prepareNextBossQuestion` gère les deux étapes de cette phase dans le même endpoint (`POST /api/brainrun/boss-ready`) : le 1er appel (`questionStartedAt === null`, chemin déjà existant, commun à tous les boss) démarre juste le décompte ; un 2e appel, une fois `BRAINRUN_ALAIN_INTRO_MS` révolu (vérifié serveur, jamais l'horloge client), tire la 2e question et démarre alors le vrai chrono contre-la-montre pour valider la 1re. `submitAnswer` rejette explicitement toute tentative de validation tant qu'on est dans cette phase (409).
- **Dernière question mémorisée en fin de combat** (boss vaincu ou joueur mort) : abandonnée sans pénalité, jamais comptée — décision produit assumée, pas un TODO.

**Tampon d'avance à 2 questions** : tous les autres boss maintiennent 1 question d'avance (`questionIds.length = responses.length + 1`, tirée dès que le joueur rattrape). Alain a besoin de 2 (celle qu'on valide + celle qu'on mémorise) — `submitAnswer` calcule `requiredLead = malus === "memory_recall" ? 2 : 1` et tire une question dès que `questionIds.length - responses.length < requiredLead`, généralisation à coût nul du chemin existant (`requiredLead = 1` redonne exactement le comportement historique).

**DTO `previewQuestion`** (`shared/brainrun.ts` `BrainrunQuestionPreviewDTO`, exposé sur `BrainrunStateDTO`) : uniquement `id`/`libelle`/`img`/`themes`, **jamais** les propositions ni la bonne réponse — sinon le réseau donnerait la réponse en avance, avant que le mécanisme de mémorisation n'ait de sens. Calculé dans `BrainrunService.buildState`, à l'index `responses.length` (intro) ou `responses.length + 1` (régime normal) de `questionIds`. Le client (`app/composables/useBrainrunSession.ts`) expose un `isAlainMemoryIntro` dérivé (`currentRoom.type === "BOSS" && !currentQuestion && !!previewQuestion`) réutilisé à la fois par `BrainrunQuestionRunner.vue` (bascule d'affichage) et `app/pages/brainrun/index.vue` (masque l'indicateur de dégâts potentiels, dénué de sens pendant l'intro).

**Gel client (`localPreviewQuestion`)** : comme `localQuestion`, gelé pendant la fenêtre de feedback (`!responded`) pour que l'énoncé affiché ne change pas sous les yeux du joueur pendant qu'il lit encore le résultat de sa dernière réponse — sinon il ne correspondrait plus aux boutons de réponse (eux aussi gelés) affichés en dessous.

**Antidote** (`MALUS_CANCEL`) : `activeBossMalus` redevient `undefined` quand `reveal.malusCancelled` est vrai (comportement déjà existant, réutilisé tel quel) — pour cette seule question, l'énoncé ET les propositions affichés redeviennent ceux de la même question (pairage normal). Piège déjà rencontré et corrigé : l'énoncé de la question **suivante** n'est alors jamais montré (l'Antidote a affiché celui de la question validée à la place) — sans traitement particulier, l'étape d'après afficherait des réponses à valider dont le joueur n'a jamais vu l'énoncé. `isAlainMemoryIntro` a donc été généralisé : il n'est plus vrai uniquement à `responsesCount === 0`, mais dès que `questionIds.length - responsesCount <= 1` (le tampon d'avance est retombé à 1, faute d'avoir tiré la question suivante). `submitAnswer` orchestre ça via `requiredLead` : `2` en temps normal pour Alain, `1` si `reveal.malusCancelled` était vrai sur la réponse qu'on traite — ce qui laisse volontairement le tampon retomber à 1, et la prochaine réévaluation d'état retombe alors naturellement sur `isAlainMemoryIntro` pour donner à cette question son propre décompte de mémorisation avant de devenir validable. Toute la mécanique de décompte/révélation (`prepareNextBossQuestion`, `toRoomDTO`, `buildState`) est déjà générique sur cette condition et n'a donc pas eu besoin de changement pour ce cas — seul `BrainrunQuestionRunner.vue` (`nextQuestion`) a dû être élargi pour déclencher `readyNextBossQuestion()` aussi quand seul `previewQuestion` existe (pas `currentQuestion`), sans quoi le décompte ne démarrait jamais.

## Mécanique de combat contre-la-montre

- PV du boss : `BRAINRUN_BOSS_MAX_HP` = 5 × `BRAINRUN_BOSS_BASE_DAMAGE` = 5 × 20 = 100.
- Chrono par question : `BRAINRUN_BOSS_QUESTION_TIME_MS` = 15 000ms (allongé de 10s à 15s pour compenser le passage à une décroissance continue plutôt que par paliers).
- Dégâts d'une réponse correcte : `brainrunPotentialBossDamage(elapsedMs)` décroît **linéairement** de `BRAINRUN_BOSS_BASE_DAMAGE × BRAINRUN_BOSS_FAST_DAMAGE_MULTIPLIER` (20×2.5=50, réponse immédiate) à 0 (temps écoulé) — pas de palier fixe. Fonction partagée client/serveur (`shared/brainrun.ts`) : le client l'utilise pour l'aperçu pendant le combat, le serveur pour le calcul réel.
- Réponse incorrecte = 0 dégât. Timeout (`isBossAnswerTimedOut`) = échec forcé côté serveur **quelle que soit la réponse envoyée par le client** — ne jamais faire confiance à une réponse client après le délai.
- Le chrono ne démarre qu'après l'appel explicite `prepareNextBossQuestion` (une fois que le joueur a fini de lire le feedback de la question précédente) — ne pas décompter le temps de lecture à l'insu du joueur.
- Pas de limite de questions : `getNextBossQuestionId` en tire une nouvelle à la volée tant que le boss n'est pas à 0 PV exactement. Filet de sécurité si le vivier de questions inédites du palier est épuisé (run très longue) : retombe sur des questions déjà vues plutôt que de bloquer le combat.

## Résurrection du Phoenix (`phoenix_revive`)

Cas spécial le plus complexe du système de boss : à 0 PV, le combat **ne se termine pas** immédiatement pour les 2 premières fois (`activeRoom.bossPhase < 2`). La vraie résurrection (PV remontés à 50% puis 25% de `BRAINRUN_BOSS_MAX_HP`, `bossPhase` incrémenté) n'a lieu qu'au clic sur "Continuer" (`prepareNextBossQuestion`), pas dans `submitAnswer` — pour laisser au joueur le temps de croire qu'il a gagné avant l'animation de résurrection côté client. `submitAnswer` marque juste `bossRevived: true` sur la réponse pour signaler l'UI.

## Si tu ajoutes un ennemi/élite/boss

1. Vérifier le volume de questions (piège ci-dessus) avant de figer les thèmes.
2. Un ennemi/élite : ajouter une entrée à `BRAINRUN_ENEMIES`, respecter la convention 2-3 thèmes (Classique) / 4-5 thèmes (Élite), inclure `culture_generale` si tu veux le diluer parmi les autres thèmes plutôt que le laisser dominer.
3. Un boss : ajouter à `BRAINRUN_BOSSES` avec `culture_generale` **toujours** dans les thèmes, et soit réutiliser un `malus` existant soit en créer un nouveau — ajouter le nouveau cas au type `BrainrunBossMalusId`, puis, selon sa catégorie :
   - **Affichage** (comme les 6 historiques) : nouveau cas dans `useBrainrunBossMalus.ts` (`setupForCurrentQuestion`/`displayPropositions`), aucun changement serveur.
   - **Numérique** (comme `damage_resist`/`speed_reduction`) : composer une nouvelle fonction pure dans `server/utils/brainrunLogic.ts` (constantes dans `brainrunConfig.ts`) branchée sur le point d'extension déjà utilisé par les reliques équivalentes (`applyRelicsToBossDamage` pour les dégâts, `bonusTimeMs` pour le chrono) plutôt que sur un chemin de calcul séparé, et faire respecter le consommable Antidote (`reveal.malusCancelled`) comme pour les malus d'affichage.
   - **Flux de questions** (comme `memory_recall`) : nettement plus lourd — touche `BrainrunStateDTO`/`toRoomDTO`/`buildState`/`submitAnswer`/`prepareNextBossQuestion` côté serveur ET la structure du template de `BrainrunQuestionRunner.vue` côté client (pas qu'un nouveau cas dans un composable existant). Ne pas sous-estimer l'effort avant de s'engager sur ce type de malus — voir la section "Alain" ci-dessus comme référence complète d'implémentation avant d'en ajouter un autre du même genre.
4. Aucune migration Prisma nécessaire pour un nouvel ennemi/boss (catalogue en code, seul l'`id` est persisté sur `BrainrunRoom.enemyId`/`bossId`).
