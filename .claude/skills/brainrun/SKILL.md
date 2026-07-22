---
name: brainrun
description: Base de connaissance et workflow pour toute demande touchant au mode de jeu Brainrun (roguelite solo) de ce repo — ajout, modification, correction ou équilibrage. Utilise ce skill dès que la demande mentionne Brainrun, ou l'un de ses sous-systèmes : carte à embranchements (acte/rangée/nœud), ennemis/élites, boss (malus, contre-la-montre), salle Bibliothèque (REST) ou Librairie (SHOP), événements, consommables, reliques, talents/Points de Savoir/métagame, ou tout ajustement de valeurs (or/PV/XP/dégâts/prix/probabilités) de ce mode — même si l'utilisateur ne dit pas explicitement "Brainrun" mais décrit un de ces éléments. Charge d'abord les fichiers de référence pertinents au lieu de re-scanner le code, pose des questions de clarification si la demande est ambiguë, vérifie l'impact croisé sur les autres sous-systèmes avant d'implémenter, relit/refactore après implémentation, et met à jour (ou crée) la documentation de référence concernée.
---

# Brainrun

Brainrun est un système d'environ 50 fichiers avec beaucoup d'interdépendances : une relique peut modifier le combat de boss, la boutique _et_ la génération de carte en même temps ; un nouvel ennemi doit être vérifié contre le volume réel de questions par thème/difficulté ; un nouveau champ persistant touche Prisma, le DTO, le service et potentiellement le composable client. Repartir de zéro à chaque demande coûte cher et risque d'introduire des incohérences avec l'existant. Ce skill donne accès à une cartographie déjà vérifiée du code réel (pas au doc `BRAINRUN_ROADMAP.md`, qui est obsolète — voir `references/integrations-and-gotchas.md`) et impose un déroulé qui pense aux effets de bord avant d'écrire du code.

## 1. Charger le contexte pertinent

Ne charge que les fichiers utiles à la demande — pas les 7 d'un coup.

| Fichier                                  | Contenu                                                                                                                                                      | Charge-le quand la demande touche…                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `references/structure.md`                | Carte des fichiers par couche (API → service → logique pure → config → catalogues → UI)                                                                      | tu ne sais pas encore où regarder/écrire                                                  |
| `references/rules-and-progression.md`    | Règles d'une run (acte/rangée/PV/or/XP), machine à états d'une salle, métagame (Points de Savoir, talents), pièces/achievements                              | équilibrage global, cycle de vie d'une salle/run, talents                                 |
| `references/map.md`                      | Génération du graphe à embranchements, quotas de types de salle, brouillard de guerre                                                                        | la carte, la navigation, la fréquence d'apparition d'un type de salle                     |
| `references/enemies-and-bosses.md`       | Catalogues ennemis/élites/boss, logique de tirage, malus de boss, combat contre-la-montre                                                                    | ajout/modif d'ennemi, d'élite, de boss, de malus                                          |
| `references/events-shop-library.md`      | Bibliothèque (REST), Librairie (SHOP), Événements                                                                                                            | ces 3 salles spéciales                                                                    |
| `references/items.md`                    | Reliques, consommables, agrégation d'effets, glossaire, système de charges de Bouclier                                                                       | ajout/modif de relique ou consommable, mécanique de Bouclier                              |
| `references/theme-coefficients.md`       | Coefficients de thème par run, cartes post-combat (rareté), tirage pondéré des questions, anti-répétition cartes/questions, difficulté par type de combat    | tirage des questions, cartes de thème, coefficients, difficulté par type, anti-répétition |
| `references/talents.md`                  | Arbre de talents (3 branches × 7 nœuds, prérequis, coûts), pièges d'agrégation (MAX vs somme), filet de résurrection ultime                                  | ajout/modif d'un talent, de l'arbre, du système de PS/métagame                            |
| `references/leaderboard.md`              | Onglet Classement Brainrun : source dérivée des runs, règles de tri (étage max/Victoire/départages), couches, pièges Prisma                                  | ajout/modif du classement Brainrun ou de ses critères de tri                              |
| `references/achievements.md`             | Hauts faits Brainrun : format table `Achievement`, catalogue des `conditionType` et leurs points de déclenchement, seuils « toutes/tous » adaptatifs, pièges | ajout/modif/rééquilibrage d'un haut fait Brainrun                                         |
| `references/integrations-and-gotchas.md` | Dépendances externes (XP/pièces/achievements/questions), pièges connus, staleness de `BRAINRUN_ROADMAP.md`                                                   | avant de faire confiance à une source, ou pour vérifier une intégration externe           |
| `references/debug-mode.md`               | Outils de debug dev-only (forcer PV/or/acte/rangée/ennemi-boss), gate `import.meta.dev`                                                                      | ajout/modif d'un outil de debug/playtesting                                               |

Si aucun fichier ne couvre le sujet, dis-le à l'utilisateur et propose de créer une nouvelle catégorie (étape 6) une fois le travail terminé plutôt que de deviner.

## 2. Clarifier si besoin

Ne pose des questions que si l'ambiguïté changerait réellement l'implémentation (valeur numérique, acte concerné, rareté, effet exact). Si la demande est déjà précise ("ajoute une relique qui donne +2 PV max"), ne pose pas de question pour la forme — vérifie plutôt l'impact croisé (étape 3) et implémente.

## 3. Analyser l'impact croisé avant d'implémenter

