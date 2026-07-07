import prisma from "~~/server/utils/prisma";

export interface RankInfo {
  tier: string;
  division: string;
  pointsInDivision: number;
  label: string;
  color: string;
  icon: string;
}

/**
 * Calcule les informations détaillées du rang compétitif à partir des LP cumulés.
 */
export function getRankFromPoints(points: number): RankInfo {
  if (points < 300) {
    const divIndex = Math.floor(points / 100);
    const division = divIndex === 0 ? "III" : divIndex === 1 ? "II" : "I";
    const pointsInDivision = points % 100;
    return {
      tier: "Bronze",
      division,
      pointsInDivision,
      label: `Bronze ${division}`,
      color: "from-amber-800 to-amber-950 text-amber-600 border-amber-700/30",
      icon: "i-heroicons-shield-exclamation",
    };
  } else if (points < 600) {
    const base = points - 300;
    const divIndex = Math.floor(base / 100);
    const division = divIndex === 0 ? "III" : divIndex === 1 ? "II" : "I";
    const pointsInDivision = base % 100;
    return {
      tier: "Silver",
      division,
      pointsInDivision,
      label: `Argent ${division}`,
      color: "from-slate-400 to-slate-600 text-slate-300 border-slate-500/30",
      icon: "i-heroicons-shield-check",
    };
  } else if (points < 900) {
    const base = points - 600;
    const divIndex = Math.floor(base / 100);
    const division = divIndex === 0 ? "III" : divIndex === 1 ? "II" : "I";
    const pointsInDivision = base % 100;
    return {
      tier: "Gold",
      division,
      pointsInDivision,
      label: `Or ${division}`,
      color: "from-yellow-500 to-amber-600 text-yellow-400 border-yellow-500/30",
      icon: "i-heroicons-trophy",
    };
  } else if (points < 1200) {
    const base = points - 900;
    const divIndex = Math.floor(base / 100);
    const division = divIndex === 0 ? "III" : divIndex === 1 ? "II" : "I";
    const pointsInDivision = base % 100;
    return {
      tier: "Platinum",
      division,
      pointsInDivision,
      label: `Platine ${division}`,
      color: "from-teal-400 to-emerald-600 text-teal-300 border-teal-500/30",
      icon: "i-heroicons-sparkles",
    };
  } else if (points < 1500) {
    const base = points - 1200;
    const divIndex = Math.floor(base / 100);
    const division = divIndex === 0 ? "III" : divIndex === 1 ? "II" : "I";
    const pointsInDivision = base % 100;
    return {
      tier: "Diamond",
      division,
      pointsInDivision,
      label: `Diamant ${division}`,
      color: "from-blue-500 to-indigo-600 text-blue-400 border-blue-500/30",
      icon: "i-heroicons-bolt",
    };
  } else {
    const pointsInDivision = points - 1500;
    return {
      tier: "Master",
      division: "",
      pointsInDivision,
      label: `Maître (${points} LP)`,
      color:
        "from-purple-600 via-pink-600 to-rose-600 text-pink-400 border-pink-500/30 animate-pulse",
      icon: "i-heroicons-fire",
    };
  }
}

/**
 * Algorithme de calcul des LP gagnés/perdus à la fin d'un match.
 */
export function calculateLPGainOrLoss(rank: number, totalPlayers: number): number {
  if (totalPlayers <= 1) return 0;

  // Points maximums et minimums de base escaladés par rapport au nombre de joueurs
  const maxLP = 15 + totalPlayers * 1.5;
  const minLP = -(5 + totalPlayers * 1.0);

  // Position relative du joueur: 1 pour le premier (excluant bonus de victoire), 0 pour le dernier
  const relativePosition = (totalPlayers - rank) / (totalPlayers - 1);

  // Calcul linéaire des LP de base
  let lp = minLP + (maxLP - minLP) * relativePosition;

  // Ajouter un bonus de victoire pour la 1ère place
  if (rank === 1) {
    const winBonus = 5 + totalPlayers * 0.5;
    lp += winBonus;
  }

  return Math.round(lp);
}

/**
 * Met à jour le classement compétitif d'un utilisateur après un match.
 */
export async function updateUserRank(
  userId: string,
  matchRank: number,
  totalPlayers: number,
  lobbyAvgPoints?: number,
) {
  // 1. Récupérer ou initialiser le classement compétitif de l'utilisateur
  let brRank = await prisma.battleRoyaleRank.findUnique({
    where: { userId },
  });

  if (!brRank) {
    brRank = await prisma.battleRoyaleRank.create({
      data: {
        userId,
        points: 0,
        wins: 0,
        gamesPlayed: 0,
      },
    });
  }

  const oldPoints = brRank.points;
  let lpChange = calculateLPGainOrLoss(matchRank, totalPlayers);

  // Ajustement Elo basé sur l'écart de niveau avec la moyenne du lobby
  if (lobbyAvgPoints !== undefined) {
    const diff = lobbyAvgPoints - oldPoints;
    // Ajustement de 5% de la différence de LP, borné entre -10 et +10 LP
    const ratingAdjustment = Math.max(-10, Math.min(10, Math.round(diff * 0.05)));
    lpChange += ratingAdjustment;
  }

  // Les LP ne peuvent pas descendre en dessous de 0
  let newPoints = Math.max(0, oldPoints + lpChange);
  const winIncrement = matchRank === 1 ? 1 : 0;

  const oldRank = getRankFromPoints(oldPoints);
  let newRank = getRankFromPoints(newPoints);

  // Protection contre la relégation immédiate si l'utilisateur a des LP dans sa division actuelle
  const wouldBeDemoted =
    newPoints < oldPoints &&
    (oldRank.tier !== newRank.tier || oldRank.division !== newRank.division);

  let finalLpChange = lpChange;
  if (wouldBeDemoted && oldRank.pointsInDivision > 0) {
    newPoints = oldPoints - oldRank.pointsInDivision;
    newRank = getRankFromPoints(newPoints);
    finalLpChange = newPoints - oldPoints;
  } else {
    // Si pas de rétrogradation bloquée, on ajuste la perte réelle au cas où on a été bloqué à 0
    finalLpChange = newPoints - oldPoints;
  }

  // 2. Mettre à jour en Base de Données
  const updatedRank = await prisma.battleRoyaleRank.update({
    where: { userId },
    data: {
      points: newPoints,
      wins: { increment: winIncrement },
      gamesPlayed: { increment: 1 },
      updateDate: new Date(),
    },
  });

  // Une promotion ou relégation se produit si le palier (tier) ou la division change
  const isPromoted =
    newPoints > oldPoints &&
    (oldRank.tier !== newRank.tier || oldRank.division !== newRank.division);
  const isDemoted =
    newPoints < oldPoints &&
    (oldRank.tier !== newRank.tier || oldRank.division !== newRank.division);

  return {
    lpChange: finalLpChange,
    oldPoints,
    newPoints,
    oldRank,
    newRank,
    isPromoted,
    isDemoted,
    wins: updatedRank.wins,
    gamesPlayed: updatedRank.gamesPlayed,
  };
}
