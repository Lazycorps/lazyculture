# Arbre de talents (métagame)

Catalogue : `shared/brainrunTalents.ts` (`BRAINRUN_TALENTS`, 21 nœuds). Remplace l'ancien système
de 4 talents plats/indépendants (Constitution, Œil affûté, Bas de laine, Frappe assurée) —
migration effectuée le 2026-07-11, avec remboursement en Points de Savoir des joueurs qui avaient
déjà débloqué un ou plusieurs de ces 4 talents (`scripts/brainrun-talent-tree-refund.mjs`, one-off
déjà exécuté, ne pas relancer).

## Structure

3 branches indépendantes, 7 nœuds chacune, 4 paliers (`tier` 1-3 = paliers normaux, 4 = nœud
ultime) :

- **Résistance** (vert, `RESISTANCE`)
- **Dégâts** (rouge, `DAMAGE`)
- **Utilitaire** (bleu, `UTILITY`)

Chaque nœud a `prerequisites: BrainrunTalentId[]` + `requireAll: boolean` (`true` = tous les
prérequis requis, `false` = un seul suffit). Seuls les 3 nœuds ultimes ont `requireAll: false`
avec 2 prérequis — "un seul chemin de la branche complété suffit à débloquer l'ultime", décision
produit assumée (pas besoin de finir les deux chemins). `unlockTalent`
(`server/utils/brainrunMetaHelper.ts`) vérifie les prérequis avant le débit atomique conditionnel
de PS (même patron que l'achat en Boutique) ; `BrainrunTalentTree.vue` réplique la même règle
côté client pour désactiver le bouton avant même l'appel réseau.

Coûts par palier (cohérents sur les 3 branches, valeurs de départ non calibrées comme le reste du
contenu Brainrun) : palier 1 = 40 PS, palier 2 = 70, palier 3 = 100, ultime = 180.

### Résistance

```
VALIANT_HEART ──▶ ACT_SHIELD ─────────────┐
                                            ├──▶ BOSS_SHIELD ──▶ SECOND_WIND (ultime)
DESPERATE_RAGE ─┐                          │
COLD_BLOOD ─────┴──▶ VITALITY ────────────┘
```

| id               | Palier     | Prérequis                        | Effet                                           |
| ---------------- | ---------- | -------------------------------- | ----------------------------------------------- |
| `VALIANT_HEART`  | 1          | —                                | `START_HP` +1                                   |
| `DESPERATE_RAGE` | 1          | —                                | `BOSS_DAMAGE_AT_LOW_HP` +8 (si 1 PV restant)    |
| `COLD_BLOOD`     | 1          | —                                | `BOSS_TIME_AT_LOW_HP` +5000ms (si 1 PV restant) |
| `ACT_SHIELD`     | 2          | `VALIANT_HEART`                  | `SHIELD_ON_ACT_START`                           |
| `VITALITY`       | 2          | `DESPERATE_RAGE` OU `COLD_BLOOD` | `START_HP` +1                                   |
| `BOSS_SHIELD`    | 3          | `ACT_SHIELD` ET `VITALITY`       | `SHIELD_ON_BOSS_START`                          |
| `SECOND_WIND`    | 4 (ultime) | `BOSS_SHIELD`                    | `ULTIMATE_REVIVE_2HP`                           |

`VITALITY` a été délibérément placé au palier 2 (derrière `DESPERATE_RAGE`/`COLD_BLOOD`) plutôt
qu'en racine parallèle à `VALIANT_HEART` : avoir 2 nœuds "+1 PV max" tous deux en racine aurait
permis +2 PV de départ pour seulement 2 nœuds palier 1, jugé trop facile — décision explicitement
demandée en cours de conception. **Contrairement aux 2 autres branches**, les 2 chemins de
Résistance convergent avant l'ultime plutôt qu'en parallèle jusqu'à lui : `BOSS_SHIELD` exige
`ACT_SHIELD` **et** `VITALITY` (`requireAll: true`, les 2 prérequis sont nécessaires, pas un seul),
donc les 2 chemins doivent être complétés pour l'atteindre ; `SECOND_WIND` n'a alors plus qu'un
seul prérequis (`BOSS_SHIELD`). Décision explicitement demandée en cours de conception — ne pas
appliquer par erreur la règle "un seul chemin suffit" (valable pour Dégâts/Utilitaire) à cette
branche.

### Dégâts

```
REINFORCED_STRIKE ──▶ DECISIVE_STRIKE ──▶ OPENING_BREACH ─┐
                                                            ├──▶ GUARANTEED_STRIKE (ultime)
SHARP_REFLEXES ──▶ EXTENDED_RESPITE ──▶ FIRST_BREATH ─────┘
```

| id                  | Palier     | Prérequis                          | Effet                                                  |
| ------------------- | ---------- | ---------------------------------- | ------------------------------------------------------ |
| `REINFORCED_STRIKE` | 1          | —                                  | `BOSS_DAMAGE_BASE_BONUS` 5                             |
| `SHARP_REFLEXES`    | 1          | —                                  | `BOSS_TIME_BONUS` 3000ms                               |
| `DECISIVE_STRIKE`   | 2          | `REINFORCED_STRIKE`                | `BOSS_DAMAGE_BASE_BONUS` 10 (**total**, MAX pas somme) |
| `EXTENDED_RESPITE`  | 2          | `SHARP_REFLEXES`                   | `BOSS_TIME_BONUS` 5000ms (**total**, MAX pas somme)    |
| `OPENING_BREACH`    | 3          | `DECISIVE_STRIKE`                  | `BOSS_HP_REDUCTION_PCT` 10                             |
| `FIRST_BREATH`      | 3          | `EXTENDED_RESPITE`                 | `BOSS_FIRST_ANSWER_NO_TIMEOUT`                         |
| `GUARANTEED_STRIKE` | 4 (ultime) | `OPENING_BREACH` OU `FIRST_BREATH` | `BOSS_MIN_DAMAGE_FLOOR` 20                             |

**⚠️ Agrégation par MAX, pas par somme** : `BOSS_DAMAGE_BASE_BONUS` (Frappe Renforcée/Décisive) et
`BOSS_TIME_BONUS` (Réflexes Affûtés/Répit Prolongé) sont les 2 seuls cas où `getActiveTalentEffects`
(`server/utils/brainrunLogic.ts`) utilise `Math.max` au lieu d'additionner — le palier 2 est une
valeur "totale" qui remplace le palier 1, pas un bonus qui s'y ajoute. Si tu ajoutes un futur nœud
avec la même logique ("total, pas cumulé"), réutiliser ce patron plutôt que la somme par défaut.

**`GUARANTEED_STRIKE` (plancher de dégâts)** : appliqué dans `BrainrunService.submitAnswer` juste
après `brainrunBossDamage` (base décroissante), **avant** `applyRelicsToBossDamage` — donc avant
Adrénaline/Frappe/Coup de Grâce, et avant le malus The Rock qui reste appliqué en tout dernier
(cf. `enemies-and-bosses.md`). Ne s'applique jamais à un coup raté (`damage <= 0`). Décision
explicitement confirmée : le plancher **s'applique aussi** à la réponse bénéficiant de
`FIRST_BREATH` (pas d'exception) — un joueur ayant les deux nœuds infligera donc un minimum
garanti de 20 dégâts même en prenant tout son temps sur cette réponse.

**`FIRST_BREATH`** : cf. `enemies-and-bosses.md` (section "Mécanique de combat contre-la-montre")
pour le détail de l'implémentation (`responses.length === 0`, compatibilité native avec Alain).

### Utilitaire

```
NEST_EGG ──▶ STARTER_KIT ──▶ FIRST_TREASURE ─┐
                                               ├──▶ COMPOUND_INTEREST (ultime)
BUSINESS_SENSE ──▶ SHARP_EYE ──▶ GENEROSITY ─┘
```

| id                  | Palier     | Prérequis                        | Effet                                                                        |
| ------------------- | ---------- | -------------------------------- | ---------------------------------------------------------------------------- |
| `NEST_EGG`          | 1          | —                                | `START_GOLD` +20                                                             |
| `BUSINESS_SENSE`    | 1          | —                                | `GOLD_GAIN_PCT` +10%                                                         |
| `STARTER_KIT`       | 2          | `NEST_EGG`                       | `START_RANDOM_CONSUMABLE`                                                    |
| `SHARP_EYE`         | 2          | `BUSINESS_SENSE`                 | `RELIC_RARITY_BOOST` +2 (poids RARE, même mécanisme que l'ancien Œil affûté) |
| `FIRST_TREASURE`    | 3          | `STARTER_KIT`                    | `START_RANDOM_COMMON_RELIC`                                                  |
| `GENEROSITY`        | 3          | `SHARP_EYE`                      | `ELITE_BONUS_OFFER_EXTRA` (+1 offre, Élites uniquement)                      |
| `COMPOUND_INTEREST` | 4 (ultime) | `FIRST_TREASURE` OU `GENEROSITY` | `KNOWLEDGE_POINTS_GAIN_PCT` +10%                                             |

- `STARTER_KIT`/`FIRST_TREASURE` : appliqués dans `BrainrunService.createRun` via
  `pickRandomConsumable`/`pickRandomCommonRelic` (`server/utils/brainrunLogic.ts`), qui peuplent
  directement `relics`/`consumables` à la création plutôt que de passer par une offre. Le
  consommable aléatoire peut inclure Dernier Souffle (`REVIVE_TOKEN`) — comme les autres pools
  aléatoires (bonus post-combat, Cargaison Surprise), ce n'est pas un cas exclu.
- `GENEROSITY` : `generateBonusOffers` (`brainrunLogic.ts`) prend désormais un paramètre `count`
  optionnel (défaut `BRAINRUN_BONUS_OFFER_COUNT`) — le call site dans `submitAnswer` passe
  `BRAINRUN_BONUS_OFFER_COUNT + 1` uniquement quand `activeRoom.type === "ELITE"` et le talent
  actif ; le Boss reste toujours à `BRAINRUN_BONUS_OFFER_COUNT`.
- `COMPOUND_INTEREST` : `BrainrunService.knowledgePointsForRun(userId, gold)` calcule
  `base = goldToKnowledgePoints(gold)` puis `bonus = floor(base * pct / 100)`, crédite `base + bonus`
  et persiste `bonus` séparément (`BrainrunRun.knowledgePointsBonus`) pour l'affichage détaillé du
  récap de fin de run (`+24 PS (+3)`, `app/pages/brainrun/index.vue`). Appelé depuis `abandonRun`
  et `finalizeRun` (WON/LOST/ABANDONED, comme la conversion or→PS elle-même) — jamais pour une run
  de debug.

## Système de Bouclier (charges partagées)

Les talents `ACT_SHIELD`/`BOSS_SHIELD` partagent le même compteur de charges que le consommable
Bouclier — détail complet dans `items.md` (section "Bouclier : système de charges partagé"). En
bref : `BrainrunRun.shieldCharges: Int`, `grantShieldCharge`/`consumeShieldCharge`
(`brainrunLogic.ts`), une charge plafonnée au PV actuel, expiration à 0 en fin de chaque combat
(utilisée ou non).

- `ACT_SHIELD` : octroyée à la création de la run (Acte 1, `createRun`) et à chaque transition
  d'Acte (`advanceAfterRoomClear`, quand `outcome.act !== act`).
- `BOSS_SHIELD` : octroyée dans `resolveNodeChoice`, au moment où un nœud `BOSS` est résolu
  (juste avant de tirer les questions), pas à l'entrée physique dans la salle.

## Filet de résurrection ultime (Second Souffle)

`SECOND_WIND` (Résistance) est le 3e et dernier filet de sécurité contre la mort, après le
consommable Dernier Souffle et la relique Seconde Chance (ordre détaillé dans
`rules-and-progression.md`) — remonte à **2 PV** (pas 1) et ne se déclenche qu'une fois par run
(`BrainrunRun.talentReviveUsed: Boolean`, jamais réinitialisé). Contrairement à la relique Seconde
Chance (qui ne protège que `submitAnswer`), ce filet couvre aussi les morts d'Événement
(`resolveEvent`) — décision délibérée : c'est le filet "de derniers recours", il doit être
universel.

## Si tu ajoutes/modifies un nœud

1. Choisir la branche/le palier/les prérequis en cohérence avec le schéma ci-dessus (paliers 1-3
   = 2-3 nœuds par branche selon la branche, palier 4 = 1 seul nœud ultime).
2. Si l'effet est un doublon "total, pas cumulé" d'un effet existant (comme Frappe
   Renforcée/Décisive), réutiliser le patron d'agrégation par MAX plutôt que la somme.
3. Ajouter le cas dans `getActiveTalentEffects` (`server/utils/brainrunLogic.ts`) et le champ
   correspondant à `BrainrunTalentEffects`.
4. Brancher l'effet au point d'extension pertinent dans `BrainrunService.ts` — suivre la
   checklist d'impact croisé du `SKILL.md` (bouclier/malus boss/carte/offres/économie) avant de
   considérer l'implémentation terminée.
