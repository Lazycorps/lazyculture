import type {
  BrainrunRoomType,
  BrainrunThemeCardDTO,
  BrainrunThemeCardRarity,
} from "#shared/brainrun";
import {
  brainrunPotentialBossDamage,
  BRAINRUN_BOSS_QUESTION_TIME_MS,
  getBrainrunRoomsPerAct,
} from "#shared/brainrun";
import {
  BRAINRUN_BONUS_OFFER_COUNT,
  BRAINRUN_CONSUMABLES,
  BRAINRUN_GOLD_FALLBACK_OFFER_AMOUNT,
  BRAINRUN_RANDOM_STASH_COUNT,
  BRAINRUN_RARITY_WEIGHT,
  BRAINRUN_RELICS,
  BRAINRUN_RELIC_SHOP_PRICE,
  BRAINRUN_SHOP_CONSUMABLE_OFFER_COUNT,
  BRAINRUN_SHOP_RELIC_OFFER_COUNT,
  BRAINRUN_STACKABLE_RELIC_IDS,
  phoneAFriendWrongChance,
  type BrainrunConsumableId,
  type BrainrunEventOption,
  type BrainrunOffer,
  type BrainrunRelicId,
} from "#shared/brainrunItems";
import {
  BRAINRUN_BACKPACK_BONUS_SLOTS,
  BRAINRUN_BRANCH_CHANCE,
  BRAINRUN_CONSOLATION_GOLD,
  BRAINRUN_ENEMY_THEME_BONUS_BY_ACT,
  BRAINRUN_ENEMY_THEME_BONUS_TIER_MULTIPLIER,
  BRAINRUN_EVENT_MAGNET_CHANCE,
  BRAINRUN_FLASH_MAX_TIME_REDUCTION_RATIO,
  BRAINRUN_FLASH_TIME_REDUCTION_STEP_RATIO,
  BRAINRUN_FORCED_ELITE_MID_FLOOR_INDEX,
  BRAINRUN_HAGGLER_MULTIPLIER,
  BRAINRUN_KP_PER_GOLD,
  BRAINRUN_MAX_ELITE_PER_ROUTE,
  BRAINRUN_MIN_EVENT_OFFERS,
  BRAINRUN_MIN_PURE_COMBAT_RATIO,
  BRAINRUN_MIN_REST_OFFERS,
  BRAINRUN_MIN_SHOP_OFFERS,
  BRAINRUN_ROCK_DAMAGE_RESIST_MULTIPLIER,
  BRAINRUN_SIXTH_SENSE_CHANCE,
  BRAINRUN_SPECIALIZATION_HEAL_CHANCE,
  BRAINRUN_THEME_CARD_COEFFICIENT_BY_RARITY,
  BRAINRUN_THEME_CARD_COUNT,
  BRAINRUN_THEME_CARD_RARITY_WEIGHT,
  BRAINRUN_THEME_CARD_INVESTED_CHANCE,
  BRAINRUN_THEME_COEFFICIENT_MAX,
  BRAINRUN_TOTAL_ACTS,
  BRAINRUN_WIN_BONUS_XP,
  BRAINRUN_XP_BY_ROOM_TYPE,
  getBrainrunActRowWidths,
} from "./brainrunConfig";
import { BRAINRUN_TALENTS, type BrainrunTalentId } from "#shared/brainrunTalents";
import type { BrainrunBossMalusId } from "#shared/brainrunBosses";

export function shouldEndRunOnDamage(healthPointAfter: number): boolean {
  return healthPointAfter <= 0;
}

export type NextRowOutcome =
  | { kind: "AWAIT_CHOICE"; act: number; row: number }
  | { kind: "RUN_WON" };

/** Détermine la prochaine rangée à proposer une fois la rangée courante (act/row) nettoyée. */
export function nextRowAfterClear(act: number, row: number): NextRowOutcome {
  if (row < getBrainrunRoomsPerAct(act)) {
    return { kind: "AWAIT_CHOICE", act, row: row + 1 };
  }
  if (act < BRAINRUN_TOTAL_ACTS) {
    return { kind: "AWAIT_CHOICE", act: act + 1, row: 1 };
  }
  return { kind: "RUN_WON" };
}

export function instantRoomHealthDelta(type: "REST" | "SHOP" | "EVENT"): number {
  return type === "REST" ? 1 : 0;
}

/** true dès que le temps imparti pour répondre à la question de boss est écoulé (+ bonus éventuel de la relique Chronomètre Brisé). */
export function isBossAnswerTimedOut(elapsedMs: number, bonusTimeMs: number = 0): boolean {
  return elapsedMs >= BRAINRUN_BOSS_QUESTION_TIME_MS + bonusTimeMs;
}

/**
 * Dégâts infligés au boss pour une réponse donnée : 0 si incorrecte, sinon la valeur
 * potentielle décroissante selon le temps écoulé (cf. brainrunPotentialBossDamage, partagée
 * avec le client qui l'utilise pour afficher l'aperçu de dégâts pendant le combat).
 */
export function brainrunBossDamage(
  elapsedMs: number,
  success: boolean,
  bonusTimeMs: number = 0,
): number {
  return success ? brainrunPotentialBossDamage(elapsedMs, bonusTimeMs) : 0;
}

/** Effets agrégés de toutes les reliques passives possédées ; valeurs neutres si aucune relique. */
export type BrainrunRelicEffects = {
  goldMultiplier: number;
  flatGoldBonusPerRoom: number;
  bossTimeBonusMs: number;
  bossDamageBonusPerHit: number;
  hasExtraLife: boolean;
  /** Marchandeur : multiplicateur appliqué aux prix de Boutique (0.8 si possédée). */
  shopPriceMultiplier: number;
  /** Fournisseur Fidèle : un objet acheté en Boutique est remplacé par un autre du même type. */
  autoRestockShop: boolean;
  /** Aimant à Événements : probabilité qu'un futur nœud Combat soit converti en Événement. */
  eventBonusChance: number;
  /** Prévoyance : permet de cliquer un nœud de combat n'importe où sur la carte pour voir les
   * thèmes de son ennemi/boss, avec un bouton pour s'y déplacer si le nœud est accessible. */
  hasForesight: boolean;
  /** Lot de Consolation : or gagné en ignorant le bonus post-combat. */
  goldOnBonusSkip: number;
  /** Sixième Sens : probabilité par question de révéler la bonne réponse après un délai. */
  autoHintChance: number;
  /** Spécialisation : probabilité de récupérer 1 PV à la fin de chaque combat gagné. */
  healChanceOnCombatEnd: number;
  /** Sac à Dos : emplacements de consommables supplémentaires, au-delà du plafond de base. */
  bonusConsumableSlots: number;
};

const NEUTRAL_RELIC_EFFECTS: BrainrunRelicEffects = {
  goldMultiplier: 1,
  flatGoldBonusPerRoom: 0,
  bossTimeBonusMs: 0,
  bossDamageBonusPerHit: 0,
  hasExtraLife: false,
  shopPriceMultiplier: 1,
  autoRestockShop: false,
  eventBonusChance: 0,
  hasForesight: false,
  goldOnBonusSkip: 0,
  autoHintChance: 0,
  healChanceOnCombatEnd: 0,
  bonusConsumableSlots: 0,
};

