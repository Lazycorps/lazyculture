# Ennemis, Élites et Boss

## Catalogue ennemis/élites (`shared/brainrunEnemies.ts`)

`BRAINRUN_ENEMIES: BrainrunEnemyDef[]` — chaque entrée : `id`, `name`, `act` (1-3), `tier` (`CLASSIC` | `ELITE`), `themes` (slugs de `QuestionTheme` : 2-3 pour un Classique, 4-5 pour un Élite). ~10 Classiques + 5 Élites par acte, thématisés (ex. "Le Fan de Ciné" = cinema/series_cultes/culture_generale).

Accès : `getBrainrunEnemiesByActAndTier(act, tier)`, `getBrainrunEnemyById(id)`.

## Catalogue boss (`shared/brainrunBosses.ts`)

`BRAINRUN_BOSSES: BrainrunBossDef[]` — 6 boss nommés, 2 par acte : `id`, `name`, `act`, `malus` (`BrainrunBossMalusId`), `themes` (5-6 selon le boss depuis l'élargissement 2026-07-09, `culture_generale` **systématiquement inclus**). Un seul boss par acte, tiré au hasard parmi les 2 candidats de l'acte.

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

`BrainrunBossMalusId` (6 valeurs) — effets purement d'**affichage** côté client (`app/composables/useBrainrunBossMalus.ts`), la soumission de réponse repose toujours sur les `proposition.id` d'origine, jamais modifiés par un malus :

| Malus                | Boss (ex.)           | Effet                                                                                        |
| -------------------- | -------------------- | -------------------------------------------------------------------------------------------- |
| `hidden_answer`      | Gilbert (acte 1)     | Une proposition tirée au hasard est masquée ("???"), reste cliquable                         |
| `swap_answers`       | Le Joker (acte 1)    | 2 propositions échangent leur position toutes les 4s (`SWAP_INTERVAL_MS`)                    |
| `mirror_answers`     | La Sorcière (acte 2) | Propositions affichées en miroir                                                             |
| `scrambling_letters` | François (acte 2)    | Lettres mélangées 1s sur 5 (`SCRAMBLE_INTERVAL_MS`/`SCRAMBLE_RATIO`), reviennent après 700ms |
| `phoenix_revive`     | Le Phoenix (acte 3)  | Ressuscite à 50% puis 25% PV — voir mécanique dédiée ci-dessous                              |
| `progressive_blur`   | Gérard (acte 3)      | Flou qui se dissipe jusqu'à net à 3s restantes (`BLUR_CLEAR_AT_MS`)                          |

Les 5 malus impactant l'affichage des réponses (tous sauf `phoenix_revive`) sont désactivés dès que la réponse est validée (`revealed` passé à `useBrainrunBossMalus`) : plus de masquage/swap/miroir/mélange/flou pendant le feedback, pour que le joueur voie les réponses réelles. `setupForCurrentQuestion` (tirage de la proposition masquée par Gilbert, redémarrage des timers de swap/scramble) ne doit se redéclencher que sur un **changement réel de question** — `BrainrunQuestionRunner.vue` compare `question.id`, pas la référence d'objet, car chaque round-trip serveur (y compris l'usage d'un consommable qui ne change pas de question, ex. 50/50) renvoie un nouvel objet `currentQuestion` ; comparer par référence re-tirait au hasard une nouvelle réponse masquée à chaque consommable utilisé, révélant l'ancienne (bug corrigé le 2026-07-10).

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
3. Un boss : ajouter à `BRAINRUN_BOSSES` avec `culture_generale` **toujours** dans les thèmes, et soit réutiliser un `malus` existant soit en créer un nouveau — dans ce cas, ajouter le rendu correspondant dans `useBrainrunBossMalus.ts` (nouveau cas dans `setupForCurrentQuestion`/`displayPropositions`) et le type dans `BrainrunBossMalusId`.
4. Aucune migration Prisma nécessaire pour un nouvel ennemi/boss (catalogue en code, seul l'`id` est persisté sur `BrainrunRoom.enemyId`/`bossId`).
