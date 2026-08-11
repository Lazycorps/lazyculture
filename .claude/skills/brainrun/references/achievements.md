# Hauts faits Brainrun

Les hauts faits (« achievements ») de Brainrun réutilisent le **système générique** du site, pas
un système propre au mode : table `Achievement` (+ `UserAchievement`), déblocage via
`checkAndAwardAchievements(userId, conditionType, valeur)` (`server/utils/achievementHelper.ts`).
Rien n'est stocké spécifiquement pour Brainrun — tout est **dérivé des runs / du métagame** en fin
de partie.

## Format d'un haut fait (table `Achievement`)

| champ                   | rôle                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `conditionType`         | clé de déclenchement (ex. `brainrunWins`), doit exister dans `ActionType`          |
| `conditionValue`        | seuil `Int` ; débloqué quand `valeur ≥ seuil` (sauf `speedrunSprintBestTime`, `≤`) |
| `title` / `description` | affichés en tooltip du badge (profil, `AchievementsCard.vue`)                      |
| `xpEarned`              | XP versé au déblocage (via `updateUserProgress`)                                   |
| `icon`                  | chemin `/images/achievements/achievement_{id}.webp` ; **vide → fallback 🏆**       |
| `hidden`                | badge masqué du profil tant que non débloqué (mais débloquable et toast normal)    |

Les lignes `Achievement` sont **des données en base, sans fichier de seed** dans le repo (les ~45
existants ont été insérés ad hoc). Pour (ré)insérer, écrire un script idempotent Prisma jetable
(upsert par `title`) — ne pas committer de seed sauf demande explicite.

## `conditionType` Brainrun et où ils sont déclenchés

Tous déclenchés dans `BrainrunService.ts`. **Les runs de debug (`isDebugRun`) ne débloquent
rien** (garde en amont dans `finalizeRun`/`abandonRun`, cohérent avec XP/pièces/PS).

### `awardBrainrunProgressAchievements(userId)` — fin de run **et** abandon

Dérivé de **toutes** les runs terminées (`WON`/`LOST`/`ABANDONED`, non-debug) et du métagame :

| `conditionType`                    | valeur passée                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `brainrunGames`                    | nb de runs terminées                                                              |
| `brainrunMaxFloor`                 | max de `brainrunGlobalFloor(currentAct, currentRow)` (Actes 1-10 / 11-19 / 20-28) |
| `brainrunMaxHp`                    | max de `maxHealthPoint` sur les runs                                              |
| `brainrunElitesDefeated`           | `brainrunRoom.count` type=ELITE status=CLEARED                                    |
| `brainrunBossesDefeated`           | `brainrunRoom.count` type=BOSS status=CLEARED                                     |
| `brainrunAllRelicsDiscovered`      | 1 si `discoveredRelics` ⊇ `BRAINRUN_RELICS`, sinon 0                              |
| `brainrunAllConsumablesDiscovered` | 1 si `discoveredConsumables` ⊇ `BRAINRUN_CONSUMABLES`, sinon 0                    |

### `awardBrainrunRunRecordAchievements(userId, rooms)` — fin de run (WON/LOST)

Records **d'une seule run**, dérivés des `responses[]` des salles de combat (aplaties dans l'ordre
acte→rangée→colonne via `collectCombatResponses`) :

| `conditionType`      | valeur passée                               |
| -------------------- | ------------------------------------------- |
| `brainrunRunCorrect` | nb de réponses `success`                    |
| `brainrunRunStreak`  | plus longue série de `success` consécutifs  |
| `brainrunRunGold`    | somme des `goldEarned` des salles de la run |

### `finalizeRun`, gated `status === "WON"`

| `conditionType`       | condition                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------- |
| `brainrunWins`        | nb de runs `WON`                                                                          |
| `brainrunFlawlessWin` | aucune réponse avec `hpLoss > 0` (Bouclier ramène `hpLoss` à 0 → compte comme sans dégât) |
| `brainrunLowHpWin`    | `run.healthPoint === 1`                                                                   |
| `brainrunNoRestWin`   | aucune salle `REST` `CLEARED` (hidden)                                                    |
| `brainrunReviveWin`   | une réponse avec `extraLifeUsed` (les 3 filets de résurrection le posent) (hidden)        |

### `unlockTalent(userId, talentId)` — déblocage de talent (lobby, hors run)

| `conditionType`              | valeur passée                                        |
| ---------------------------- | ---------------------------------------------------- |
| `brainrunTalentsUnlocked`    | `unlockedTalents.length`                             |
| `brainrunAllTalentsUnlocked` | 1 si `unlockedTalents` ⊇ `BRAINRUN_TALENTS`, sinon 0 |

## Catalogue actuel (ids 51-71, + 39/40 rééquilibrés)

23 HF au total. Les seuils « toutes/tous » (`brainrunAll*`) comparent au **catalogue courant** :
ajouter une relique/consommable/talent relève automatiquement l'objectif pour les nouveaux joueurs
(les joueurs déjà récompensés gardent leur badge — `UserAchievement` est permanent).

## Pièges / points d'attention

- **`brainrunAll*` = valeur 0/1**, pas un compte : le seuil `conditionValue` est **1**. Ne pas
  mettre le nombre d'items du catalogue en `conditionValue`, sinon le HF ne s'adapte plus.
- **Comparaison superset**, pas `length >=` : robuste si un item est retiré du catalogue.
- Un nouveau `conditionType` doit être ajouté à l'union `ActionType`
  (`server/utils/achievementHelper.ts`) **et** déclenché quelque part, sinon la ligne `Achievement`
  reste inerte (jamais débloquée).
- **Icônes** : convention `/images/achievements/achievement_{id}.webp`. Tant que non générées,
  laisser `icon = ""` → fallback 🏆 (`Achievement.vue`).
- Les HF cachés (`hidden`) sont filtrés de l'affichage profil mais débloqués/notifiés normalement.
- Rééquilibrer un HF = simple `UPDATE` de la ligne (script idempotent par `title`), aucune
  incidence code.