export function getActiveRelicEffects(relicIds: string[]): BrainrunRelicEffects {
  return relicIds.reduce((effects, id) => {
    switch (id as BrainrunRelicId) {
      case "ENCYCLOPEDIA":
        return { ...effects, goldMultiplier: effects.goldMultiplier * 1.2 };
      case "PROVIDENT_PURSE":
        return { ...effects, flatGoldBonusPerRoom: effects.flatGoldBonusPerRoom + 5 };
      case "SPECIALIZATION":
        return { ...effects, healChanceOnCombatEnd: BRAINRUN_SPECIALIZATION_HEAL_CHANCE };
      case "BACKPACK":
        return {
          ...effects,
          bonusConsumableSlots: effects.bonusConsumableSlots + BRAINRUN_BACKPACK_BONUS_SLOTS,
        };
      case "BROKEN_CHRONOMETER":
        return { ...effects, bossTimeBonusMs: effects.bossTimeBonusMs + 3000 };
      case "ADRENALINE":
        return { ...effects, bossDamageBonusPerHit: effects.bossDamageBonusPerHit + 5 };
      case "SECOND_CHANCE":
        return { ...effects, hasExtraLife: true };
      case "HAGGLER":
        return { ...effects, shopPriceMultiplier: BRAINRUN_HAGGLER_MULTIPLIER };
      case "RESTOCK":
        return { ...effects, autoRestockShop: true };
      case "EVENT_MAGNET":
        return { ...effects, eventBonusChance: BRAINRUN_EVENT_MAGNET_CHANCE };
      case "FORESIGHT":
        return { ...effects, hasForesight: true };
      case "CONSOLATION_PRIZE":
        return { ...effects, goldOnBonusSkip: effects.goldOnBonusSkip + BRAINRUN_CONSOLATION_GOLD };
      case "SIXTH_SENSE":
        return { ...effects, autoHintChance: BRAINRUN_SIXTH_SENSE_CHANCE };
      default:
        return effects;
    }
  }, NEUTRAL_RELIC_EFFECTS);
}

export function applyRelicsToGold(baseGold: number, effects: BrainrunRelicEffects): number {
  if (baseGold <= 0) return baseGold;
  return Math.round(baseGold * effects.goldMultiplier) + effects.flatGoldBonusPerRoom;
}

/** Composé après applyRelicsToGold : bonus d'or en % des talents (Sens du Commerce). */
export function applyTalentsToGold(baseGold: number, talentEffects: BrainrunTalentEffects): number {
  if (baseGold <= 0 || talentEffects.goldGainPct === 0) return baseGold;
  return Math.round(baseGold * (1 + talentEffects.goldGainPct / 100));
}

/** Composé par-dessus brainrunBossDamage (inchangée) : pas de bonus sur un coup raté. */
export function applyRelicsToBossDamage(baseDamage: number, effects: BrainrunRelicEffects): number {
  return baseDamage > 0 ? baseDamage + effects.bossDamageBonusPerHit : 0;
}

export function bossQuestionTimeMsWithRelics(effects: BrainrunRelicEffects): number {
  return BRAINRUN_BOSS_QUESTION_TIME_MS + effects.bossTimeBonusMs;
}

/** Malus "The Rock" (damage_resist) : le boss encaisse 2x moins de dégâts, composé en tout
 * dernier (après reliques/talents/consommables) pour que le reste du kit offensif du joueur
 * reste utile normalement, juste divisé par 2. Consommable Antidote (malusCancelled) l'annule
 * pour la question en cours. */
export function applyBossMalusToDamage(
  damage: number,
  malus: BrainrunBossMalusId | undefined,
  malusCancelled: boolean = false,
): number {
  if (malus !== "damage_resist" || malusCancelled || damage <= 0) return damage;
  return Math.round(damage * BRAINRUN_ROCK_DAMAGE_RESIST_MULTIPLIER);
}

/** Malus "Flash" (speed_reduction) : réduit le temps de réponse de 10% du temps initial par
 * question déjà répondue dans ce combat de boss (cumulatif, plafonné à -50%) — exprimé comme un
 * bonus de temps négatif, composable avec bossTimeBonusMs/chronoBonusMs via le même total.
 * Consommable Antidote (malusCancelled) l'annule pour la question en cours. */
export function flashMalusBonusTimeMs(
  malus: BrainrunBossMalusId | undefined,
  questionsAnsweredInFight: number,
  malusCancelled: boolean = false,
): number {
  if (malus !== "speed_reduction" || malusCancelled) return 0;
  const ratio = Math.min(
    BRAINRUN_FLASH_MAX_TIME_REDUCTION_RATIO,
    BRAINRUN_FLASH_TIME_REDUCTION_STEP_RATIO * questionsAnsweredInFight,
  );
  const reductionMs = Math.round(BRAINRUN_BOSS_QUESTION_TIME_MS * ratio);
  return reductionMs === 0 ? 0 : -reductionMs;
}

/** Malus "Alain" (memory_recall) : vrai tant que la question à valider (index responsesCount de
 * questionIds) n'a pas encore eu de "suivante" tirée pour lui servir de tampon — c'est-à-dire
 * tant que son propre énoncé n'a jamais été montré au joueur. Deux cas concrets :
 * - la toute première question d'un combat contre lui (aucune question précédente n'a pu la
 *   prévisualiser) ;
 * - juste après une réponse validée avec le consommable Antidote actif (reveal.malusCancelled) :
 *   l'écran a alors montré l'énoncé de la question qu'on validait à la place de celui de la
 *   suivante (cf. BrainrunService.submitAnswer, requiredLead), qui n'a donc jamais été affichée.
 * Dans les deux cas, un décompte de mémorisation forcée (BRAINRUN_ALAIN_INTRO_MS) affiche cet
 * énoncé seul, sans réponses ni chrono contre-la-montre, avant que le déroulé normal (décalé
 * d'une question) ne (re)démarre — cf. BrainrunService.prepareNextBossQuestion. */
export function isAlainMemoryIntro(
  malus: BrainrunBossMalusId | undefined,
  responsesCount: number,
  questionIdsCount: number,
): boolean {
  return malus === "memory_recall" && questionIdsCount - responsesCount <= 1;
}

/** Le Bouclier annule la prochaine perte de PV, qu'elle vienne du combat ou d'un Événement ;
 * consomme 1 charge parmi celles actives (consommable Bouclier ou talents Bouclier d'Acte/du
 * Boss, toutes partagent le même compteur). */
export function consumeShieldCharge(
  shieldCharges: number,
  hpLoss: number,
): { hpLoss: number; shieldChargesRemaining: number } {
  if (shieldCharges > 0 && hpLoss > 0) {
    return { hpLoss: 0, shieldChargesRemaining: shieldCharges - 1 };
  }
  return { hpLoss, shieldChargesRemaining: shieldCharges };
}

/** Octroie 1 charge de Bouclier, plafonnée au nombre de PV actuels : une charge au-delà du
 * nombre de cœurs ne peut protéger personne, elle est donc immédiatement perdue plutôt que
 * stockée pour rien. Partagé par le consommable Bouclier et les talents Bouclier d'Acte/du Boss. */
export function grantShieldCharge(currentCharges: number, healthPoint: number): number {
  return Math.min(currentCharges + 1, Math.max(healthPoint, 0));
}

/** Conversion de l'or de fin de run en Points de Savoir (monnaie meta persistante), arrondie
 * à l'entier inférieur. Appelée à la fin d'une run (WON/LOST/ABANDONED). */
export function goldToKnowledgePoints(gold: number): number {
  return Math.max(0, Math.floor(gold * BRAINRUN_KP_PER_GOLD));
}

/** Effets agrégés des talents permanents débloqués ; valeurs neutres si aucun talent.
 * `bonusBossDamagePerHit`/`bonusBossTimeMs` sont agrégés par MAX (pas par somme) : Frappe
 * Décisive/Répit Prolongé sont des valeurs "totales" qui remplacent Frappe Renforcée/Réflexes
 * Affûtés plutôt que de s'y additionner (cf. shared/brainrunTalents.ts). */
export type BrainrunTalentEffects = {
  bonusStartHp: number;
  bonusStartGold: number;
  rareRelicWeightBonus: number;
  bonusBossDamagePerHit: number;
  bonusBossTimeMs: number;
  hasShieldOnActStart: boolean;
  hasShieldOnBossStart: boolean;
  bonusBossDamageAtLowHp: number;
  bonusBossTimeAtLowHpMs: number;
  hasUltimateRevive: boolean;
  bossHpReductionPct: number;
  hasFirstAnswerNoTimeout: boolean;
  bossDamageFloor: number;
  startsWithRandomConsumable: boolean;
  startsWithRandomCommonRelic: boolean;
  goldGainPct: number;
  hasEliteExtraOffer: boolean;
  knowledgePointsGainPct: number;
};

