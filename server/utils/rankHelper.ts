import prisma from "~/lib/prisma";

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

  // Le vainqueur gagne un bonus substantiel dépendant du nombre total de joueurs
  if (rank === 1) {
    return 30 + totalPlayers * 2;
  }

  // Position relative entre 0 (dernier) et 1 (premier exclu, car rank > 1)
  const relativePosition = (totalPlayers - rank) / (totalPlayers - 1);

  if (relativePosition >= 0.5) {
    // Moitié supérieure : gain modéré (0 à +15 LP)
    return Math.round(15 * (relativePosition - 0.5) * 2);
  } else {
    // Moitié inférieure : perte modérée à forte (0 à -25 LP)
    return Math.round(-25 * (0.5 - relativePosition) * 2);
  }
}

/**
 * Met à jour le classement compétitif d'un utilisateur après un match.
 */
export async function updateUserRank(userId: string, matchRank: number, totalPlayers: number) {
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
  const lpChange = calculateLPGainOrLoss(matchRank, totalPlayers);

  // Les LP ne peuvent pas descendre en dessous de 0
  const newPoints = Math.max(0, oldPoints + lpChange);
  const winIncrement = matchRank === 1 ? 1 : 0;

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

  const oldRank = getRankFromPoints(oldPoints);
  const newRank = getRankFromPoints(newPoints);

  // Une promotion ou relégation se produit si le palier (tier) ou la division change
  const isPromoted =
    newPoints > oldPoints &&
    (oldRank.tier !== newRank.tier || oldRank.division !== newRank.division);
  const isDemoted =
    newPoints < oldPoints &&
    (oldRank.tier !== newRank.tier || oldRank.division !== newRank.division);

  return {
    lpChange,
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
