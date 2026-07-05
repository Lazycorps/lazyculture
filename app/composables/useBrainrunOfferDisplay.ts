import { BRAINRUN_CONSUMABLES, BRAINRUN_RELICS, type BrainrunOffer } from "#shared/brainrunItems";

/** Affichage des offres Brainrun (bonus post-combat, Librairie) : nom/description/icône du
 * catalogue, et distinction visuelle relique/consommable/or (kind), séparée de la rareté, pour
 * que les deux restent lisibles indépendamment l'une de l'autre. */
export function useBrainrunOfferDisplay() {
  function offerName(offer: BrainrunOffer): string {
    if (offer.kind === "RELIC")
      return BRAINRUN_RELICS[offer.id as keyof typeof BRAINRUN_RELICS].name;
    if (offer.kind === "CONSUMABLE")
      return BRAINRUN_CONSUMABLES[offer.id as keyof typeof BRAINRUN_CONSUMABLES].name;
    return "Or";
  }

  function offerDescription(offer: BrainrunOffer): string {
    if (offer.kind === "RELIC")
      return BRAINRUN_RELICS[offer.id as keyof typeof BRAINRUN_RELICS].description;
    if (offer.kind === "CONSUMABLE")
      return BRAINRUN_CONSUMABLES[offer.id as keyof typeof BRAINRUN_CONSUMABLES].description;
    return `+${offer.amount ?? 0} or`;
  }

  function offerIcon(offer: BrainrunOffer): string {
    if (offer.kind === "RELIC")
      return BRAINRUN_RELICS[offer.id as keyof typeof BRAINRUN_RELICS].icon;
    if (offer.kind === "CONSUMABLE")
      return BRAINRUN_CONSUMABLES[offer.id as keyof typeof BRAINRUN_CONSUMABLES].icon;
    return "i-heroicons-currency-dollar";
  }

  function offerKindLabel(offer: BrainrunOffer): string {
    if (offer.kind === "RELIC") return "Relique";
    if (offer.kind === "CONSUMABLE") return "Consommable";
    return "Or";
  }

  function isRare(offer: BrainrunOffer): boolean {
    if (offer.kind === "RELIC") return offer.rarity === "RARE";
    if (offer.kind === "CONSUMABLE")
      return BRAINRUN_CONSUMABLES[offer.id as keyof typeof BRAINRUN_CONSUMABLES].rarity === "RARE";
    return false;
  }

  /** Couleur d'identité de l'offre (relique/consommable/or) : porte le "quoi" indépendamment de la
   * rareté, qui est signalée séparément (cf. rarityRingClass) pour ne pas se confondre avec elle. */
  function kindBadgeClass(offer: BrainrunOffer): string {
    if (offer.kind === "RELIC")
      return "bg-violet-500/10 border border-violet-500/30 text-violet-400";
    if (offer.kind === "CONSUMABLE") return "bg-sky-500/10 border border-sky-500/30 text-sky-400";
    return "bg-amber-500/10 border border-amber-500/30 text-amber-400";
  }

  /** Anneau doré additif signalant une offre rare, superposé à kindBadgeClass. */
  function rarityRingClass(offer: BrainrunOffer): string {
    return isRare(offer) ? "ring-2 ring-amber-400/70" : "";
  }

  return {
    offerName,
    offerDescription,
    offerIcon,
    offerKindLabel,
    kindBadgeClass,
    rarityRingClass,
  };
}
