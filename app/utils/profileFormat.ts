/**
 * Helpers de formatage partagés entre les pages/composants de profil.
 */

export function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(ms: number) {
  if (!ms || ms < 0) return "0s";
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s`;
}

export function getMasteryColorClass(mastery: number) {
  if (mastery < 4.5) {
    return {
      badge: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      icon: "text-rose-500",
    };
  } else if (mastery < 7.5) {
    return {
      badge: "text-amber-400 bg-amber-500/10 border-amber-500/20",
      icon: "text-amber-500",
    };
  } else {
    return {
      badge: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      icon: "text-emerald-500",
    };
  }
}
