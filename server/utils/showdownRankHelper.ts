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
 * Calcule les informations détaillées du rang compétitif à partir des LP cumulés (identique à Battle Royale).
 */
export function getShowdownRankFromPoints(points: number): RankInfo {
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
 * Calcule les gains ou pertes de LP en fonction des points respectifs des deux joueurs.
 */
export function calculateShowdownLPGainOrLoss(
  playerPoints: number,
  opponentPoints: number,
  won: boolean,
): number {
  const diff = opponentPoints - playerPoints;

  if (won) {
    // Gain de base 15, ajusté selon l'écart
    const gain = 15 + Math.round(diff / 10);
    // Borner le gain entre +5 LP et +30 LP
    return Math.max(5, Math.min(30, gain));
  } else {
    // Perte de base 15, ajustée selon l'écart (si l'adversaire est plus fort, on perd moins)
    const loss = -15 + Math.round(diff / 10);
    // Borner la perte entre -25 LP et -5 LP
    return Math.max(-25, Math.min(-5, loss));
  }
}

/**
 * Met à jour le classement d'un utilisateur de Showdown après un match.
 */
export async function updateShowdownUserRank(userId: string, opponentId: string, won: boolean) {
  // 1. Récupérer ou initialiser le classement du joueur
  let playerRank = await prisma.showdownRank.findUnique({
    where: { userId },
  });
  if (!playerRank) {
    playerRank = await prisma.showdownRank.create({
      data: { userId, points: 0, wins: 0, gamesPlayed: 0 },
    });
  }

  // 2. Récupérer ou initialiser le classement de l'adversaire
  let opponentRank = await prisma.showdownRank.findUnique({
    where: { userId: opponentId },
  });
  if (!opponentRank) {
    opponentRank = await prisma.showdownRank.create({
      data: { userId: opponentId, points: 0, wins: 0, gamesPlayed: 0 },
    });
  }

  const oldPoints = playerRank.points;
  const lpChange = calculateShowdownLPGainOrLoss(oldPoints, opponentRank.points, won);

  // Les LP ne peuvent pas descendre en dessous de 0
  const newPoints = Math.max(0, oldPoints + lpChange);
  const winIncrement = won ? 1 : 0;

  // 3. Sauvegarder les données
  const updated = await prisma.showdownRank.update({
    where: { userId },
    data: {
      points: newPoints,
      wins: { increment: winIncrement },
      gamesPlayed: { increment: 1 },
      updateDate: new Date(),
    },
  });

  const oldRank = getShowdownRankFromPoints(oldPoints);
  const newRank = getShowdownRankFromPoints(newPoints);

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
    wins: updated.wins,
    gamesPlayed: updated.gamesPlayed,
  };
}
