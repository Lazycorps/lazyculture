import type { BrainrunRoomType } from "#shared/brainrun";

/** Libellés/icônes des types de salle Brainrun, partagés entre l'écran de jeu et la carte d'acte. */
export function useBrainrunRoomTypeDisplay() {
  function roomTypeLabel(type: BrainrunRoomType): string {
    switch (type) {
      case "STANDARD":
        return "Combat";
      case "ELITE":
        return "Elite";
      case "BOSS":
        return "Boss";
      case "REST":
        return "Repos (+1 PV)";
      case "SHOP":
        return "Boutique";
      case "EVENT":
        return "Événement";
    }
  }

  function roomTypeIcon(type: BrainrunRoomType): string {
    switch (type) {
      case "STANDARD":
        return "i-heroicons-bolt";
      case "ELITE":
        return "i-heroicons-fire";
      case "BOSS":
        return "i-heroicons-shield-exclamation";
      case "REST":
        return "i-heroicons-heart";
      case "SHOP":
        return "i-heroicons-shopping-bag";
      case "EVENT":
        return "i-heroicons-question-mark-circle";
    }
  }

  return { roomTypeLabel, roomTypeIcon };
}
