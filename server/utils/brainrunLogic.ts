import type { BrainrunRoomType } from "#shared/brainrun";
import { brainrunPotentialBossDamage, BRAINRUN_BOSS_QUESTION_TIME_MS } from "#shared/brainrun";
import {
  BRAINRUN_BONUS_OFFER_COUNT,
  BRAINRUN_CONSUMABLES,
  BRAINRUN_CONSUMABLE_SHOP_PRICE,
  BRAINRUN_GOLD_FALLBACK_OFFER_AMOUNT,
  BRAINRUN_RELICS,
  BRAINRUN_RELIC_RARITY_WEIGHT,
  BRAINRUN_RELIC_SHOP_PRICE,
  BRAINRUN_SHOP_CONSUMABLE_OFFER_COUNT,
  BRAINRUN_SHOP_RELIC_OFFER_COUNT,
  phoneAFriendWrongChance,
  type BrainrunConsumableId,
  type BrainrunEventOption,
  type BrainrunOffer,
  type BrainrunRelicId,
} from "#shared/brainrunItems";
import {
  BRAINRUN_CHOICE_POINTS_PER_ACT,
  BRAINRUN_MIN_EVENT_OFFERS,
  BRAINRUN_MIN_PURE_COMBAT_RATIO,
  BRAINRUN_MIN_REST_OFFERS,
  BRAINRUN_MIN_SHOP_OFFERS,
  BRAINRUN_ROOMS_PER_ACT,
  BRAINRUN_TOTAL_ACTS,
  BRAINRUN_WIN_BONUS_XP,
  BRAINRUN_XP_BY_ROOM_TYPE,
} from "./brainrunConfig";

export function brainrunHpLossForDifficulty(difficulty: number): number {
  if (difficulty <= 2) return 1;
  if (difficulty <= 4) return 2;
  return 3;
}

export function shouldEndRunOnDamage(healthPointAfter: number): boolean {
  return healthPointAfter <= 0;
}

export function isAwaitingChoice(room: { type: string | null }): boolean {
  return room.type === null;
}

export type NextRoomOutcome =
  | { kind: "AWAIT_CHOICE"; act: number; sequence: number }
  | { kind: "RUN_WON" };

