# Érudition (degrés de difficulté)

Ajoutée le 2026-08-13. Échelle de difficulté persistante façon Ascension (Slay the Spire) / Chaleur
(Hades) : **un compteur unique** de 0 à 10, chaque niveau ajoutant **un** modificateur cumulatif.
Choix explicite du joueur au lancement d'une run, jamais imposé.

## Catalogue et agrégation (`shared/brainrunErudition.ts`)

Défini en code et partagé client/serveur, comme les autres catalogues (`brainrunItems`/`Talents`/
`Bosses`) : le serveur applique les effets, le client affiche les libellés (sélecteur du lobby,
badge de run, classement).

- `BRAINRUN_ERUDITION_LADDER: BrainrunEruditionStep[]` — l'échelle, **index 0 = niveau I**. Chaque
  cran = un `label` joueur + le(s) champ(s) d'effet qu'il ajoute. Ajouter un cran à ce tableau suffit :
  `BRAINRUN_MAX_ERUDITION` en découle (`.length`) et l'agrégation est générique.
- `getBrainrunEruditionEffects(level)` → `BrainrunEruditionEffects`, effets cumulés jusqu'à `level`
  inclus. Même rôle que `getActiveRelicEffects`/`getActiveTalentEffects` : **un seul objet d'effets
  que les consommateurs lisent**, jamais de `if (erudition >= 3)` dispersé dans le service.
  Niveau hors bornes → borné (pas d'exception).
- `brainrunEruditionLabel(level)` → « Standard » (0) ou « Érudition IV » (chiffres romains).

### ⚠️ Agrégation par SOMME, pas par MAX

Tous les champs numériques s'additionnent, **y compris les pourcentages** — c'est volontairement
l'inverse du piège d'agrégation des talents (cf. `talents.md`). Deux niveaux à +10 % de PV de boss
(I et V) donnent bien **+20 %**. Un nouveau champ d'effet doit suivre cette règle.

## L'échelle actuelle

| Niveau | Modificateur                                          | Champ d'effet         |
| ------ | ----------------------------------------------------- | --------------------- |
| I      | Boss : +10 % PV                                       | `bossHpBonusPct`      |
| II     | Élites : 6 questions au lieu de 5                     | `eliteQuestionBonus`  |
| III    | Librairie : prix +25 %                                | `shopPriceBonusPct`   |
| IV     | Bibliothèque : ne soigne plus que 1 PV (au lieu de 2) | `restHealMalus`       |
| V      | Boss : +10 % PV (cumulé +20 %)                        | `bossHpBonusPct`      |
| VI     | Or gagné en combat : −25 %                            | `goldMalusPct`        |
| VII    | Boss : chrono de 13 s au lieu de 15 s                 | `bossTimeMalusMs`     |
| VIII   | Cartes de thème : 2 propositions au lieu de 3         | `themeCardCountDelta` |
| IX     | Vaincre un boss ne régénère plus les PV               | `disablesBossHeal`    |
| X      | 1 emplacement de consommable en moins (3 → 2)         | `consumableSlotMalus` |

Le niveau IV s'est accompagné d'un **buff du mode de base** : `BRAINRUN_REST_HEAL` est passé de 1 à
2 PV (`brainrunConfig.ts`), pour que le modificateur retire quelque chose de réel plutôt que de
neutraliser une salle déjà tiède.

## Points d'intégration (tous branchés sur l'existant)

Chaque effet se compose sur un point d'extension **déjà utilisé par une relique/un talent**, plutôt
que d'introduire un chemin de calcul parallèle :

| Effet                 | Où                                                                                      |
| --------------------- | --------------------------------------------------------------------------------------- |
| `bossHpBonusPct`      | `brainrunBossMaxHp` (`brainrunLogic.ts`) — voir `enemies-and-bosses.md`                 |
| `eliteQuestionBonus`  | `resolveNodeChoice`, à côté de `BRAINRUN_QUESTIONS_PER_ROOM` (ELITE uniquement)         |
| `shopPriceBonusPct`   | multiplié avec `effects.shopPriceMultiplier` (Marchandeur) passé à `generateShopOffers` |
| `restHealMalus`       | `instantRoomHealthDelta(type, erudition)`                                               |
| `goldMalusPct`        | `applyEruditionToGold`, **en dernier** dans reliques → talents → Érudition              |
| `bossTimeMalusMs`     | soustrait du `bonusTimeMs` partagé avec Chronomètre Brisé et le malus de Flash          |
| `themeCardCountDelta` | `generateThemeCardOffer` (plancher à 1 carte)                                           |
| `disablesBossHeal`    | `submitAnswer`, sur le `bossDefeated ? run.maxHealthPoint : ...`                        |
| `consumableSlotMalus` | `maxConsumableSlots(relics, erudition)` (plancher à 1 emplacement)                      |

## Persistance et déblocage

- `BrainrunRun.erudition` (défaut 0) — niveau **figé à la création** de la run.
- `BrainrunMetaProgress.maxEruditionUnlocked` (défaut 0) — plus haut niveau jouable.
- Migration : `20260813120000_brainrun_erudition`. Les runs/joueurs existants retombent sur 0, donc
  sur le comportement historique — d'où le test « niveau 0 strictement neutre ».
- Déblocage : `finalizeRun` appelle `unlockErudition(userId, run.erudition + 1)` **uniquement** sur
  `WON` et **uniquement** si la run n'est pas `isDebugRun` (même règle que XP/pièces/PS/achievements).
- `unlockErudition` (`brainrunMetaHelper.ts`) est **monotone** : `updateMany` avec
  `where: { maxEruditionUnlocked: { lt: level } }`, donc regagner à un niveau inférieur ne fait
  jamais redescendre la progression et deux fins de run concurrentes ne s'écrasent pas.

## UI

- **Lobby** (`BrainrunLobby.vue`) : encart Érudition avec un `input[range]` de 0 à
  `maxEruditionUnlocked`, la liste des modificateurs actifs au niveau sélectionné, et le plus haut
  niveau **présélectionné** (`watch immediate` sur `maxEruditionUnlocked`, qui arrive de façon
  asynchrone). À 0 débloqué, l'encart reste affiché mais **verrouillé** (« Gagnez une run pour
  débloquer l'Érudition I ») plutôt que masqué — le joueur doit savoir que l'échelle existe.
  L'événement `start` porte le niveau choisi (`start: [erudition: number]`).
- **HUD de run** (`app/pages/brainrun/index.vue`) : badge à côté de l'acte/étage, masqué à 0.
- **Classement** : voir `leaderboard.md`.

## ⚠️ Intégrité : pourquoi le lobby reste plafonné même pour un admin

Le sélecteur du lobby est borné à `maxEruditionUnlocked`, et `createRun` **re-borne côté serveur**
(jamais confiance au client). Le seul contournement est `debugSetStats({ erudition })`, qui pose
`isDebugRun: true` et sort donc la run du classement. Ne **jamais** ajouter un chemin permettant de
démarrer une run à un niveau non débloqué sans marquer `isDebugRun` : ça produirait une
« Érudition X » non gagnée en tête du classement.

## Pièges

- **NaN dans le tri du classement** (rencontré et corrigé à l'implémentation) : `bestWonErudition`
  se calcule avec `Math.max(..., run.erudition ?? 0)`. Sans le `?? 0`, un champ absent propageait un
  `NaN` qui faussait **toutes** les comparaisons du tri, pas seulement celle du joueur concerné.
- **Changement de niveau en cours de run (debug)** : les modificateurs déjà consommés ne sont pas
  recalculés rétroactivement (PV d'un boss déjà engagé, offres de Boutique déjà générées). Changer
  de niveau vaut pour la suite de la run.
- **Planchers** : cartes de thème ≥ 1, emplacements de consommables ≥ 1, soin de Bibliothèque ≥ 0.
  Si l'échelle s'allonge, garder ces planchers — à 0, ces systèmes deviennent muets plutôt que durs.
- **Budget de temps du boss** : le chrono cumule les malus (Érudition VII −2 s + Flash jusqu'à
  −7,5 s) et descend au minimum à 5,5 s sur les 15 s de base. Ajouter un nouveau malus de temps sans
  vérifier ce cumul pourrait faire passer le total à ≤ 0, auquel cas toute réponse est comptée hors
  délai (`isBossAnswerTimedOut`) et n'inflige aucun dégât.
