import type { BrainrunRoomType } from "#shared/brainrun";
import { brainrunPotentialBossDamage, BRAINRUN_BOSS_QUESTION_TIME_MS } from "#shared/brainrun";
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
  BRAINRUN_ACT_ROW_WIDTHS,
  BRAINRUN_BRANCH_CHANCE,
  BRAINRUN_CONSOLATION_GOLD,
  BRAINRUN_EVENT_MAGNET_CHANCE,
  BRAINRUN_FORESIGHT_BONUS_VISION_ROWS,
  BRAINRUN_HAGGLER_MULTIPLIER,
  BRAINRUN_KP_PER_GOLD,
  BRAINRUN_MIN_EVENT_OFFERS,
  BRAINRUN_MIN_PURE_COMBAT_RATIO,
  BRAINRUN_MIN_REST_OFFERS,
  BRAINRUN_MIN_SHOP_OFFERS,
  BRAINRUN_ROOMS_PER_ACT,
  BRAINRUN_SIXTH_SENSE_CHANCE,
  BRAINRUN_TOTAL_ACTS,
  BRAINRUN_WIN_BONUS_XP,
  BRAINRUN_XP_BY_ROOM_TYPE,
} from "./brainrunConfig";
import { BRAINRUN_TALENTS, type BrainrunTalentId } from "#shared/brainrunTalents";

export function brainrunHpLossForDifficulty(difficulty: number): number {
  if (difficulty <= 2) return 1;
  if (difficulty <= 4) return 2;
  return 3;
}

export function shouldEndRunOnDamage(healthPointAfter: number): boolean {
  return healthPointAfter <= 0;
}

export type NextRowOutcome =
  | { kind: "AWAIT_CHOICE"; act: number; row: number }
  | { kind: "RUN_WON" };

