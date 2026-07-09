# Bibliothèque, Librairie et Événements

Ces 3 salles spéciales (+ le type `SHOP`/`REST`/`EVENT`) partagent un patron commun : `chooseNode` les passe en `ACTIVE` sans tirer de question, une méthode de résolution dédiée dans `BrainrunService` les fait passer en `CLEARED`, puis `acknowledgeRoom` avance la run (sauf `SHOP` qui avance directement via `leaveShop`).

## ⚠️ Nommage : ne pas confondre avec les commentaires du code

Les libellés joueur sont définis dans `app/composables/useBrainrunRoomTypeDisplay.ts` :

- `REST` → **"Bibliothèque"**
- `SHOP` → **"Librairie"** (mais les commentaires de `BrainrunService.ts` l'appellent presque partout "Boutique" — incohérence de nommage interne/UI à connaître, pas une distinction fonctionnelle : c'est la même salle)

## Bibliothèque (`REST`)

Résolue par `BrainrunService.resolveRest(runId, choice, theme?)`. Contrairement aux autres salles instantanées, elle **exige toujours un choix explicite** (reste `ACTIVE` tant que non résolue) :

- `"HEAL"` — régénère 1 PV (`instantRoomHealthDelta("REST")`), plafonné à `maxHealthPoint`.
- `"BAN_THEME"` — bannit un thème pour le reste de la run (`run.bannedThemes`), en s'assurant qu'il fait partie de `availableThemesToBan` (calculé par `computeAvailableThemesToBan` : union des thèmes de tous les ennemis/boss, moins `culture_generale` — **jamais bannissable** car systématique dans les boss — et moins les thèmes de `computeUnsafeToBanThemes` — un thème partagé par **tous** les boss d'un même acte, ex. `anime-manga` pour l'Acte 2, viderait entièrement le pool de boss de cet acte si banni). Une fois banni, ce thème est exclu du tirage d'ennemis/boss (même filtre `notBanned` que la relique Purge Thématique — voir `items.md`) **et** directement des questions tirées (`bannedThemes` passé en `excludeThemes` à `QuestionService.getRandomIdsByDifficulty`) — indispensable car une question peut porter plusieurs thèmes à la fois, donc filtrer uniquement sur les thèmes de l'ennemi/boss ne suffit pas à garantir qu'un thème banni n'apparaisse jamais.

## Librairie (`SHOP`)