const NEUTRAL_TALENT_EFFECTS: BrainrunTalentEffects = {
  bonusStartHp: 0,
  bonusStartGold: 0,
  rareRelicWeightBonus: 0,
  bonusBossDamagePerHit: 0,
  bonusBossTimeMs: 0,
  hasShieldOnActStart: false,
  hasShieldOnBossStart: false,
  bonusBossDamageAtLowHp: 0,
  bonusBossTimeAtLowHpMs: 0,
  hasUltimateRevive: false,
  bossHpReductionPct: 0,
  hasFirstAnswerNoTimeout: false,
  bossDamageFloor: 0,
  startsWithRandomConsumable: false,
  startsWithRandomCommonRelic: false,
  goldGainPct: 0,
  hasEliteExtraOffer: false,
  knowledgePointsGainPct: 0,
};

export function getActiveTalentEffects(talentIds: string[]): BrainrunTalentEffects {
  return talentIds.reduce((effects, id) => {
    const talent = BRAINRUN_TALENTS[id as BrainrunTalentId];
    if (!talent) return effects;
    switch (talent.effect) {
      case "START_HP":
        return { ...effects, bonusStartHp: effects.bonusStartHp + talent.value };
      case "START_GOLD":
        return { ...effects, bonusStartGold: effects.bonusStartGold + talent.value };
      case "RELIC_RARITY_BOOST":
        return { ...effects, rareRelicWeightBonus: effects.rareRelicWeightBonus + talent.value };
      case "BOSS_DAMAGE_BASE_BONUS":
        return {
          ...effects,
          bonusBossDamagePerHit: Math.max(effects.bonusBossDamagePerHit, talent.value),
        };
      case "BOSS_TIME_BONUS":
        return { ...effects, bonusBossTimeMs: Math.max(effects.bonusBossTimeMs, talent.value) };
      case "SHIELD_ON_ACT_START":
        return { ...effects, hasShieldOnActStart: true };
      case "SHIELD_ON_BOSS_START":
        return { ...effects, hasShieldOnBossStart: true };
      case "BOSS_DAMAGE_AT_LOW_HP":
        return {
          ...effects,
          bonusBossDamageAtLowHp: effects.bonusBossDamageAtLowHp + talent.value,
        };
      case "BOSS_TIME_AT_LOW_HP":
        return {
          ...effects,
          bonusBossTimeAtLowHpMs: effects.bonusBossTimeAtLowHpMs + talent.value,
        };
      case "ULTIMATE_REVIVE_2HP":
        return { ...effects, hasUltimateRevive: true };
      case "BOSS_HP_REDUCTION_PCT":
        return { ...effects, bossHpReductionPct: effects.bossHpReductionPct + talent.value };
      case "BOSS_FIRST_ANSWER_NO_TIMEOUT":
        return { ...effects, hasFirstAnswerNoTimeout: true };
      case "BOSS_MIN_DAMAGE_FLOOR":
        return { ...effects, bossDamageFloor: Math.max(effects.bossDamageFloor, talent.value) };
      case "START_RANDOM_CONSUMABLE":
        return { ...effects, startsWithRandomConsumable: true };
      case "START_RANDOM_COMMON_RELIC":
        return { ...effects, startsWithRandomCommonRelic: true };
      case "GOLD_GAIN_PCT":
        return { ...effects, goldGainPct: effects.goldGainPct + talent.value };
      case "ELITE_BONUS_OFFER_EXTRA":
        return { ...effects, hasEliteExtraOffer: true };
      case "KNOWLEDGE_POINTS_GAIN_PCT":
        return {
          ...effects,
          knowledgePointsGainPct: effects.knowledgePointsGainPct + talent.value,
        };
      default:
        return effects;
    }
  }, NEUTRAL_TALENT_EFFECTS);
}