/** Détermine la prochaine salle à proposer une fois la salle courante (act/sequence) nettoyée. */
export function nextRoomAfterClear(act: number, sequence: number): NextRoomOutcome {
  if (sequence < BRAINRUN_ROOMS_PER_ACT) {
    return { kind: "AWAIT_CHOICE", act, sequence: sequence + 1 };
  }
  if (act < BRAINRUN_TOTAL_ACTS) {
    return { kind: "AWAIT_CHOICE", act: act + 1, sequence: 1 };
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
  hpLossReduction: number;
  bossTimeBonusMs: number;
  bossDamageBonusPerHit: number;
  hasExtraLife: boolean;
};

const NEUTRAL_RELIC_EFFECTS: BrainrunRelicEffects = {
  goldMultiplier: 1,
  flatGoldBonusPerRoom: 0,
  hpLossReduction: 0,
  bossTimeBonusMs: 0,
  bossDamageBonusPerHit: 0,
  hasExtraLife: false,
};

export function getActiveRelicEffects(relicIds: string[]): BrainrunRelicEffects {
  return relicIds.reduce((effects, id) => {
    switch (id as BrainrunRelicId) {
      case "ENCYCLOPEDIA":
        return { ...effects, goldMultiplier: effects.goldMultiplier * 1.2 };
      case "PROVIDENT_PURSE":
        return { ...effects, flatGoldBonusPerRoom: effects.flatGoldBonusPerRoom + 5 };
      case "SPECIALIZATION":
        return { ...effects, hpLossReduction: effects.hpLossReduction + 1 };
      case "BROKEN_CHRONOMETER":
        return { ...effects, bossTimeBonusMs: effects.bossTimeBonusMs + 3000 };
      case "ADRENALINE":
        return { ...effects, bossDamageBonusPerHit: effects.bossDamageBonusPerHit + 5 };
      case "SECOND_CHANCE":
        return { ...effects, hasExtraLife: true };
      default:
        return effects;
    }
  }, NEUTRAL_RELIC_EFFECTS);
}

/** Composé par-dessus brainrunHpLossForDifficulty (inchangée) : ne réduit jamais en dessous de 1 PV perdu. */
export function applyRelicsToHpLoss(baseHpLoss: number, effects: BrainrunRelicEffects): number {
  if (baseHpLoss <= 0) return baseHpLoss;
  return Math.max(1, baseHpLoss - effects.hpLossReduction);
}

export function applyRelicsToGold(baseGold: number, effects: BrainrunRelicEffects): number {
  if (baseGold <= 0) return baseGold;
  return Math.round(baseGold * effects.goldMultiplier) + effects.flatGoldBonusPerRoom;
}

/** Composé par-dessus brainrunBossDamage (inchangée) : pas de bonus sur un coup raté. */
export function applyRelicsToBossDamage(baseDamage: number, effects: BrainrunRelicEffects): number {
  return baseDamage > 0 ? baseDamage + effects.bossDamageBonusPerHit : 0;
}

export function bossQuestionTimeMsWithRelics(effects: BrainrunRelicEffects): number {
  return BRAINRUN_BOSS_QUESTION_TIME_MS + effects.bossTimeBonusMs;
}

/** Le Bouclier annule la prochaine perte de PV, qu'elle vienne du combat ou d'un Événement. */
export function consumeShieldIfArmed(
  shieldArmed: boolean,
  hpLoss: number,
): { hpLoss: number; shieldConsumed: boolean } {
  if (shieldArmed && hpLoss > 0) return { hpLoss: 0, shieldConsumed: true };
  return { hpLoss, shieldConsumed: false };
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
): BrainrunRelicId[] {
  const available = (Object.keys(BRAINRUN_RELICS) as BrainrunRelicId[]).filter(
    (id) => !ownedRelics.includes(id),
  );
  const picked: BrainrunRelicId[] = [];
  while (picked.length < count && picked.length < available.length) {
    const remaining = available.filter((id) => !picked.includes(id));
    picked.push(
      weightedRandomPick(
        remaining,
        (id) => BRAINRUN_RELIC_RARITY_WEIGHT[BRAINRUN_RELICS[id].rarity],
        random,
      ),
    );
  }
  return picked;
}

/**
 * Options du bonus proposé après une salle Elite/Boss nettoyée : toujours BRAINRUN_BONUS_OFFER_COUNT
 * options (jamais moins), priorité aux reliques non possédées (pondérées par rareté), complétées
 * par des consommables si le pool de reliques est épuisé.
 */
export function generateBonusOffers(
  ownedRelics: string[],
  random: () => number = Math.random,
): BrainrunOffer[] {
  const relics = pickUnownedRelics(ownedRelics, BRAINRUN_BONUS_OFFER_COUNT, random);
  const offers: BrainrunOffer[] = relics.map((id) => ({
    kind: "RELIC",
    id,
    rarity: BRAINRUN_RELICS[id].rarity,
  }));

  const consumableIds = Object.keys(BRAINRUN_CONSUMABLES) as BrainrunConsumableId[];
  while (offers.length < BRAINRUN_BONUS_OFFER_COUNT && consumableIds.length > 0) {
    const id = consumableIds[Math.floor(random() * consumableIds.length)] as BrainrunConsumableId;
    offers.push({ kind: "CONSUMABLE", id });
  }
  while (offers.length < BRAINRUN_BONUS_OFFER_COUNT) {
    offers.push({ kind: "GOLD", id: "GOLD", amount: BRAINRUN_GOLD_FALLBACK_OFFER_AMOUNT });
  }
  return offers;
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
): BrainrunOffer[] {
  const relics = pickUnownedRelics(ownedRelics, BRAINRUN_SHOP_RELIC_OFFER_COUNT, random);
  const offers: BrainrunOffer[] = relics.map((id) => ({
    kind: "RELIC",
    id,
    rarity: BRAINRUN_RELICS[id].rarity,
    price: BRAINRUN_RELIC_SHOP_PRICE[BRAINRUN_RELICS[id].rarity],
  }));
  while (offers.length < BRAINRUN_SHOP_RELIC_OFFER_COUNT) {
    offers.push({
      kind: "GOLD",
      id: "GOLD",
      amount: BRAINRUN_GOLD_FALLBACK_OFFER_AMOUNT,
      price: 0,
    });
  }

  const consumableIds = Object.keys(BRAINRUN_CONSUMABLES) as BrainrunConsumableId[];
  for (let i = 0; i < BRAINRUN_SHOP_CONSUMABLE_OFFER_COUNT; i++) {
    const id = consumableIds[Math.floor(random() * consumableIds.length)] as BrainrunConsumableId;
    offers.push({ kind: "CONSUMABLE", id, price: BRAINRUN_CONSUMABLE_SHOP_PRICE });
  }
  return offers;
}

/**
 * Résout les deltas d'une option d'Événement choisie ; fonction pure (pas d'accès DB), le tirage
 * d'une relique aléatoire exclut les reliques déjà possédées et retombe sur un bonus d'or si le
 * pool de reliques est épuisé.
 */
export function resolveEventOption(
  option: BrainrunEventOption,
  context: { ownedRelics: string[] },
  random: () => number = Math.random,
): {
  hpDelta: number;
  goldDelta: number;
  relicGranted: BrainrunRelicId | null;
  /** Relique sacrifiée (coût "RANDOM_OWNED") ; null si le joueur n'en possédait aucune. */
  relicLost: BrainrunRelicId | null;
  consumablesGranted: { id: BrainrunConsumableId; amount: number }[];
} {
  const hpDelta = (option.reward?.hp ?? 0) - (option.cost?.hp ?? 0);
  let goldDelta = (option.reward?.gold ?? 0) - (option.cost?.gold ?? 0);
  const consumableIds = Object.keys(BRAINRUN_CONSUMABLES) as BrainrunConsumableId[];
  const consumablesGranted = (option.reward?.consumables ?? []).map((grant) => ({
    id:
      grant.id === "RANDOM"
        ? (consumableIds[Math.floor(random() * consumableIds.length)] as BrainrunConsumableId)
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
  if (option.reward?.relic === "RANDOM") {
    // Exclut aussi la relique tout juste sacrifiée (relicLost) : un "échange" ne doit pas
    // pouvoir rendre la même relique. Comme elle fait déjà partie de ownedRelics, elle est
    // naturellement exclue par pickUnownedRelics.
    const [picked] = pickUnownedRelics(context.ownedRelics, 1, random);
    if (picked) {
      relicGranted = picked;
    } else {
      goldDelta += BRAINRUN_GOLD_FALLBACK_OFFER_AMOUNT;
    }
  }

  return { hpDelta, goldDelta, relicGranted, relicLost, consumablesGranted };
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
  clearedRooms: { type: "STANDARD" | "ELITE" | "BOSS" | "REST" | "SHOP" | "EVENT" }[],
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

export type BrainrunChoicePoint = {
  sequence: number;
  choiceTypes: BrainrunRoomType[];
};

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

/** true si un point de choix est purement combat ([STANDARD, ELITE], sans salle spéciale). */
function isPureCombatChoice(choiceTypes: BrainrunRoomType[]): boolean {
  return (
    choiceTypes.length === 2 && choiceTypes.includes("STANDARD") && choiceTypes.includes("ELITE")
  );
}

/**
 * Génère la forme des points de choix d'un acte (hors salle Boss finale, toujours fixe/séparée) :
 * au moins BRAINRUN_MIN_PURE_COMBAT_RATIO de points purement [STANDARD, ELITE], et au moins
 * une occurrence de SHOP/REST et deux de EVENT réparties sur des points distincts.
 * `random` est injectable pour des tests déterministes (par défaut Math.random). Si
 * `forceFirstPure` est vrai (premier acte de la run), le premier point (sequence 1) est
 * garanti purement combat — pas de Boutique/Repos/Événement dès la toute première salle.
 */
export function generateActChoicePoints(
  random: () => number = Math.random,
  forceFirstPure: boolean = false,
): BrainrunChoicePoint[] {
  const totalPoints = BRAINRUN_CHOICE_POINTS_PER_ACT;
  const minPure = Math.ceil(totalPoints * BRAINRUN_MIN_PURE_COMBAT_RATIO);
  const mixedCount = totalPoints - minPure;

  const specialsPool: BrainrunRoomType[] = [
    ...(Array(BRAINRUN_MIN_SHOP_OFFERS).fill("SHOP") as BrainrunRoomType[]),
    ...(Array(BRAINRUN_MIN_REST_OFFERS).fill("REST") as BrainrunRoomType[]),
    ...(Array(BRAINRUN_MIN_EVENT_OFFERS).fill("EVENT") as BrainrunRoomType[]),
  ];

  const buckets: BrainrunRoomType[][] = Array.from({ length: mixedCount }, () => []);
  const shuffledSpecials = shuffle(specialsPool, random);
  shuffledSpecials.forEach((special, i) => {
    if (i < mixedCount) {
      buckets[i]!.push(special);
      return;
    }
    // Item excédentaire : on évite de le placer dans un bucket qui a déjà ce même type,
    // pour garantir que EVENT (2 occurrences minimum) apparaisse sur 2 points distincts.
    const eligible = buckets.map((_, idx) => idx).filter((idx) => !buckets[idx]!.includes(special));
    const pickFrom = eligible.length > 0 ? eligible : buckets.map((_, idx) => idx);
    const pick = pickFrom[Math.floor(random() * pickFrom.length)]!;
    buckets[pick]!.push(special);
  });

  const purePoints: BrainrunChoicePoint[] = Array.from({ length: minPure }, () => ({
    sequence: 0,
    choiceTypes: shuffle(["STANDARD", "ELITE"], random),
  }));

  const mixedPoints: BrainrunChoicePoint[] = buckets.map((specials) => ({
    sequence: 0,
    choiceTypes: shuffle([random() < 0.5 ? "STANDARD" : "ELITE", ...specials], random),
  }));

  const points = shuffle([...purePoints, ...mixedPoints], random).map((point, index) => ({
    ...point,
    sequence: index + 1,
  }));

  if (forceFirstPure && !isPureCombatChoice(points[0]!.choiceTypes)) {
    const pureIndex = points.findIndex((p) => isPureCombatChoice(p.choiceTypes));
    if (pureIndex > 0) {
      const firstSequence = points[0]!.sequence;
      const pureSequence = points[pureIndex]!.sequence;
      [points[0], points[pureIndex]] = [points[pureIndex]!, points[0]!];
      points[0]!.sequence = firstSequence;
      points[pureIndex]!.sequence = pureSequence;
    }
  }

  return points;
}