/** Détermine la prochaine rangée à proposer une fois la rangée courante (act/row) nettoyée. */
export function nextRowAfterClear(act: number, row: number): NextRowOutcome {
  if (row < BRAINRUN_ROOMS_PER_ACT) {
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
  hpLossReduction: number;
  bossTimeBonusMs: number;
  bossDamageBonusPerHit: number;
  hasExtraLife: boolean;
  /** Marchandeur : multiplicateur appliqué aux prix de Boutique (0.8 si possédée). */
  shopPriceMultiplier: number;
  /** Fournisseur Fidèle : un objet acheté en Boutique est remplacé par un autre du même type. */
  autoRestockShop: boolean;
  /** Aimant à Événements : probabilité qu'un futur nœud Combat soit converti en Événement. */
  eventBonusChance: number;
  /** Prévoyance : nombre de rangées de vision supplémentaires sur la carte, au-delà de la
   * rangée immédiatement accessible (toujours visible par défaut). */
  mapVisionRows: number;
  /** Lot de Consolation : or gagné en ignorant le bonus post-combat. */
  goldOnBonusSkip: number;
  /** Sixième Sens : probabilité par question de révéler la bonne réponse après un délai. */
  autoHintChance: number;
};

const NEUTRAL_RELIC_EFFECTS: BrainrunRelicEffects = {
  goldMultiplier: 1,
  flatGoldBonusPerRoom: 0,
  hpLossReduction: 0,
  bossTimeBonusMs: 0,
  bossDamageBonusPerHit: 0,
  hasExtraLife: false,
  shopPriceMultiplier: 1,
  autoRestockShop: false,
  eventBonusChance: 0,
  mapVisionRows: 0,
  goldOnBonusSkip: 0,
  autoHintChance: 0,
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
      case "HAGGLER":
        return { ...effects, shopPriceMultiplier: BRAINRUN_HAGGLER_MULTIPLIER };
      case "RESTOCK":
        return { ...effects, autoRestockShop: true };
      case "EVENT_MAGNET":
        return { ...effects, eventBonusChance: BRAINRUN_EVENT_MAGNET_CHANCE };
      case "FORESIGHT":
        return {
          ...effects,
          mapVisionRows: effects.mapVisionRows + BRAINRUN_FORESIGHT_BONUS_VISION_ROWS,
        };
      case "CONSOLATION_PRIZE":
        return { ...effects, goldOnBonusSkip: effects.goldOnBonusSkip + BRAINRUN_CONSOLATION_GOLD };
      case "SIXTH_SENSE":
        return { ...effects, autoHintChance: BRAINRUN_SIXTH_SENSE_CHANCE };
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

/** Conversion de l'or de fin de run en Points de Savoir (monnaie meta persistante), arrondie
 * à l'entier inférieur. Appelée à la fin d'une run (WON/LOST/ABANDONED). */
export function goldToKnowledgePoints(gold: number): number {
  return Math.max(0, Math.floor(gold * BRAINRUN_KP_PER_GOLD));
}

/** Effets agrégés des talents permanents débloqués ; valeurs neutres si aucun talent. */
export type BrainrunTalentEffects = {
  bonusStartHp: number;
  bonusStartGold: number;
  rareRelicWeightBonus: number;
  bonusBossDamagePerHit: number;
};

const NEUTRAL_TALENT_EFFECTS: BrainrunTalentEffects = {
  bonusStartHp: 0,
  bonusStartGold: 0,
  rareRelicWeightBonus: 0,
  bonusBossDamagePerHit: 0,
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
      case "BOSS_DAMAGE":
        return {
          ...effects,
          bonusBossDamagePerHit: effects.bonusBossDamagePerHit + talent.value,
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
 * Options du bonus proposé après une salle Elite/Boss nettoyée : toujours BRAINRUN_BONUS_OFFER_COUNT
 * options (jamais moins), priorité aux reliques non possédées (pondérées par rareté), complétées
 * par des consommables si le pool de reliques est épuisé.
 */
export function generateBonusOffers(
  ownedRelics: string[],
  random: () => number = Math.random,
  rareWeightBonus: number = 0,
): BrainrunOffer[] {
  const relics = pickUnownedRelics(
    ownedRelics,
    BRAINRUN_BONUS_OFFER_COUNT,
    random,
    rareWeightBonus,
  );
  const offers: BrainrunOffer[] = relics.map((id) => ({
    kind: "RELIC",
    id,
    rarity: BRAINRUN_RELICS[id].rarity,
  }));

  const consumableIds = Object.keys(BRAINRUN_CONSUMABLES) as BrainrunConsumableId[];
  while (offers.length < BRAINRUN_BONUS_OFFER_COUNT && consumableIds.length > 0) {
    const id = weightedRandomPick(
      consumableIds,
      (cid) => BRAINRUN_RARITY_WEIGHT[BRAINRUN_CONSUMABLES[cid].rarity],
      random,
    );
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
  if (option.reward?.relic === "RANDOM") {
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
export function generateActEdges(random: () => number = Math.random): BrainrunGraphEdge[] {
  const widths = BRAINRUN_ACT_ROW_WIDTHS;
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

/**
 * Assigne un type de salle à chaque nœud non-Boss d'un acte (BRAINRUN_ACT_ROW_WIDTHS moins la
 * dernière rangée) : majorité de combats (BRAINRUN_MIN_PURE_COMBAT_RATIO), au moins
 * BRAINRUN_MIN_SHOP_OFFERS/REST_OFFERS/EVENT_OFFERS occurrences de chaque salle spéciale.
 * `random` est injectable pour des tests déterministes. Si `forceFirstPure` est vrai (premier
 * acte de la run), les nœuds de la rangée 1 sont garantis un Standard + un Elite — pas de
 * Boutique/Repos/Événement dès la toute première salle, tout en préservant un vrai choix.
 */
export function assignNodeTypes(
  random: () => number = Math.random,
  forceFirstPure: boolean = false,
  eventBonusChance: number = 0,
): BrainrunNodeTypeAssignment[] {
  const widths = BRAINRUN_ACT_ROW_WIDTHS.slice(0, -1); // toutes les rangées hors Boss
  const totalNodes = widths.reduce((sum, w) => sum + w, 0);
  const specialsPool: BrainrunRoomType[] = [
    ...(Array(BRAINRUN_MIN_SHOP_OFFERS).fill("SHOP") as BrainrunRoomType[]),
    ...(Array(BRAINRUN_MIN_REST_OFFERS).fill("REST") as BrainrunRoomType[]),
    ...(Array(BRAINRUN_MIN_EVENT_OFFERS).fill("EVENT") as BrainrunRoomType[]),
  ];
  const combatCount = totalNodes - specialsPool.length;
  // Garanti par construction : le nombre de salles spéciales est fixé indépendamment de la taille
  // de l'acte, donc le combat occupe toujours la majorité des nœuds restants.
  const minPure = Math.ceil(totalNodes * BRAINRUN_MIN_PURE_COMBAT_RATIO);
  if (combatCount < minPure) {
    throw new Error("BRAINRUN_ACT_ROW_WIDTHS/quotas incohérents : pas assez de nœuds de combat.");
  }
  const combatPool: BrainrunRoomType[] = Array.from({ length: combatCount }, () =>
    random() < 0.5 ? "STANDARD" : "ELITE",
  );

  const slots: { row: number; col: number }[] = [];
  widths.forEach((width, idx) => {
    for (let col = 0; col < width; col++) slots.push({ row: idx + 1, col });
  });
  const row1Slots = slots.filter((s) => s.row === 1);
  const otherSlots = slots.filter((s) => s.row !== 1);

  let assignments: BrainrunNodeTypeAssignment[];
  if (forceFirstPure) {
    const row1Types = shuffle(["STANDARD", "ELITE"] as BrainrunRoomType[], random);
    const remainingPool = shuffle(
      [...combatPool.slice(0, combatCount - row1Slots.length), ...specialsPool],
      random,
    );
    assignments = [
      ...row1Slots.map((slot, i) => ({ ...slot, type: row1Types[i % row1Types.length]! })),
      ...otherSlots.map((slot, i) => ({ ...slot, type: remainingPool[i]! })),
    ];
  } else {
    const pool = shuffle([...combatPool, ...specialsPool], random);
    assignments = slots.map((slot, i) => ({ ...slot, type: pool[i]! }));
  }

  return assignments.map((a) => ({
    ...a,
    type: maybeConvertNodeToEvent(a.type, eventBonusChance, random),
  }));
}

export type BrainrunGraphNode = {
  row: number;
  col: number;
  type: BrainrunRoomType;
  nextCols: number[];
};

/** Génère la carte complète d'un acte (graphe + types), prête à être persistée en base
 * (un BrainrunRoom par nœud). Combine generateActEdges et assignNodeTypes. */
export function generateActGraph(
  random: () => number = Math.random,
  forceFirstPure: boolean = false,
  eventBonusChance: number = 0,
): BrainrunGraphNode[] {
  const edges = generateActEdges(random);
  const types = assignNodeTypes(random, forceFirstPure, eventBonusChance);
  const typeByKey = new Map(types.map((t) => [`${t.row}:${t.col}`, t.type]));
  const bossRow = BRAINRUN_ACT_ROW_WIDTHS.length;
  return edges.map((e) => ({
    row: e.row,
    col: e.col,
    nextCols: e.nextCols,
    type: e.row === bossRow ? "BOSS" : typeByKey.get(`${e.row}:${e.col}`)!,
  }));
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

/** Parcourt le graphe en largeur depuis `startCols` (sur `startRow`) sur `extraRows` rangées
 * supplémentaires, et retourne l'ensemble des clés "row:col" révélées par la vision (relique
 * Prévoyance) — startCols lui-même est toujours inclus, extraRows peut valoir 0. */
export function computeVisibleCols(
  actNodes: { row: number; col: number; nextCols: number[] }[],
  startCols: number[],
  startRow: number,
  extraRows: number,
): Set<string> {
  const visible = new Set<string>();
  let frontier = startCols;
  startCols.forEach((c) => visible.add(`${startRow}:${c}`));

  let row = startRow;
  for (let step = 0; step < extraRows && frontier.length > 0; step++) {
    const next = new Set<number>();
    for (const col of frontier) {
      const node = actNodes.find((n) => n.row === row && n.col === col);
      node?.nextCols.forEach((c) => next.add(c));
    }
    row += 1;
    next.forEach((c) => visible.add(`${row}:${c}`));
    frontier = [...next];
  }
  return visible;
}