function weightedRandomPick<T>(items: T[], weight: (item: T) => number, random: () => number): T {
  const totalWeight = items.reduce((sum, item) => sum + weight(item), 0);
  let roll = random() * totalWeight;
  for (const item of items) {
    roll -= weight(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1] as T;
}

function pickUnownedRelics(
  ownedRelics: string[],
  count: number,
  random: () => number,
  /** Bonus de poids ajouté aux reliques RARE (talent "Œil affûté"), 0 par défaut. */
  rareWeightBonus: number = 0,
): BrainrunRelicId[] {
  const available = (Object.keys(BRAINRUN_RELICS) as BrainrunRelicId[]).filter(
    (id) => BRAINRUN_STACKABLE_RELIC_IDS.includes(id) || !ownedRelics.includes(id),
  );
  const picked: BrainrunRelicId[] = [];
  while (picked.length < count && picked.length < available.length) {
    const remaining = available.filter((id) => !picked.includes(id));
    picked.push(
      weightedRandomPick(
        remaining,
        (id) =>
          BRAINRUN_RARITY_WEIGHT[BRAINRUN_RELICS[id].rarity] +
          (BRAINRUN_RELICS[id].rarity === "RARE" ? rareWeightBonus : 0),
        random,
      ),
    );
  }
  return picked;
}

/**
 * Options du bonus proposé après une salle Elite/Boss nettoyée : toujours `count` options
 * (BRAINRUN_BONUS_OFFER_COUNT par défaut, jamais moins — le talent Générosité porte ce compte à
 * BRAINRUN_BONUS_OFFER_COUNT + 1 pour les seules salles Élite), priorité aux reliques non
 * possédées (pondérées par rareté), complétées par des consommables si le pool de reliques est
 * épuisé.
 */
export function generateBonusOffers(
  ownedRelics: string[],
  random: () => number = Math.random,
  rareWeightBonus: number = 0,
  count: number = BRAINRUN_BONUS_OFFER_COUNT,
): BrainrunOffer[] {
  const relics = pickUnownedRelics(ownedRelics, count, random, rareWeightBonus);
  const offers: BrainrunOffer[] = relics.map((id) => ({
    kind: "RELIC",
    id,
    rarity: BRAINRUN_RELICS[id].rarity,
  }));

  const consumableIds = Object.keys(BRAINRUN_CONSUMABLES) as BrainrunConsumableId[];
  while (offers.length < count && consumableIds.length > 0) {
    const id = weightedRandomPick(
      consumableIds,
      (cid) => BRAINRUN_RARITY_WEIGHT[BRAINRUN_CONSUMABLES[cid].rarity],
      random,
    );
    offers.push({ kind: "CONSUMABLE", id });
  }
  while (offers.length < count) {
    offers.push({ kind: "GOLD", id: "GOLD", amount: BRAINRUN_GOLD_FALLBACK_OFFER_AMOUNT });
  }
  return offers;
}

/** Talent Kit de Départ : tire 1 consommable aléatoire pondéré par rareté, comme les autres pools
 * de consommables aléatoires (bonus post-combat, Cargaison Surprise) — peut inclure Dernier
 * Souffle, ce n'est pas un cas spécial ici non plus. */
export function pickRandomConsumable(random: () => number = Math.random): BrainrunConsumableId {
  const consumableIds = Object.keys(BRAINRUN_CONSUMABLES) as BrainrunConsumableId[];
  return weightedRandomPick(
    consumableIds,
    (cid) => BRAINRUN_RARITY_WEIGHT[BRAINRUN_CONSUMABLES[cid].rarity],
    random,
  );
}

/** Talent Premier Trésor : tire 1 relique Commune aléatoire pour démarrer la run avec. */
export function pickRandomCommonRelic(random: () => number = Math.random): BrainrunRelicId {
  const commonRelicIds = (Object.keys(BRAINRUN_RELICS) as BrainrunRelicId[]).filter(
    (id) => BRAINRUN_RELICS[id].rarity === "COMMON",
  );
  return commonRelicIds[Math.floor(random() * commonRelicIds.length)] as BrainrunRelicId;
}

/**
 * Offres de la Boutique : BRAINRUN_SHOP_RELIC_OFFER_COUNT reliques (non possédées, priorité
 * rareté, prix par rareté) + BRAINRUN_SHOP_CONSUMABLE_OFFER_COUNT consommables (prix flat).
 * Si le pool de reliques non possédées est épuisé, les emplacements restants deviennent des
 * offres d'or gratuit (prix 0) plutôt qu'une relique déjà possédée.
 */
export function generateShopOffers(
  ownedRelics: string[],
  random: () => number = Math.random,
  rareWeightBonus: number = 0,
  priceMultiplier: number = 1,
): BrainrunOffer[] {
  const relics = pickUnownedRelics(
    ownedRelics,
    BRAINRUN_SHOP_RELIC_OFFER_COUNT,
    random,
    rareWeightBonus,
  );
  const offers: BrainrunOffer[] = relics.map((id) => ({
    kind: "RELIC",
    id,
    rarity: BRAINRUN_RELICS[id].rarity,
    price: Math.round(BRAINRUN_RELIC_SHOP_PRICE[BRAINRUN_RELICS[id].rarity] * priceMultiplier),
  }));
  while (offers.length < BRAINRUN_SHOP_RELIC_OFFER_COUNT) {
    offers.push({
      kind: "GOLD",
      id: "GOLD",
      amount: BRAINRUN_GOLD_FALLBACK_OFFER_AMOUNT,
      price: 0,
    });
  }

  for (let i = 0; i < BRAINRUN_SHOP_CONSUMABLE_OFFER_COUNT; i++) {
    offers.push(generateShopConsumableOffer(random, priceMultiplier));
  }
  return offers;
}

// REVIVE_TOKEN (Dernier Souffle) n'a pas de shopPrice : jamais en vente, uniquement gagnable
// en bonus post-combat/Événement, pour ne pas trivialiser une run mal engagée avec de l'or.
function sellableConsumableIds(): BrainrunConsumableId[] {
  return (Object.keys(BRAINRUN_CONSUMABLES) as BrainrunConsumableId[]).filter(
    (id) => BRAINRUN_CONSUMABLES[id].shopPrice !== undefined,
  );
}

function generateShopConsumableOffer(random: () => number, priceMultiplier: number): BrainrunOffer {
  const id = weightedRandomPick(
    sellableConsumableIds(),
    (cid) => BRAINRUN_RARITY_WEIGHT[BRAINRUN_CONSUMABLES[cid].rarity],
    random,
  );
  return {
    kind: "CONSUMABLE",
    id,
    price: Math.round(BRAINRUN_CONSUMABLES[id].shopPrice! * priceMultiplier),
  };
}

/**
 * Remplace une offre de Boutique achetée par une nouvelle du même type (relique Fournisseur
 * Fidèle) : une relique non possédée si l'offre achetée était une relique (retombe sur de l'or si
 * le pool de reliques non possédées est épuisé), un consommable sinon.
 */
export function generateShopReplacementOffer(
  kind: BrainrunOffer["kind"],
  ownedRelics: string[],
  random: () => number = Math.random,
  rareWeightBonus: number = 0,
  priceMultiplier: number = 1,
): BrainrunOffer {
  if (kind !== "RELIC") return generateShopConsumableOffer(random, priceMultiplier);

  const [id] = pickUnownedRelics(ownedRelics, 1, random, rareWeightBonus);
  if (!id) {
    return { kind: "GOLD", id: "GOLD", amount: BRAINRUN_GOLD_FALLBACK_OFFER_AMOUNT, price: 0 };
  }
  return {
    kind: "RELIC",
    id,
    rarity: BRAINRUN_RELICS[id].rarity,
    price: Math.round(BRAINRUN_RELIC_SHOP_PRICE[BRAINRUN_RELICS[id].rarity] * priceMultiplier),
  };
}

/**
 * "Cargaison Surprise" : tire BRAINRUN_RANDOM_STASH_COUNT consommables au hasard dans le pool
 * Commun uniquement (jamais Dernier Souffle) ; répétitions possibles, ce n'est pas un choix
 * mais un remplissage direct de l'inventaire.
 */
export function pickRandomStashConsumables(
  random: () => number = Math.random,
  count: number = BRAINRUN_RANDOM_STASH_COUNT,
): BrainrunConsumableId[] {
  const pool = (Object.keys(BRAINRUN_CONSUMABLES) as BrainrunConsumableId[]).filter(
    (id) => BRAINRUN_CONSUMABLES[id].rarity === "COMMON",
  );
  return Array.from(
    { length: count },
    () => pool[Math.floor(random() * pool.length)] as BrainrunConsumableId,
  );
}

/**
 * Résout les deltas d'une option d'Événement choisie ; fonction pure (pas d'accès DB), le tirage
 * d'une relique aléatoire exclut les reliques déjà possédées et retombe sur un bonus d'or si le
 * pool de reliques est épuisé.
 */
export function resolveEventOption(
  option: BrainrunEventOption,
  context: { ownedRelics: string[]; rareWeightBonus?: number },
  random: () => number = Math.random,
): {
  hpDelta: number;
  /** true si l'outcome restaure tous les PV (appliqué par le service, prioritaire sur hpDelta). */
  fullHealGranted: boolean;
  goldDelta: number;
  /** Variation permanente de PV max (≤ 0 : coût explicite `maxHp` de l'option). */
  maxHpDelta: number;
  shieldChargesGranted: number;
  fiftyFiftyChargesGranted: number;
  reviveGranted: boolean;
  relicGranted: BrainrunRelicId | null;
  /** Relique sacrifiée (coût "RANDOM_OWNED") ; null si le joueur n'en possédait aucune. */
  relicLost: BrainrunRelicId | null;
  consumablesGranted: { id: BrainrunConsumableId; amount: number }[];
  /** Index de l'outcome tiré au sort et son texte de lore, pour l'affichage du résultat. */
  outcomeIndex: number;
  resultText: string;
} {
  // Tirage masqué de l'outcome parmi la table pondérée de l'option ("ratio de chance positif").
  const outcome = weightedRandomPick(option.outcomes, (o) => o.weight, random);
  const outcomeIndex = option.outcomes.indexOf(outcome);
  const reward = outcome.reward;

  const hpDelta = (reward?.hp ?? 0) - (option.cost?.hp ?? 0);
  const fullHealGranted = reward?.fullHeal ?? false;
  let goldDelta = (reward?.gold ?? 0) - (option.cost?.gold ?? 0);
  // Seuls les coûts (explicites, sur l'option) réduisent les PV max — jamais un outcome tiré au sort.
  const maxHpDelta = -(option.cost?.maxHp ?? 0);
  const shieldChargesGranted = reward?.shieldCharges ?? 0;
  const fiftyFiftyChargesGranted = reward?.fiftyFiftyCharges ?? 0;
  const reviveGranted = reward?.revive ?? false;

  const consumableIds = Object.keys(BRAINRUN_CONSUMABLES) as BrainrunConsumableId[];
  const consumablesGranted = (reward?.consumables ?? []).map((grant) => ({
    id:
      grant.id === "RANDOM"
        ? weightedRandomPick(
            consumableIds,
            (cid) => BRAINRUN_RARITY_WEIGHT[BRAINRUN_CONSUMABLES[cid].rarity],
            random,
          )
        : grant.id,
    amount: grant.amount,
  }));

  let relicLost: BrainrunRelicId | null = null;
  if (option.cost?.relic === "RANDOM_OWNED" && context.ownedRelics.length > 0) {
    relicLost = context.ownedRelics[
      Math.floor(random() * context.ownedRelics.length)
    ] as BrainrunRelicId;
  }

  let relicGranted: BrainrunRelicId | null = null;
  if (reward?.relic === "RANDOM") {
    // Exclut aussi la relique tout juste sacrifiée (relicLost) : un "échange" ne doit pas
    // pouvoir rendre la même relique. Comme elle fait déjà partie de ownedRelics, elle est
    // naturellement exclue par pickUnownedRelics.
    const [picked] = pickUnownedRelics(
      context.ownedRelics,
      1,
      random,
      context.rareWeightBonus ?? 0,
    );
    if (picked) {
      relicGranted = picked;
    } else {
      goldDelta += BRAINRUN_GOLD_FALLBACK_OFFER_AMOUNT;
    }
  }

  return {
    hpDelta,
    fullHealGranted,
    goldDelta,
    maxHpDelta,
    shieldChargesGranted,
    fiftyFiftyChargesGranted,
    reviveGranted,
    relicGranted,
    relicLost,
    consumablesGranted,
    outcomeIndex,
    resultText: outcome.resultText,
  };
}

/** 50/50 : élimine la moitié des mauvaises propositions (arrondi à l'inférieur), pas toujours 2 —
 * une question vrai/faux (2 propositions) n'en élimine qu'1, ce qui révèle la réponse. */
export function pickFiftyFiftyEliminations(
  propositionIds: number[],
  correctId: number,
  random: () => number = Math.random,
): number[] {
  const wrongIds = propositionIds.filter((id) => id !== correctId);
  const eliminateCount = Math.min(Math.floor(propositionIds.length / 2), wrongIds.length);
  return shuffle(wrongIds, random).slice(0, eliminateCount);
}

/** Appel à un ami : suggère la bonne réponse, avec un risque d'erreur croissant selon la difficulté. */
export function pickPhoneAFriendHint(
  propositionIds: number[],
  correctId: number,
  difficulty: number,
  random: () => number = Math.random,
): number {
  const wrongIds = propositionIds.filter((id) => id !== correctId);
  if (wrongIds.length === 0 || random() >= phoneAFriendWrongChance(difficulty)) return correctId;
  return wrongIds[Math.floor(random() * wrongIds.length)] as number;
}

export function calculBrainrunUserXP(
  clearedRooms: { type: BrainrunRoomType }[],
  won: boolean,
): number {
  const xpByType: Record<string, number> = {
    ...BRAINRUN_XP_BY_ROOM_TYPE,
    REST: 0,
    SHOP: 0,
    EVENT: 0,
  };
  const base = clearedRooms.reduce((sum, r) => sum + (xpByType[r.type] ?? 0), 0);
  return won ? base + BRAINRUN_WIN_BONUS_XP : base;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

/** Position proportionnelle d'une colonne d'une rangée de largeur fromWidth dans une rangée de
 * largeur toWidth (utilisé pour router les arêtes du graphe sans qu'elles ne s'entrecroisent trop). */
function proportionalCol(col: number, fromWidth: number, toWidth: number): number {
  if (fromWidth <= 1) return Math.round((toWidth - 1) / 2);
  return Math.round((col / (fromWidth - 1)) * (toWidth - 1));
}

export type BrainrunGraphEdge = { row: number; col: number; nextCols: number[] };

function pickInitialTargets(
  col: number,
  fromWidth: number,
  toWidth: number,
  random: () => number,
): number[] {
  const center = proportionalCol(col, fromWidth, toWidth);
  const neighbors = [center - 1, center, center + 1].filter((c) => c >= 0 && c < toWidth);
  const extraCandidates = [...new Set(neighbors)].filter((c) => c !== center);
  const targets = [center];
  if (extraCandidates.length > 0 && random() < BRAINRUN_BRANCH_CHANCE) {
    targets.push(extraCandidates[Math.floor(random() * extraCandidates.length)]!);
  }
  return [...new Set(targets)];
}

/** Rattache tout nœud sans arête entrante au nœud le plus proche (par position proportionnelle)
 * de la rangée précédente, pour qu'aucun nœud de la carte ne soit inaccessible. */
function attachOrphans(edges: BrainrunGraphEdge[], widths: number[]): void {
  for (let row = 1; row < widths.length; row++) {
    const fromWidth = widths[row - 1]!;
    const toWidth = widths[row]!;
    const rowEdges = edges.filter((e) => e.row === row);
    const incoming = Array.from({ length: toWidth }, () => 0);
    for (const e of rowEdges) for (const c of e.nextCols) incoming[c]!++;

    for (let col = 0; col < toWidth; col++) {
      if (incoming[col]! > 0) continue;
      let closest = rowEdges[0]!;
      let closestDist = Infinity;
      for (const e of rowEdges) {
        const dist = Math.abs(proportionalCol(e.col, fromWidth, toWidth) - col);
        if (dist < closestDist) {
          closestDist = dist;
          closest = e;
        }
      }
      closest.nextCols = [...new Set([...closest.nextCols, col])];
    }
  }
}

/** Construit la forme du graphe d'un acte (nœuds + arêtes vers la rangée suivante), sans les
 * types de salle. Chaque nœud a toujours au moins une arête sortante (sauf la dernière rangée,
 * le Boss) et au moins une arête entrante (sauf la rangée 1) — jamais de nœud inaccessible. */
export function generateActEdges(
  act: number,
  random: () => number = Math.random,
): BrainrunGraphEdge[] {
  const widths = getBrainrunActRowWidths(act);
  const edges: BrainrunGraphEdge[] = [];
  for (let row = 1; row <= widths.length; row++) {
    const width = widths[row - 1]!;
    const nextWidth = widths[row];
    for (let col = 0; col < width; col++) {
      edges.push({
        row,
        col,
        nextCols: nextWidth === undefined ? [] : pickInitialTargets(col, width, nextWidth, random),
      });
    }
  }
  attachOrphans(edges, widths);
  return edges;
}

export type BrainrunNodeTypeAssignment = { row: number; col: number; type: BrainrunRoomType };

/**
 * Relique Aimant à Événements : convertit un nœud Combat (STANDARD/ELITE) pas encore atteint en
 * Événement, avec probabilité eventBonusChance. Ne touche jamais une salle spéciale déjà présente
 * (SHOP/REST/EVENT) ni le Boss — on ne fait qu'ajouter une chance de tomber sur un événement là où
 * il y aurait eu un combat, jamais retirer une salle spéciale existante.
 */
export function maybeConvertNodeToEvent(
  type: BrainrunRoomType,
  eventBonusChance: number,
  random: () => number = Math.random,
): BrainrunRoomType {
  if (eventBonusChance <= 0) return type;
  if (type !== "STANDARD" && type !== "ELITE") return type;
  if (random() >= eventBonusChance) return type;
  return "EVENT";
}

/** Rangées "spéciales" (fixes, hors Boss) de la forme d'un acte : la rangée Neutre (acte 1
 * uniquement), l'étage 1 (toujours forcé 3x Standard), l'étage forcé 100% Élite (garantit qu'aucune
 * route ne peut éviter une Élite) et l'avant-dernière rangée (toujours forcée 100% Bibliothèque). */
function getActFloorLayout(act: number): {
  widths: number[];
  typedWidths: number[];
  neutralRow: number | null;
  floor1Row: number;
  forcedEliteRow: number;
  restRow: number;
  bossRow: number;
} {
  const widths = getBrainrunActRowWidths(act);
  const typedWidths = widths.slice(0, -1); // toutes les rangées hors Boss
  const hasNeutral = act === 1;
  const neutralRow = hasNeutral ? 1 : null;
  const floor1Row = hasNeutral ? 2 : 1;
  const restRow = typedWidths.length;
  const midRows = Array.from({ length: restRow - floor1Row - 1 }, (_, i) => floor1Row + 1 + i);
  const forcedEliteRow = midRows[BRAINRUN_FORCED_ELITE_MID_FLOOR_INDEX - 1]!;
  return {
    widths,
    typedWidths,
    neutralRow,
    floor1Row,
    forcedEliteRow,
    restRow,
    bossRow: widths.length,
  };
}

/**
 * Assigne un type de salle à chaque nœud non-Boss et non-Neutre d'un acte : l'étage 1 est toujours
 * forcé 3x Standard, un étage du milieu forcé 100% Élite, l'avant-dernière rangée forcée 100%
 * Bibliothèque (repos garanti avant le Boss). Les étages du milieu restants suivent les quotas
 * habituels (majorité de combats via BRAINRUN_MIN_PURE_COMBAT_RATIO, au moins
 * BRAINRUN_MIN_SHOP_OFFERS/REST_OFFERS/EVENT_OFFERS occurrences de chaque salle spéciale).
 * `random` est injectable pour des tests déterministes.
 */
export function assignNodeTypes(
  act: number,
  random: () => number = Math.random,
  eventBonusChance: number = 0,
): BrainrunNodeTypeAssignment[] {
  const { typedWidths, neutralRow, floor1Row, forcedEliteRow, restRow } = getActFloorLayout(act);
  // La rangée Neutre (acte 1 uniquement) n'est ni typée ici ni comptée dans les quotas : elle est
  // gérée à part dans generateActGraph.
  const fixedRows = new Set(
    [floor1Row, forcedEliteRow, restRow, neutralRow].filter((r): r is number => r !== null),
  );

  const assignments: BrainrunNodeTypeAssignment[] = [];
  for (let col = 0; col < typedWidths[floor1Row - 1]!; col++) {
    assignments.push({ row: floor1Row, col, type: "STANDARD" });
  }
  for (let col = 0; col < typedWidths[forcedEliteRow - 1]!; col++) {
    assignments.push({ row: forcedEliteRow, col, type: "ELITE" });
  }
  for (let col = 0; col < typedWidths[restRow - 1]!; col++) {
    assignments.push({ row: restRow, col, type: "REST" });
  }

  const freeSlots: { row: number; col: number }[] = [];
  typedWidths.forEach((width, idx) => {
    const row = idx + 1;
    if (fixedRows.has(row)) return;
    for (let col = 0; col < width; col++) freeSlots.push({ row, col });
  });

  const specialsPool: BrainrunRoomType[] = [
    ...(Array(BRAINRUN_MIN_SHOP_OFFERS).fill("SHOP") as BrainrunRoomType[]),
    ...(Array(BRAINRUN_MIN_REST_OFFERS).fill("REST") as BrainrunRoomType[]),
    ...(Array(BRAINRUN_MIN_EVENT_OFFERS).fill("EVENT") as BrainrunRoomType[]),
  ];
  const combatCount = freeSlots.length - specialsPool.length;
  // Garanti par construction : le nombre de salles spéciales est fixé indépendamment de la taille
  // de l'acte, donc le combat occupe toujours la majorité des nœuds restants.
  const minPure = Math.ceil(freeSlots.length * BRAINRUN_MIN_PURE_COMBAT_RATIO);
  if (combatCount < minPure) {
    throw new Error(
      "Largeurs/quotas incohérents : pas assez de nœuds de combat sur les étages libres.",
    );
  }
  const combatPool: BrainrunRoomType[] = Array.from({ length: combatCount }, () =>
    random() < 0.5 ? "STANDARD" : "ELITE",
  );
  const pool = shuffle([...combatPool, ...specialsPool], random);
  freeSlots.forEach((slot, i) => {
    assignments.push({ ...slot, type: pool[i]! });
  });

  return assignments.map((a) => ({
    ...a,
    // L'Aimant à Événements ne touche jamais les étages fixes (Standard forcé, Élite forcé garant
    // de la route, Bibliothèque forcée) — seulement les étages libres, comme avant.
    type: fixedRows.has(a.row) ? a.type : maybeConvertNodeToEvent(a.type, eventBonusChance, random),
  }));
}

export type BrainrunGraphNode = {
  row: number;
  col: number;
  type: BrainrunRoomType;
  nextCols: number[];
};

/** Énumère toutes les routes (rangée 1 → Boss) du graphe d'un acte. */
function enumerateRoutes(nodes: BrainrunGraphNode[], bossRow: number): BrainrunGraphNode[][] {
  const byKey = new Map(nodes.map((n) => [`${n.row}:${n.col}`, n]));
  const routes: BrainrunGraphNode[][] = [];

  function walk(node: BrainrunGraphNode, path: BrainrunGraphNode[]): void {
    const nextPath = [...path, node];
    if (node.row === bossRow) {
      routes.push(nextPath);
      return;
    }
    for (const col of node.nextCols) {
      const next = byKey.get(`${node.row + 1}:${col}`);
      if (next) walk(next, nextPath);
    }
  }

  for (const start of nodes.filter((n) => n.row === 1)) walk(start, []);
  return routes;
}

/**
 * Garantit qu'aucune route (rangée 1 → Boss) ne traverse plus de BRAINRUN_MAX_ELITE_PER_ROUTE
 * nœuds Élite : retype en Standard les Élites en excès d'une route qui dépasse la limite, jusqu'à
 * convergence. `protectedRow` (l'étage forcé 100% Élite qui garantit au moins 1 Élite par route,
 * cf. assignNodeTypes) n'est jamais retypée. Mute les nœuds passés en paramètre.
 */
export function enforceEliteRouteBounds(
  nodes: BrainrunGraphNode[],
  bossRow: number,
  protectedRow: number,
): BrainrunGraphNode[] {
  let guard = 0;
  while (guard++ < 500) {
    const routes = enumerateRoutes(nodes, bossRow);
    const overLimit = routes.find(
      (route) => route.filter((n) => n.type === "ELITE").length > BRAINRUN_MAX_ELITE_PER_ROUTE,
    );
    if (!overLimit) break;
    const toDowngrade = overLimit.find((n) => n.type === "ELITE" && n.row !== protectedRow);
    if (!toDowngrade) break; // ne devrait pas arriver : protectedRow seule ne peut pas dépasser la limite
    toDowngrade.type = "STANDARD";
  }
  return nodes;
}

/** Génère la carte complète d'un acte (graphe + types), prête à être persistée en base
 * (un BrainrunRoom par nœud). Combine generateActEdges et assignNodeTypes, force la rangée Neutre
 * pour l'acte 1, puis fait respecter la garantie 1-4 Élites par route (enforceEliteRouteBounds). */
export function generateActGraph(
  act: number,
  random: () => number = Math.random,
  eventBonusChance: number = 0,
): BrainrunGraphNode[] {
  const { neutralRow, forcedEliteRow, bossRow } = getActFloorLayout(act);
  const edges = generateActEdges(act, random);
  const types = assignNodeTypes(act, random, eventBonusChance);
  const typeByKey = new Map(types.map((t) => [`${t.row}:${t.col}`, t.type]));
  const nodes = edges.map((e) => ({
    row: e.row,
    col: e.col,
    nextCols: e.nextCols,
    type:
      e.row === bossRow
        ? ("BOSS" as BrainrunRoomType)
        : e.row === neutralRow
          ? ("NEUTRAL" as BrainrunRoomType)
          : typeByKey.get(`${e.row}:${e.col}`)!,
  }));
  return enforceEliteRouteBounds(nodes, bossRow, forcedEliteRow);
}

/** Colonnes accessibles sur `currentRow` : toutes les colonnes de la rangée 1 si elle n'a pas
 * encore de nœud CLEARED en amont (début d'acte), sinon les nextCols du nœud CLEARED de la
 * rangée précédente (il n'y en a jamais qu'un seul, la carte est parcourue en file simple). */
export function getCandidateCols(
  actRooms: { row: number; col: number; status: string; nextCols: number[] }[],
  currentRow: number,
): number[] {
  if (currentRow <= 1) {
    return actRooms
      .filter((r) => r.row === 1)
      .map((r) => r.col)
      .sort((a, b) => a - b);
  }
  const previousCleared = actRooms.find((r) => r.row === currentRow - 1 && r.status === "CLEARED");
  return previousCleared?.nextCols ?? [];
}

/** Pioche un candidat dans `pool` en excluant `excludeIds` ; retombe sur le pool complet si
 * l'exclusion le viderait entièrement (jamais bloquant). */
export function pickCombatCandidate<T extends { id: string }>(
  pool: T[],
  excludeIds: string[],
  random: () => number = Math.random,
): T {
  const available = pool.filter((c) => !excludeIds.includes(c.id));
  const candidates = available.length > 0 ? available : pool;
  return candidates[Math.floor(random() * candidates.length)]!;
}

export type BrainrunNodeCombatIdentity = {
  row: number;
  col: number;
  enemyId: string | null;
  bossId: string | null;
};

type CombatIdentityNode = {
  row: number;
  col: number;
  type: BrainrunRoomType;
  nextCols?: number[];
};

/**
 * Profondeur "de route" de chaque nœud d'un `tier` donné : nombre maximum de nœuds de ce tier
 * rencontrés sur une route (rangée 1 → Boss) en **incluant** le nœud lui-même. Calculée en
 * propageant le meilleur compte le long des arêtes (`nextCols`), rangées croissantes.
 *
 * Propriété clé : deux nœuds du même tier situés sur une même route ont des profondeurs
 * **strictement croissantes** (chaque nœud du tier ajoute 1). Affecter une identité par
 * profondeur garantit donc qu'aucune route ne traverse deux fois le même ennemi de ce tier, tant
 * que le pool couvre la profondeur maximale possible (BRAINRUN_MAX_ELITE_PER_ROUTE pour les
 * Élites, largement couvert par les 5 Élites d'un acte). Deux nœuds de même profondeur, eux, ne
 * partagent jamais de route : ils peuvent réutiliser la même identité sans créer de doublon perçu.
 */
function computeTierRouteDepths(
  nodes: CombatIdentityNode[],
  tier: BrainrunRoomType,
): Map<string, number> {
  const key = (row: number, col: number) => `${row}:${col}`;
  const exists = new Set(nodes.map((n) => key(n.row, n.col)));
  const bestBefore = new Map<string, number>(); // meilleur compte du tier strictement avant ce nœud
  const depth = new Map<string, number>();
  const sorted = [...nodes].sort((a, b) => a.row - b.row || a.col - b.col);
  for (const node of sorted) {
    const here = (bestBefore.get(key(node.row, node.col)) ?? 0) + (node.type === tier ? 1 : 0);
    depth.set(key(node.row, node.col), here);
    for (const col of node.nextCols ?? []) {
      const childKey = key(node.row + 1, col);
      if (!exists.has(childKey)) continue;
      bestBefore.set(childKey, Math.max(bestBefore.get(childKey) ?? 0, here));
    }
  }
  return depth;
}

/**
 * Fixe l'ennemi/boss de chaque nœud de combat (Standard/Élite/Boss) d'un acte, une fois pour
 * toutes à la génération de la carte (plus de tirage à l'entrée de la salle, cf.
 * references/map.md).
 *
 * - **Élite** : identité affectée par **profondeur de route** (cf. computeTierRouteDepths) dans un
 *   pool mélangé une fois par carte — garantit qu'aucune route (rangée 1 → Boss) ne fait affronter
 *   deux fois la même Élite, même si la carte compte plus de nœuds Élite que le pool (l'ancienne
 *   exclusion globale au fil des nœuds épuisait le pool et laissait réapparaître une même Élite sur
 *   un trajet). Les nœuds Élite de même profondeur — jamais sur une même route — peuvent partager
 *   une identité sans doublon perçu par le joueur.
 * - **Standard** : exclusion globale au fil des nœuds tant que le pool (10 Classiques/acte) n'est
 *   pas épuisé — conserve la variété d'affichage de la carte (ex. les 3 combats Standard de l'étage
 *   1 restent distincts) ; le risque de doublon sur un trajet y est marginal vu la taille du pool.
 * - **Boss** : 1 seul nœud par acte, pas d'exclusion nécessaire.
 */
export function assignCombatIdentities(
  nodes: CombatIdentityNode[],
  classicPool: { id: string }[],
  elitePool: { id: string }[],
  bossPool: { id: string }[],
  random: () => number = Math.random,
): BrainrunNodeCombatIdentity[] {
  const usedClassic: string[] = [];
  const eliteByDepth = shuffle(elitePool, random);
  const eliteDepths = computeTierRouteDepths(nodes, "ELITE");
  return nodes.map((node) => {
    if (node.type === "STANDARD") {
      const enemy = pickCombatCandidate(classicPool, usedClassic, random);
      usedClassic.push(enemy.id);
      return { row: node.row, col: node.col, enemyId: enemy.id, bossId: null };
    }
    if (node.type === "ELITE") {
      const depth = eliteDepths.get(`${node.row}:${node.col}`) ?? 1;
      const enemy = eliteByDepth[(depth - 1) % eliteByDepth.length]!;
      return { row: node.row, col: node.col, enemyId: enemy.id, bossId: null };
    }
    if (node.type === "BOSS") {
      const boss = pickCombatCandidate(bossPool, [], random);
      return { row: node.row, col: node.col, enemyId: null, bossId: boss.id };
    }
    return { row: node.row, col: node.col, enemyId: null, bossId: null };
  });
}

/**
 * Fixe l'événement de chaque nœud EVENT d'un acte, une fois à la génération de la carte (comme
 * assignCombatIdentities pour les ennemis) : tiré **sans remise** dans le pool de l'acte, ce qui
 * garantit qu'aucun Événement n'apparaît deux fois sur une run tant que le pool (8 par acte) couvre
 * le nombre de nœuds EVENT. `excludeIds` retire du tirage les événements déjà placés sur la carte —
 * utilisé lors d'une conversion en cours de run (Aimant à Événements, cf.
 * BrainrunService.convertUpcomingNodesToEvents) pour ne pas dupliquer un événement déjà présent.
 * Si le pool disponible est épuisé (plus de nœuds EVENT que d'événements uniques), on autorise la
 * répétition en repiochant dans le pool complet mélangé, plutôt que de bloquer.
 */
export function assignEventIdentities(
  eventNodes: { row: number; col: number }[],
  eventPool: string[],
  random: () => number = Math.random,
  excludeIds: string[] = [],
): { row: number; col: number; eventId: string }[] {
  let bag = shuffle(
    eventPool.filter((id) => !excludeIds.includes(id)),
    random,
  );
  return eventNodes.map((node) => {
    if (bag.length === 0) bag = shuffle(eventPool, random);
    const eventId = bag.shift()!;
    return { row: node.row, col: node.col, eventId };
  });
}

/** Thèmes effectifs d'un ennemi/boss pour l'affichage (modale Prévoyance) et la sélection de
 * questions : retire les thèmes bannis (Purge Thématique) de sa liste déclarée ; retombe sur la
 * liste non filtrée si ça la viderait entièrement (même filet de sécurité qu'ailleurs). */
export function effectiveThemes(themes: string[], bannedThemes: string[]): string[] {
  if (bannedThemes.length === 0) return themes;
  const filtered = themes.filter((t) => !bannedThemes.includes(t));
  return filtered.length > 0 ? filtered : themes;
}

/**
 * Bonus de coefficient qu'un ennemi applique à chacun de ses thèmes pour la seule durée de son
 * combat (cf. BRAINRUN_THEME_COEFFICIENTS_PLAN.md) : base par acte × multiplicateur de tier
 * (Classique ×1, Élite ×2, Boss ×3). Ex. boss Acte 3 → 3 × 3 = 9.
 */
export function enemyThemeBonus(act: number, tier: "CLASSIC" | "ELITE" | "BOSS"): number {
  const base = BRAINRUN_ENEMY_THEME_BONUS_BY_ACT[act] ?? 0;
  return base * (BRAINRUN_ENEMY_THEME_BONUS_TIER_MULTIPLIER[tier] ?? 1);
}

/**
 * Poids de tirage effectif par thème pour un combat. Pool éligible = thèmes de l'ennemi (fournis
 * déjà filtrés des thèmes bannis via effectiveThemes) ∪ thèmes investis par le joueur (coefficient
 * > 0, hors bannis). Poids d'un thème = coefficient joueur + bonus de l'ennemi (ce dernier
 * uniquement sur les thèmes de l'ennemi). Alimente le tirage pondéré par question
 * (QuestionService.getRandomIdsByDifficulty). Ne renvoie que des thèmes de poids strictement positif.
 */
export function buildCombatThemeWeights(
  playerCoefficients: Record<string, number>,
  enemyThemes: string[],
  enemyBonus: number,
  bannedThemes: string[] = [],
): { theme: string; weight: number }[] {
  const enemyThemeSet = new Set(enemyThemes);
  const eligible = new Set(enemyThemes);
  for (const [theme, coef] of Object.entries(playerCoefficients)) {
    if (coef > 0 && !bannedThemes.includes(theme)) eligible.add(theme);
  }
  return [...eligible]
    .map((theme) => ({
      theme,
      weight: (playerCoefficients[theme] ?? 0) + (enemyThemeSet.has(theme) ? enemyBonus : 0),
    }))
    .filter((entry) => entry.weight > 0);
}

/** Raretés de carte de thème, dans l'ordre croissant de valeur (pour le tirage pondéré). */
const BRAINRUN_THEME_CARD_RARITIES: BrainrunThemeCardRarity[] = [
  "STANDARD",
  "RARE",
  "EPIC",
  "LEGENDARY",
];

/**
 * Génère les cartes de thème proposées après un combat gagné. `candidates` (pool des thèmes
 * d'ennemi) doit déjà être filtré par l'appelant (hors excludedCardThemes/bannis). Pour CHAQUE
 * carte, il y a `BRAINRUN_THEME_CARD_INVESTED_CHANCE` de tirer plutôt un thème déjà investi
 * (`investedCandidates`, coef > 0) pour renforcer une spécialisation ; sinon tirage uniforme dans
 * `candidates`. Les thèmes restent distincts sur l'offre (repli d'un pool sur l'autre si l'un
 * s'épuise). Chaque carte reçoit une rareté pondérée (BRAINRUN_THEME_CARD_RARITY_WEIGHT) et son
 * coefBefore→coefAfter. Renvoie moins de `count` cartes seulement si les deux pools réunis en
 * contiennent moins.
 */
export function generateThemeCards(
  candidates: { slug: string; name: string; image: string }[],
  currentCoefficients: Record<string, number>,
  count: number = BRAINRUN_THEME_CARD_COUNT,
  random: () => number = Math.random,
  investedCandidates: { slug: string; name: string; image: string }[] = [],
): BrainrunThemeCardDTO[] {
  // Fisher-Yates avec le random injecté (testable) → tirage uniforme distinct dans chaque pool.
  const shuffle = (arr: { slug: string; name: string; image: string }[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  };
  const normalPool = shuffle(candidates);
  const investedPool = shuffle(investedCandidates);
  const picked = new Set<string>();
  // Dépile le prochain thème encore non retenu (garantit des cartes distinctes, y compris quand un
  // thème investi figure aussi dans le pool des ennemis).
  const takeFrom = (pool: { slug: string; name: string; image: string }[]) => {
    while (pool.length > 0) {
      const theme = pool.shift()!;
      if (!picked.has(theme.slug)) return theme;
    }
    return undefined;
  };

  const cards: BrainrunThemeCardDTO[] = [];
  for (let i = 0; i < count; i++) {
    // 10 %/carte : privilégier un thème déjà investi (s'il en reste un distinct), sinon pool normal.
    const preferInvested = random() < BRAINRUN_THEME_CARD_INVESTED_CHANCE;
    const theme = preferInvested
      ? (takeFrom(investedPool) ?? takeFrom(normalPool))
      : (takeFrom(normalPool) ?? takeFrom(investedPool));
    if (!theme) break;
    picked.add(theme.slug);
    const rarity = weightedRandomPick(
      BRAINRUN_THEME_CARD_RARITIES,
      (r) => BRAINRUN_THEME_CARD_RARITY_WEIGHT[r],
      random,
    );
    const coefBefore = currentCoefficients[theme.slug] ?? 0;
    // Plafond de coefficient : le bonus de rareté est tronqué s'il dépasse le maximum de run.
    const coefAfter = Math.min(
      BRAINRUN_THEME_COEFFICIENT_MAX,
      coefBefore + BRAINRUN_THEME_CARD_COEFFICIENT_BY_RARITY[rarity],
    );
    cards.push({
      themeSlug: theme.slug,
      themeName: theme.name,
      themeImage: theme.image,
      rarity,
      coefBefore,
      coefAfter,
    });
  }
  return cards;
}

/**
 * Les `n` thèmes aux plus gros coefficients d'une run, triés par coefficient décroissant puis
 * ordre alphabétique (départage déterministe). Ignore les thèmes à 0. Réutilisé pour
 * l'anti-répétition des cartes (excludedCardThemes = union des top-3 des 2 dernières runs valides)
 * et pour le tri de la modale "Mes coefficients".
 */
export function topThemes(coefficients: Record<string, number>, n: number = 3): string[] {
  return Object.entries(coefficients)
    .filter(([, coef]) => coef > 0)
    .sort(([aTheme, aCoef], [bTheme, bCoef]) => bCoef - aCoef || aTheme.localeCompare(bTheme))
    .slice(0, n)
    .map(([theme]) => theme);
}

/**
 * Étage global linéaire d'une position (act, row) sur l'ensemble des actes, utilisé pour classer
 * les joueurs par progression. Les actes n'ont pas le même nombre de rangées
 * (getBrainrunRoomsPerAct), on somme donc les rangées des actes précédents plutôt que de coder
 * les offsets en dur. Acte 1 → étages 1..10, Acte 2 → 11..19, Acte 3 → 20..28.
 */
export function brainrunGlobalFloor(act: number, row: number): number {
  let offset = 0;
  for (let a = 1; a < act; a++) {
    offset += getBrainrunRoomsPerAct(a);
  }
  return offset + row;
}

/** Ligne de run brute nécessaire au classement (cf. RankingService.getBrainrunTop). */
export type BrainrunRankRun = {
  userId: string;
  status: string;
  currentAct: number;
  currentRow: number;
  createDate: Date;
};

/** Entrée agrégée par joueur pour le classement Brainrun, déjà triée. */
export type BrainrunRankEntry = {
  userId: string;
  /** Meilleur étage global atteint (brainrunGlobalFloor). */
  bestFloor: number;
  bestAct: number;
  bestRow: number;
  /** true si le joueur a au moins une run gagnée (Boss de l'acte 3 battu). */
  isVictory: boolean;
  /** Nombre total de victoires. */
  victoryCount: number;
  /** Nombre de runs terminées jusqu'à la 1ʳᵉ victoire incluse (Infinity si jamais gagné). */
  runsToFirstVictory: number;
  /** Nombre total de runs terminées comptabilisées (WON + LOST + ABANDONED). */
  totalRuns: number;
};

/**
 * Agrège les runs terminées par joueur puis les classe pour le classement Brainrun.
 *
 * Les runs de debug (isDebugRun) et en cours (IN_PROGRESS) doivent avoir été filtrées en amont ;
 * cette fonction pure ne connaît que les runs comptabilisées.
 *
 * Ordre :
 *  1. Étage max atteint décroissant — les vainqueurs (« Victoire ») sont toujours au-dessus.
 *  2. Entre vainqueurs : moins de runs jusqu'à la 1ʳᵉ victoire d'abord, puis plus de victoires.
 *  3. Hors vainqueurs (à étage égal) : moins de runs terminées d'abord.
 *  4. Départage final stable : userId.
 */
export function rankBrainrunPlayers(runs: BrainrunRankRun[]): BrainrunRankEntry[] {
  const byUser = new Map<string, BrainrunRankRun[]>();
  for (const run of runs) {
    const list = byUser.get(run.userId);
    if (list) list.push(run);
    else byUser.set(run.userId, [run]);
  }

  const entries: BrainrunRankEntry[] = [];
  for (const [userId, userRuns] of byUser) {
    const chronological = [...userRuns].sort(
      (a, b) => a.createDate.getTime() - b.createDate.getTime(),
    );

    let bestFloor = 0;
    let bestAct = 1;
    let bestRow = 1;
    let victoryCount = 0;
    let runsToFirstVictory = Number.POSITIVE_INFINITY;

    chronological.forEach((run, index) => {
      const floor = brainrunGlobalFloor(run.currentAct, run.currentRow);
      const isWin = run.status === "WON";
      // La Victoire prime toujours sur l'étage brut : un boss d'acte 3 battu doit dominer une
      // défaite atteignant la même rangée. On force son étage au-delà du plafond non-gagné.
      const effectiveFloor = isWin ? Number.MAX_SAFE_INTEGER : floor;
      if (effectiveFloor > bestFloor) {
        bestFloor = effectiveFloor;
        bestAct = run.currentAct;
        bestRow = run.currentRow;
      }
      if (isWin) {
        victoryCount++;
        if (runsToFirstVictory === Number.POSITIVE_INFINITY) {
          runsToFirstVictory = index + 1;
        }
      }
    });

    entries.push({
      userId,
      bestFloor,
      bestAct,
      bestRow,
      isVictory: victoryCount > 0,
      victoryCount,
      runsToFirstVictory,
      totalRuns: userRuns.length,
    });
  }

  entries.sort((a, b) => {
    if (a.isVictory && b.isVictory) {
      if (a.runsToFirstVictory !== b.runsToFirstVictory) {
        return a.runsToFirstVictory - b.runsToFirstVictory;
      }
      if (a.victoryCount !== b.victoryCount) return b.victoryCount - a.victoryCount;
      return a.userId.localeCompare(b.userId);
    }
    if (a.isVictory !== b.isVictory) return a.isVictory ? -1 : 1;
    // Deux non-vainqueurs : étage atteint décroissant, puis moins de runs.
    if (a.bestFloor !== b.bestFloor) return b.bestFloor - a.bestFloor;
    if (a.totalRuns !== b.totalRuns) return a.totalRuns - b.totalRuns;
    return a.userId.localeCompare(b.userId);
  });

  return entries;
}
