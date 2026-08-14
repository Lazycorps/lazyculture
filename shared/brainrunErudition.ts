/** Échelle d'Érudition : les degrés de difficulté persistants du mode (façon Ascension de Slay the
 * Spire / Chaleur de Hades). Un compteur unique de 0 à BRAINRUN_MAX_ERUDITION ; chaque niveau ajoute
 * UN modificateur et conserve tous les précédents. Gagner une run au niveau N débloque le niveau N+1
 * (cf. BrainrunService.finalizeRun).
 *
 * Défini en code et partagé client/serveur comme les autres catalogues (brainrunItems/Talents/
 * Bosses) : le serveur applique les effets, le client affiche les libellés dans le sélecteur du
 * lobby et le badge de run. */

/** Effets agrégés de tous les niveaux d'Érudition atteints ; valeurs neutres au niveau 0.
 *
 * Toutes les valeurs numériques s'agrègent par SOMME (jamais par MAX), y compris les pourcentages :
 * chaque niveau de l'échelle est un cran supplémentaire, pas une variante d'un même effet. C'est
 * volontairement l'inverse du piège d'agrégation des talents (cf. references/talents.md) — deux
 * niveaux qui donnent chacun +10 % de PV de boss donnent bien +20 %, pas +10 %. */
export type BrainrunEruditionEffects = {
  /** Pourcentage de PV supplémentaires pour les boss (cf. brainrunBossMaxHp). */
  bossHpBonusPct: number;
  /** Questions supplémentaires dans une salle Élite. */
  eliteQuestionBonus: number;
  /** Pourcentage ajouté aux prix de la Librairie. */
  shopPriceBonusPct: number;
  /** PV de soin en moins à la Bibliothèque (cf. instantRoomHealthDelta). */
  restHealMalus: number;
  /** Pourcentage retiré à l'or gagné en combat. */
  goldMalusPct: number;
  /** Temps (ms) retiré au chrono de chaque question de boss. */
  bossTimeMalusMs: number;
  /** Cartes de thème proposées en moins après un combat gagné. */
  themeCardCountDelta: number;
  /** true : vaincre un boss ne régénère plus les PV avant l'acte suivant. */
  disablesBossHeal: boolean;
  /** Emplacements de consommables en moins. */
  consumableSlotMalus: number;
};

/** Un cran de l'échelle : son libellé joueur et le modificateur qu'il ajoute. */
export type BrainrunEruditionStep = {
  /** Résumé affiché dans le sélecteur du lobby. */
  label: string;
} & Partial<BrainrunEruditionEffects>;

/** L'échelle, index 0 = niveau I. Ajouter un cran ici suffit : BRAINRUN_MAX_ERUDITION en découle et
 * l'agrégation est générique. */
export const BRAINRUN_ERUDITION_LADDER: BrainrunEruditionStep[] = [
  { label: "Les boss ont 10 % de PV en plus", bossHpBonusPct: 10 },
  { label: "Les Élites posent une question de plus", eliteQuestionBonus: 1 },
  { label: "Les prix de la Librairie augmentent de 25 %", shopPriceBonusPct: 25 },
  { label: "La Bibliothèque ne soigne plus que 1 PV", restHealMalus: 1 },
  { label: "Les boss ont encore 10 % de PV en plus", bossHpBonusPct: 10 },
  { label: "L'or gagné en combat baisse de 25 %", goldMalusPct: 25 },
  { label: "Les questions de boss durent 2 s de moins", bossTimeMalusMs: 2_000 },
  { label: "Une carte de thème en moins après un combat", themeCardCountDelta: -1 },
  { label: "Vaincre un boss ne régénère plus les PV", disablesBossHeal: true },
  { label: "Un emplacement de consommable en moins", consumableSlotMalus: 1 },
];

/** Plus haut niveau d'Érudition atteignable. */
export const BRAINRUN_MAX_ERUDITION = BRAINRUN_ERUDITION_LADDER.length;

const NEUTRAL_ERUDITION_EFFECTS: BrainrunEruditionEffects = {
  bossHpBonusPct: 0,
  eliteQuestionBonus: 0,
  shopPriceBonusPct: 0,
  restHealMalus: 0,
  goldMalusPct: 0,
  bossTimeMalusMs: 0,
  themeCardCountDelta: 0,
  disablesBossHeal: false,
  consumableSlotMalus: 0,
};

/**
 * Effets cumulés de tous les niveaux jusqu'à `level` inclus. Même principe d'agrégation que
 * getActiveRelicEffects/getActiveTalentEffects (server/utils/brainrunLogic.ts) : un unique objet
 * d'effets que les consommateurs lisent, plutôt que des tests de niveau dispersés dans le service.
 *
 * Le niveau 0 renvoie des valeurs strictement neutres : une run sans Érudition se comporte
 * exactement comme avant l'ajout de la fonctionnalité.
 */
export function getBrainrunEruditionEffects(level: number): BrainrunEruditionEffects {
  const clamped = Math.max(0, Math.min(Math.floor(level || 0), BRAINRUN_MAX_ERUDITION));
  return BRAINRUN_ERUDITION_LADDER.slice(0, clamped).reduce<BrainrunEruditionEffects>(
    (effects, step) => ({
      bossHpBonusPct: effects.bossHpBonusPct + (step.bossHpBonusPct ?? 0),
      eliteQuestionBonus: effects.eliteQuestionBonus + (step.eliteQuestionBonus ?? 0),
      shopPriceBonusPct: effects.shopPriceBonusPct + (step.shopPriceBonusPct ?? 0),
      restHealMalus: effects.restHealMalus + (step.restHealMalus ?? 0),
      goldMalusPct: effects.goldMalusPct + (step.goldMalusPct ?? 0),
      bossTimeMalusMs: effects.bossTimeMalusMs + (step.bossTimeMalusMs ?? 0),
      themeCardCountDelta: effects.themeCardCountDelta + (step.themeCardCountDelta ?? 0),
      disablesBossHeal: effects.disablesBossHeal || (step.disablesBossHeal ?? false),
      consumableSlotMalus: effects.consumableSlotMalus + (step.consumableSlotMalus ?? 0),
    }),
    { ...NEUTRAL_ERUDITION_EFFECTS },
  );
}

const ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** Libellé joueur d'un niveau : « Érudition IV », ou « Standard » au niveau 0. */
export function brainrunEruditionLabel(level: number): string {
  if (level <= 0) return "Standard";
  return `Érudition ${ROMAN_NUMERALS[level - 1] ?? level}`;
}
