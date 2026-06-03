export interface RankInfo {
  tier: string;
  division: string;
  pointsInDivision: number;
  label: string;
  color: string;
  icon: string;
}

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
      color: "from-amber-800 to-amber-950 text-amber-500 border-amber-700/30",
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

export function useRank() {
  return {
    getRankFromPoints,
  };
}
