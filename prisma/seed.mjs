import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const achievementsData = [
  // --- NOUVEAUX SUCCÈS BATTLE ROYALE ---
  {
    title: "L'Intouchable",
    description: "Remporter une partie de Battle Royale en conservant ses 3 vies intactes.",
    conditionType: "brPerfectWin",
    conditionValue: 1,
    xpEarned: 100,
    icon: "",
    hidden: false,
  },
  {
    title: "Sur le fil",
    description: "Remporter une partie de Battle Royale avec seulement 1 vie restante.",
    conditionType: "brClutchWin",
    conditionValue: 1,
    xpEarned: 50,
    icon: "",
    hidden: false,
  },
  {
    title: "Marathonien",
    description: "Atteindre le Round 10 ou plus dans un match de Battle Royale.",
    conditionType: "brRounds",
    conditionValue: 10,
    xpEarned: 30,
    icon: "",
    hidden: false,
  },
  {
    title: "Légende du Royale",
    description: "Atteindre 1 000 LP (points de classement) en Battle Royale.",
    conditionType: "brRankPoints",
    conditionValue: 1000,
    xpEarned: 150,
    icon: "",
    hidden: false,
  },
  {
    title: "Sniper intellectuel",
    description: "Enchaîner une série de 8 bonnes réponses consécutives dans une Battle Royale.",
    conditionType: "brStreak",
    conditionValue: 8,
    xpEarned: 50,
    icon: "",
    hidden: false,
  },

  // --- SUCCÈS PAR DÉFAUT / ANCIENS ---
  // Réponses globales
  {
    title: "Premier mot",
    description: "Répondre à 1 question.",
    conditionType: "answer",
    conditionValue: 1,
    xpEarned: 10,
    icon: "",
    hidden: false,
  },
  {
    title: "Bavard",
    description: "Répondre à 100 questions.",
    conditionType: "answer",
    conditionValue: 100,
    xpEarned: 50,
    icon: "",
    hidden: false,
  },
  {
    title: "Encyclopédie vivante",
    description: "Répondre à 1 000 questions.",
    conditionType: "answer",
    conditionValue: 1000,
    xpEarned: 150,
    icon: "",
    hidden: false,
  },

  // Réponses correctes
  {
    title: "Bon départ",
    description: "Donner 1 bonne réponse.",
    conditionType: "answerCorrect",
    conditionValue: 1,
    xpEarned: 10,
    icon: "",
    hidden: false,
  },
  {
    title: "Savant",
    description: "Donner 100 bonnes réponses.",
    conditionType: "answerCorrect",
    conditionValue: 100,
    xpEarned: 50,
    icon: "",
    hidden: false,
  },
  {
    title: "Génie",
    description: "Donner 500 bonnes réponses.",
    conditionType: "answerCorrect",
    conditionValue: 500,
    xpEarned: 100,
    icon: "",
    hidden: false,
  },

  // Séries de réponses correctes (globales)
  {
    title: "Infaillible",
    description: "Enchaîner 5 bonnes réponses.",
    conditionType: "answerCorrectStreak",
    conditionValue: 5,
    xpEarned: 30,
    icon: "",
    hidden: false,
  },

  // Parties Battle Royale
  {
    title: "Nouveau Challenger",
    description: "Jouer 1 partie en Battle Royale.",
    conditionType: "brGames",
    conditionValue: 1,
    xpEarned: 10,
    icon: "",
    hidden: false,
  },
  {
    title: "Habitué de l'arène",
    description: "Jouer 10 parties en Battle Royale.",
    conditionType: "brGames",
    conditionValue: 10,
    xpEarned: 30,
    icon: "",
    hidden: false,
  },
  {
    title: "Vétéran du Royale",
    description: "Jouer 50 parties en Battle Royale.",
    conditionType: "brGames",
    conditionValue: 50,
    xpEarned: 80,
    icon: "",
    hidden: false,
  },

  // Victoires Battle Royale
  {
    title: "Premier Couronnement",
    description: "Gagner 1 partie en Battle Royale.",
    conditionType: "brWins",
    conditionValue: 1,
    xpEarned: 50,
    icon: "",
    hidden: false,
  },
  {
    title: "Maître du Royale",
    description: "Gagner 5 parties en Battle Royale.",
    conditionType: "brWins",
    conditionValue: 5,
    xpEarned: 100,
    icon: "",
    hidden: false,
  },
  {
    title: "Souverain incontesté",
    description: "Gagner 25 parties en Battle Royale.",
    conditionType: "brWins",
    conditionValue: 25,
    xpEarned: 250,
    icon: "",
    hidden: false,
  },

  // Showdown
  {
    title: "Duelliste novice",
    description: "Jouer 1 partie de Showdown.",
    conditionType: "showdownGames",
    conditionValue: 1,
    xpEarned: 10,
    icon: "",
    hidden: false,
  },
  {
    title: "Adepte du duel",
    description: "Jouer 10 parties de Showdown.",
    conditionType: "showdownGames",
    conditionValue: 10,
    xpEarned: 30,
    icon: "",
    hidden: false,
  },
  {
    title: "Premier triomphe",
    description: "Gagner 1 partie de Showdown.",
    conditionType: "showdownWins",
    conditionValue: 1,
    xpEarned: 30,
    icon: "",
    hidden: false,
  },
  {
    title: "Champion des arènes",
    description: "Gagner 10 parties de Showdown.",
    conditionType: "showdownWins",
    conditionValue: 10,
    xpEarned: 100,
    icon: "",
    hidden: false,
  },

  // Brainrun
  {
    title: "Explorateur des méandres",
    description: "Jouer 1 partie de Brainrun.",
    conditionType: "brainrunGames",
    conditionValue: 1,
    xpEarned: 10,
    icon: "",
    hidden: false,
  },
  {
    title: "Conquérant de l'esprit",
    description: "Gagner 1 partie de Brainrun.",
    conditionType: "brainrunWins",
    conditionValue: 1,
    xpEarned: 50,
    icon: "",
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