- **Entrée** (`chooseNode`) — génère les offres via `generateShopOffers` : `BRAINRUN_SHOP_RELIC_OFFER_COUNT` (2) reliques non possédées (priorité par rareté, prix par rareté : `BRAINRUN_RELIC_SHOP_PRICE` COMMON 40 / RARE 90) + `BRAINRUN_SHOP_CONSUMABLE_OFFER_COUNT` (2) consommables (prix fixe par item, `shopPrice`). Si le pool de reliques non possédées est épuisé, l'emplacement devient une offre d'or gratuit (`BRAINRUN_GOLD_FALLBACK_OFFER_AMOUNT` = 15) plutôt qu'une relique déjà possédée.
- **Achat** (`buyShopItem(offerIndex)`) — débit d'or **atomique et conditionnel** (`updateMany` avec `gold: { gte: price }`) pour éviter qu'un double-clic achète à crédit ; c'est la seule opération Brainrun protégée ainsi avec le déblocage de talent (le reste du service est lecture-puis-écriture, risque mineur assumé). Relique **Marchandeur** (`HAGGLER`) : -20% sur tous les prix (`BRAINRUN_HAGGLER_MULTIPLIER` = 0.8). Relique **Fournisseur Fidèle** (`RESTOCK`) : l'offre achetée est remplacée par une nouvelle du même type (`generateShopReplacementOffer`) plutôt que retirée — le joueur peut acheter en boucle tant qu'il a l'or.
- **Sortie** (`leaveShop`) — marque `CLEARED` et avance directement (pas d'`acknowledgeRoom` intermédiaire, contrairement aux salles de combat/Bibliothèque). Bloqué si un choix de thème banni est en attente (Purge Thématique achetée juste avant).
- Reliques jamais vendues en Librairie : `REVIVE_TOKEN` n'a pas de `shopPrice` (uniquement gagnable en bonus post-combat/Événement) — volontaire, pour ne pas trivialiser une run mal engagée avec de l'or.

## Événements (`EVENT`)

Catalogue `BRAINRUN_EVENTS` (`shared/brainrunItems.ts`) — 6 événements, chacun **exactement 2 options** (`[BrainrunEventOption, BrainrunEventOption]`), typiquement une "sûre" (refuser/ignorer, gratuite) et une "risquée" (coût hp/gold/relique contre récompense) :

| id                  | Thème                 | Coût                           | Récompense                               |
| ------------------- | --------------------- | ------------------------------ | ---------------------------------------- |
| `BLACK_MARKET`      | Marché noir           | 15 or                          | relique aléatoire                        |
| `SACRIFICIAL_ALTAR` | Autel sacrificiel     | 1 PV                           | relique aléatoire                        |
| `FORBIDDEN_LIBRARY` | Bibliothèque défendue | rien / 1 PV                    | 10 or / 2× 50/50                         |
| `MYSTIC_ORACLE`     | Oracle mystique       | 10 or                          | Bouclier + Appel à un ami                |
| `GENEROUS_SPIRIT`   | Esprit généreux       | rien                           | consommable aléatoire                    |
| `MYSTIC_EXCHANGE`   | Échange mystique      | une relique possédée au hasard | une autre relique aléatoire non possédée |

- **Entrée** (`chooseNode`) — tire un `eventId` au hasard dans le catalogue, passe la salle `ACTIVE`.
- **Résolution** (`resolveEvent(optionIndex)`) — logique pure déléguée à `resolveEventOption` (`brainrunLogic.ts`, testable sans DB) : calcule les deltas hp/or, tire une relique aléatoire si récompensée (exclut les reliques déjà possédées, retombe sur de l'or si le pool est épuisé), tire une relique à sacrifier si `RANDOM_OWNED` (aucun effet si le joueur n'en possède aucune). Le service applique ensuite les deltas, gère la mort éventuelle (coût en PV fatal → `finalizeRun("LOST")`, avec le même filet Dernier Souffle que le combat), et l'octroi effectif (`recordRelicDiscovery`, conversion en Purge Thématique en attente si c'est la relique tirée — voir `items.md`).
- **Affichage du résultat** — contrairement aux salles de combat (récap générique or/PV dans `app/pages/brainrun/index.vue`), une salle EVENT `CLEARED` reste affichée par `BrainrunEvent.vue`, qui remplace les 2 boutons de choix par une phrase au passé ("Vous avez obtenu...") + un bouton "Continuer" appelant directement `acknowledgeRoom()`. Le résultat réellement appliqué (utile pour les tirages aléatoires ou un coût annulé par le Bouclier) est persisté par le serveur sur `BrainrunRoom.eventOutcome` (rempli dans `resolveEvent`, exposé via `BrainrunRoomDTO.eventOutcome`) — ne pas essayer de reconstruire ce texte uniquement à partir de l'option statique du catalogue côté client.
- Relique **Aimant à Événements** (`EVENT_MAGNET`) : quand elle est obtenue (via bonus/boutique/événement), convertit rétroactivement les nœuds `STANDARD`/`ELITE` pas encore atteints de l'acte en `EVENT` avec une probabilité (`convertUpcomingNodesToEvents`) — même fonction pure `maybeConvertNodeToEvent` que la génération de carte initiale (voir `map.md`).

## Si tu ajoutes une salle spéciale ou modifies celles-ci

- Un nouvel événement : ajouter une entrée à `BRAINRUN_EVENTS` avec exactement 2 `BrainrunEventOption` — la logique de résolution (`resolveEventOption`) est déjà générique (hp/gold/relic/consumables), pas besoin de nouveau code sauf effet vraiment inédit (ex. un coût/récompense qui n'est pas hp/gold/relic/consumable).
- Un nouveau type de salle instantanée : suivre le patron Bibliothèque/Librairie — statut `ACTIVE` tant que non résolu, méthode de résolution dédiée dans `BrainrunService`, décider si elle avance directement (comme `leaveShop`) ou via `acknowledgeRoom` (comme `resolveRest`/`resolveEvent`), et l'ajouter à `BRAINRUN_INSTANT_ROOM_TYPES` + aux quotas de `map.md`.