C'est l'étape la plus facile à sauter et la plus coûteuse à sauter. Avant d'écrire du code, vérifie explicitement (et dis à l'utilisateur ce que tu as vérifié) :

- **Reliques/talents existants** : le nouvel élément interagit-il avec `getActiveRelicEffects`/`getActiveTalentEffects` (`server/utils/brainrunLogic.ts`) ? Une nouvelle relique doit composer avec l'agrégation additive existante, pas la contourner.
- **Boutique et bonus post-combat** : si c'est une relique/un consommable, doit-il apparaître dans `generateShopOffers`/`generateBonusOffers` ? A-t-il un prix (`shopPrice`) ou est-il volontairement exclu (comme `REVIVE_TOKEN`) ?
- **Combat de boss** : un nouvel effet touche-t-il les dégâts, le chrono, ou doit-il être bloqué en dehors d'un combat de boss (comme `BOSS_CHRONO_BOOST`/`BOSS_DAMAGE_BOOST`/`MALUS_CANCEL`) ?
- **Carte/quotas** : un nouveau type de salle ou un effet de conversion de nœud change-t-il les quotas de `brainrunConfig.ts` (`BRAINRUN_MIN_*_OFFERS`, `BRAINRUN_MIN_PURE_COMBAT_RATIO`) ?
- **Volume de questions** : un nouvel ennemi/boss/thème doit être vérifié contre le volume réel de questions par thème/difficulté (voir la mémoire `project_question_bank_theme_difficulty_stats` — re-lancer la requête si la décision est à enjeu, ne jamais sommer des totaux par thème sans calculer l'union dédupliquée sur la bande de difficulté exacte).
- **Économie/XP/pièces/achievements** : un changement de règle d'or/XP a-t-il un effet sur `calculBrainrunUserXP`, `grantBrainrunActCoins` (plafond quotidien partagé avec le quiz du jour), ou les seuils d'achievement `brainrunGames`/`brainrunWins` ?
- **Modèle de données** : un nouveau champ persistant nécessite une migration Prisma + mise à jour du DTO (`shared/brainrun.ts`/`shared/DTO/brainrunResponseDTO.ts`) + `toRunDTO`/`toRoomDTO` dans `BrainrunService.ts`.
- **Mode debug** (`references/debug-mode.md`) : tout renommage/changement de forme touchant la carte (`pickBrainrunActRowWidths`/`getBrainrunRoomsPerAct`, `BrainrunRoomType`) ou le tirage ennemi/boss casse potentiellement `debugSetStats`/`debugJumpToNode`/`resolveNodeChoice` et `BrainrunDebugPanel.vue` (imports, bornes act/row/col, catalogues affichés dans les selects) — vérifie et adapte ces fichiers avant de conclure, ne les découvre pas via une erreur de build ultérieure.

## 4. Implémenter en respectant les conventions du repo

- Compose par-dessus les fonctions pures existantes (`applyRelicsToGold`, `applyRelicsToBossDamage`, etc.) plutôt que de dupliquer leur logique ailleurs.
- Respecte la séparation en couches : logique pure et testable dans `server/utils/brainrunLogic.ts`, orchestration DB dans `server/services/BrainrunService.ts`, catalogues de contenu dans `shared/brainrun*.ts`, constantes d'équilibrage dans `server/utils/brainrunConfig.ts` (ou `shared/brainrun.ts` si le client en a aussi besoin).
- Respecte les conventions générales du `CLAUDE.md` du projet (alias `~~/`, copy/commentaires en français, logique métier déléguée aux services).
- Lance `vp check` et `vp test` avant de considérer le travail fini.

## 5. Relire et refactorer après implémentation

Avant de conclure, relis le diff comme le ferait `/code-review` ou `/simplify` :

- Pas de duplication d'une constante ou d'une règle déjà définie dans `brainrunConfig.ts`/`shared/brainrun*.ts`.
- Pas de logique de calcul dans un composant Vue ou une route API qui devrait être dans `brainrunLogic.ts`/`BrainrunService.ts`.
- Cohérence de nommage avec l'existant (ex. l'UI dit "Librairie" pour la salle `SHOP`, "Bibliothèque" pour `REST` — garder cette terminologie côté joueur).
- Si le changement touche une zone à risque de concurrence déjà documentée (achat Boutique, déblocage de talent : débit atomique conditionnel), ne pas introduire un nouveau chemin non protégé sans le signaler.

## 6. Mettre à jour la documentation de référence

- Si le comportement décrit dans un `references/*.md` a changé suite à l'implémentation, mets-le à jour dans le même tour — ne laisse pas la doc dériver du code.
- Si ce qui vient d'être ajouté ne rentre dans **aucune** des catégories ci-dessus (ex. un futur système de hauts faits spécifiques à Brainrun, un nouveau mode de génération de carte, une nouvelle mécanique transverse), crée un nouveau `references/<nom-du-sujet>.md` à la fin du développement : structure de données, règles, points d'intégration avec le reste du système, pièges connus — tout ce qu'il faut savoir pour ne pas avoir à relire le code la prochaine fois. Ajoute-le ensuite à la table de l'étape 1 de ce fichier.
- Ne te fie jamais à `BRAINRUN_ROADMAP.md` comme source de vérité sur l'état actuel du contenu (catalogues, valeurs) — voir `references/integrations-and-gotchas.md`.
