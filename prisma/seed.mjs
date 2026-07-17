import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const achievementsData = [
  // --- SUCCÈS SPEEDRUN ---
  {
    title: "Pionnier de la vitesse",
    description: "Jouer 1 partie en mode Speedrun (Survie ou Sprint).",
    conditionType: "speedrunGames",
    conditionValue: 1,
    xpEarned: 200,
    icon: "/images/achievements/achievement_41.webp",
    hidden: false,
  },
  {
    title: "Accro du chrono",
    description: "Jouer 15 parties en mode Speedrun (Survie ou Sprint).",
    conditionType: "speedrunGames",
    conditionValue: 15,
    xpEarned: 1000,
    icon: "/images/achievements/achievement_42.webp",
    hidden: false,
  },
  {
    title: "Survivant éclair",
    description: "Atteindre 12 bonnes réponses en mode Survie Flash.",
    conditionType: "speedrunSurvivalMaxScore",
    conditionValue: 12,
    xpEarned: 1200,
    icon: "/images/achievements/achievement_43.webp",
    hidden: false,
  },
  {
    title: "Dieu de la Survie",
    description: "Atteindre 22 bonnes réponses en mode Survie Flash.",
    conditionType: "speedrunSurvivalMaxScore",
    conditionValue: 22,
    xpEarned: 3000,
    icon: "/images/achievements/achievement_44.webp",
    hidden: false,
  },
  {
    title: "Sprint Éclair",
    description: "Terminer le Sprint 20 en moins de 180 secondes.",
    conditionType: "speedrunSprintBestTime",
    conditionValue: 180000,
    xpEarned: 1500,
    icon: "/images/achievements/achievement_45.webp",
    hidden: false,
  },
  {
    title: "Sprint Légendaire",
    description: "Terminer le Sprint 20 en moins de 130 secondes.",
    conditionType: "speedrunSprintBestTime",
    conditionValue: 130000,
    xpEarned: 4000,
    icon: "/images/achievements/achievement_46.webp",
    hidden: false,
  },

  // --- NOUVEAUX SUCCÈS BATTLE ROYALE ---
  {
    title: "L'Intouchable",
    description: "Remporter une partie de Battle Royale en conservant ses 3 vies intactes.",
    conditionType: "brPerfectWin",
    conditionValue: 1,
    xpEarned: 3000,
    icon: "/images/achievements/achievement_25.webp",
    hidden: false,
  },
  {
    title: "Sur le fil",
    description: "Remporter une partie de Battle Royale avec seulement 1 vie restante.",
    conditionType: "brClutchWin",
    conditionValue: 1,
    xpEarned: 1500,
    icon: "/images/achievements/achievement_26.webp",
    hidden: false,
  },
  {
    title: "Marathonien",
    description: "Atteindre le Round 10 ou plus dans un match de Battle Royale.",
    conditionType: "brRounds",
    conditionValue: 10,
    xpEarned: 1000,
    icon: "/images/achievements/achievement_27.webp",
    hidden: false,
  },
  {
    title: "Légende du Royale",
    description: "Atteindre 1 000 LP (points de classement) en Battle Royale.",
    conditionType: "brRankPoints",
    conditionValue: 1000,
    xpEarned: 4500,
    icon: "/images/achievements/achievement_28.webp",
    hidden: false,
  },
  {
    title: "Sniper intellectuel",
    description: "Enchaîner une série de 8 bonnes réponses consécutives dans une Battle Royale.",
    conditionType: "brStreak",
    conditionValue: 8,
    xpEarned: 1500,
    icon: "/images/achievements/achievement_29.webp",
    hidden: false,
  },

  // --- SUCCÈS PAR DÉFAUT / ANCIENS ---
  // Réponses globales
  {
    title: "Premier mot",
    description: "Répondre à 1 question.",
    conditionType: "answer",
    conditionValue: 1,
    xpEarned: 100,
    icon: "/images/achievements/achievement_2.webp",
    hidden: false,
  },
  {
    title: "Bavard",
    description: "Répondre à 100 questions.",
    conditionType: "answer",
    conditionValue: 100,
    xpEarned: 1000,
    icon: "/images/achievements/achievement_30.webp",
    hidden: false,
  },
  {
    title: "Encyclopédie vivante",
    description: "Répondre à 1 000 questions.",
    conditionType: "answer",
    conditionValue: 1000,
    xpEarned: 4000,
    icon: "/images/achievements/achievement_31.webp",
    hidden: false,
  },

  // Réponses correctes
  {
    title: "Bon départ",
    description: "Donner 1 bonne réponse.",
    conditionType: "answerCorrect",
    conditionValue: 1,
    xpEarned: 100,
    icon: "/images/achievements/achievement_32.webp",
    hidden: false,
  },
  {
    title: "Savant",
    description: "Donner 100 bonnes réponses.",
    conditionType: "answerCorrect",
    conditionValue: 100,
    xpEarned: 1200,
    icon: "/images/achievements/achievement_33.webp",
    hidden: false,
  },
  {
    title: "Génie",
    description: "Donner 500 bonnes réponses.",
    conditionType: "answerCorrect",
    conditionValue: 500,
    xpEarned: 3500,
    icon: "/images/achievements/achievement_34.webp",
    hidden: false,
  },

  // Séries de réponses correctes (globales)
  {
    title: "Infaillible",
    description: "Enchaîner 5 bonnes réponses.",
    conditionType: "answerCorrectStreak",
    conditionValue: 5,
    xpEarned: 800,
    icon: "/images/achievements/achievement_35.webp",
    hidden: false,
  },

  // Parties Battle Royale
  {
    title: "Nouveau Challenger",
    description: "Jouer 1 partie en Battle Royale.",
    conditionType: "brGames",
    conditionValue: 1,
    xpEarned: 200,
    icon: "/images/achievements/achievement_17.webp",
    hidden: false,
  },
  {
    title: "Habitué de l'arène",
    description: "Jouer 10 parties en Battle Royale.",
    conditionType: "brGames",
    conditionValue: 10,
    xpEarned: 800,
    icon: "/images/achievements/achievement_18.webp",
    hidden: false,
  },
  {
    title: "Vétéran du Royale",
    description: "Jouer 50 parties en Battle Royale.",
    conditionType: "brGames",
    conditionValue: 50,
    xpEarned: 2500,
    icon: "/images/achievements/achievement_36.webp",
    hidden: false,
  },

  // Victoires Battle Royale
  {
    title: "Premier Couronnement",
    description: "Gagner 1 partie en Battle Royale.",
    conditionType: "brWins",
    conditionValue: 1,
    xpEarned: 1500,
    icon: "/images/achievements/achievement_19.webp",
    hidden: false,
  },
  {
    title: "Maître du Royale",
    description: "Gagner 5 parties en Battle Royale.",
    conditionType: "brWins",
    conditionValue: 5,
    xpEarned: 3000,
    icon: "/images/achievements/achievement_20.webp",
    hidden: false,
  },
  {
    title: "Souverain incontesté",
    description: "Gagner 25 parties en Battle Royale.",
    conditionType: "brWins",
    conditionValue: 25,
    xpEarned: 8000,
    icon: "/images/achievements/achievement_37.webp",
    hidden: false,
  },

  // Showdown
  {
    title: "Duelliste novice",
    description: "Jouer 1 partie de Showdown.",
    conditionType: "showdownGames",
    conditionValue: 1,
    xpEarned: 200,
    icon: "/images/achievements/achievement_21.webp",
    hidden: false,
  },
  {
    title: "Adepte du duel",
    description: "Jouer 10 parties de Showdown.",
    conditionType: "showdownGames",
    conditionValue: 10,
    xpEarned: 800,
    icon: "/images/achievements/achievement_22.webp",
    hidden: false,
  },
  {
    title: "Premier triomphe",
    description: "Gagner 1 partie de Showdown.",
    conditionType: "showdownWins",
    conditionValue: 1,
    xpEarned: 1000,
    icon: "/images/achievements/achievement_23.webp",
    hidden: false,
  },
  {
    title: "Champion des arènes",
    description: "Gagner 10 parties de Showdown.",
    conditionType: "showdownWins",
    conditionValue: 10,
    xpEarned: 3000,
    icon: "/images/achievements/achievement_38.webp",
    hidden: false,
  },

  // Brainrun
  {
    title: "Explorateur des méandres",
    description: "Jouer 1 partie de Brainrun.",
    conditionType: "brainrunGames",
    conditionValue: 1,
    xpEarned: 500,
    icon: "/images/achievements/achievement_39.webp",
    hidden: false,
  },
  {
    title: "Conquérant de l'esprit",
    description: "Gagner 1 partie de Brainrun.",
    conditionType: "brainrunWins",
    conditionValue: 1,
    xpEarned: 50000,
    icon: "/images/achievements/achievement_40.webp",
    hidden: false,
  },
];

async function main() {
  console.log("Démarrage du seed des succès...");

  // Récupérer les succès existants pour éviter les doublons
  const existingAchievements = await prisma.achievement.findMany();

  for (const item of achievementsData) {
    const existing = existingAchievements.find(
      (a) => a.conditionType === item.conditionType && a.conditionValue === item.conditionValue,
    );

    if (existing) {
      await prisma.achievement.update({
        where: { id: existing.id },
        data: {
          title: item.title,
          description: item.description,
          xpEarned: item.xpEarned,
          icon: item.icon,
          hidden: item.hidden,
        },
      });
      console.log(`Mis à jour : ${item.title}`);
    } else {
      const created = await prisma.achievement.create({
        data: item,
      });
      console.log(`Créé : ${created.title}`);
    }
  }

  console.log("Seed des succès terminé avec succès !");
}

main()
  .catch((e) => {
    console.error("Erreur durant le seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
