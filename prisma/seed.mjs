// Seed idempotent du catalogue de cosmétiques (avatars + cadres).
// Lancement : npx prisma db seed  (ou node prisma/seed.mjs)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AVATARS = [
  { name: "Tortue", imageUrl: "/avatars/tortue.svg", unlockType: "FREE", price: 0, sortOrder: 0 },
  { name: "Renard", imageUrl: "/avatars/renard.svg", unlockType: "FREE", price: 0, sortOrder: 1 },
  { name: "Robot", imageUrl: "/avatars/robot.svg", unlockType: "FREE", price: 0, sortOrder: 2 },
  { name: "Fantôme", imageUrl: "/avatars/fantome.svg", unlockType: "FREE", price: 0, sortOrder: 3 },
  { name: "Alien", imageUrl: "/avatars/alien.svg", unlockType: "COINS", price: 500, sortOrder: 4 },
  {
    name: "Dragon",
    imageUrl: "/avatars/dragon.svg",
    unlockType: "COINS",
    price: 1500,
    sortOrder: 5,
  },
  {
    name: "Couronne",
    imageUrl: "/avatars/couronne.svg",
    unlockType: "ACHIEVEMENT",
    price: 0,
    sortOrder: 6,
  },
  {
    name: "Paresseux Cozy",
    imageUrl: "/images/avatars/avatar_1.png",
    unlockType: "FREE",
    price: 0,
    sortOrder: 7,
  },
  {
    name: "Koala Gamer",
    imageUrl: "/images/avatars/avatar_2.png",
    unlockType: "FREE",
    price: 0,
    sortOrder: 8,
  },
  {
    name: "Panda Streamer",
    imageUrl: "/images/avatars/avatar_3.png",
    unlockType: "FREE",
    price: 0,
    sortOrder: 9,
  },
  {
    name: "Hibou Érudit",
    imageUrl: "/images/avatars/avatar_4.png",
    unlockType: "FREE",
    price: 0,
    sortOrder: 10,
  },
  {
    name: "Chat 'Cat-ch up'",
    imageUrl: "/images/avatars/avatar_5.png",
    unlockType: "FREE",
    price: 0,
    sortOrder: 11,
  },
  {
    name: "Renard Joyeux",
    imageUrl: "/images/avatars/avatar_6.png",
    unlockType: "FREE",
    price: 0,
    sortOrder: 12,
  },
  {
    name: "Chiot Champion",
    imageUrl: "/images/avatars/avatar_7.png",
    unlockType: "FREE",
    price: 0,
    sortOrder: 13,
  },
  {
    name: "Serpent Analyste",
    imageUrl: "/images/avatars/avatar_8.png",
    unlockType: "FREE",
    price: 0,
    sortOrder: 14,
  },
  {
    name: "Castor Noteur",
    imageUrl: "/images/avatars/avatar_9.png",
    unlockType: "FREE",
    price: 0,
    sortOrder: 15,
  },
  {
    name: "Paresseux Cyberpunk",
    imageUrl: "/images/avatars/cyber_avatar_1.png",
    unlockType: "COINS",
    price: 500,
    sortOrder: 16,
  },
  {
    name: "Koala Cyberpunk",
    imageUrl: "/images/avatars/cyber_avatar_2.png",
    unlockType: "COINS",
    price: 500,
    sortOrder: 17,
  },
  {
    name: "Panda Cyberpunk",
    imageUrl: "/images/avatars/cyber_avatar_3.png",
    unlockType: "COINS",
    price: 500,
    sortOrder: 18,
  },
  {
    name: "Hibou Cyberpunk",
    imageUrl: "/images/avatars/cyber_avatar_4.png",
    unlockType: "COINS",
    price: 500,
    sortOrder: 19,
  },
  {
    name: "Chat Cyberpunk",
    imageUrl: "/images/avatars/cyber_avatar_5.png",
    unlockType: "COINS",
    price: 500,
    sortOrder: 20,
  },
  {
    name: "Renard Cyberpunk",
    imageUrl: "/images/avatars/cyber_avatar_6.png",
    unlockType: "COINS",
    price: 500,
    sortOrder: 21,
  },
  {
    name: "Chiot Cyberpunk",
    imageUrl: "/images/avatars/cyber_avatar_7.png",
    unlockType: "COINS",
    price: 500,
    sortOrder: 22,
  },
  {
    name: "Serpent Cyberpunk",
    imageUrl: "/images/avatars/cyber_avatar_8.png",
    unlockType: "COINS",
    price: 500,
    sortOrder: 23,
  },
  {
    name: "Castor Cyberpunk",
    imageUrl: "/images/avatars/cyber_avatar_9.png",
    unlockType: "COINS",
    price: 500,
    sortOrder: 24,
  },
  {
    name: "Caneton Curieux",
    imageUrl: "/images/avatars/achievement_avatar_1.png",
    unlockType: "ACHIEVEMENT",
    achievementTitle: "Bienvenue !",
    price: 0,
    sortOrder: 25,
  },
  {
    name: "Hibou Savant",
    imageUrl: "/images/avatars/achievement_avatar_2.png",
    unlockType: "ACHIEVEMENT",
    achievementTitle: "Maître des réponses",
    price: 0,
    sortOrder: 26,
  },
  {
    name: "Hamster Distrait",
    imageUrl: "/images/avatars/achievement_avatar_3.png",
    unlockType: "ACHIEVEMENT",
    achievementTitle: "Ça ira mieux la prochaine fois",
    price: 0,
    sortOrder: 27,
  },
  {
    name: "Raton Novice",
    imageUrl: "/images/avatars/achievement_avatar_4.png",
    unlockType: "ACHIEVEMENT",
    achievementTitle: "Aréniste",
    price: 0,
    sortOrder: 28,
  },
  {
    name: "Chaton Momifié",
    imageUrl: "/images/avatars/achievement_avatar_5.png",
    unlockType: "ACHIEVEMENT",
    achievementTitle: "Alzheimer",
    price: 0,
    sortOrder: 29,
  },
  {
    name: "Guépard Assidu",
    imageUrl: "/images/avatars/achievement_avatar_6.png",
    unlockType: "ACHIEVEMENT",
    achievementTitle: "Dépendance",
    price: 0,
    sortOrder: 30,
  },
  {
    name: "Lion Couronné",
    imageUrl: "/images/avatars/achievement_avatar_7.png",
    unlockType: "ACHIEVEMENT",
    achievementTitle: "Légende de l'arène",
    price: 0,
    sortOrder: 31,
  },
  {
    name: "Raton Érudit",
    imageUrl: "/images/avatars/achievement_avatar_8.png",
    unlockType: "ACHIEVEMENT",
    achievementTitle: "Gladiateur de l'arène",
    price: 0,
    sortOrder: 32,
  },
  {
    name: "Raton Duelliste",
    imageUrl: "/images/avatars/achievement_avatar_9.png",
    unlockType: "ACHIEVEMENT",
    achievementTitle: "Maître du Showdown",
    price: 0,
    sortOrder: 33,
  },
  {
    name: "Écureuil Héroïque",
    imageUrl: "/images/avatars/achievement_avatar_10.png",
    unlockType: "ACHIEVEMENT",
    achievementTitle: "Inoxtag",
    price: 0,
    sortOrder: 34,
  },
  {
    name: "Renard Zen",
    imageUrl: "/images/avatars/achievement_avatar_11.png",
    unlockType: "ACHIEVEMENT",
    achievementTitle: "Incollable",
    price: 0,
    sortOrder: 35,
  },
  {
    name: "Paresseux Quiz Pro",
    imageUrl: "/images/avatars/lazy_avatar_1.png",
    unlockType: "COINS",
    price: 300,
    sortOrder: 36,
  },
  {
    name: "Koala Somnolent",
    imageUrl: "/images/avatars/lazy_avatar_2.png",
    unlockType: "COINS",
    price: 300,
    sortOrder: 37,
  },
  {
    name: "Panda Gamer Violet",
    imageUrl: "/images/avatars/lazy_avatar_3.png",
    unlockType: "COINS",
    price: 300,
    sortOrder: 38,
  },
  {
    name: "Panda Gamer Cyan",
    imageUrl: "/images/avatars/lazy_avatar_4.png",
    unlockType: "COINS",
    price: 300,
    sortOrder: 39,
  },
  {
    name: "Hibou Rêveur Brun",
    imageUrl: "/images/avatars/lazy_avatar_5.png",
    unlockType: "COINS",
    price: 300,
    sortOrder: 40,
  },
  {
    name: "Hibou Assoupi Orange",
    imageUrl: "/images/avatars/lazy_avatar_6.png",
    unlockType: "COINS",
    price: 300,
    sortOrder: 41,
  },
  {
    name: "Chat Gris Apaisé",
    imageUrl: "/images/avatars/lazy_avatar_7.png",
    unlockType: "COINS",
    price: 300,
    sortOrder: 42,
  },
  {
    name: "Chat Orange Apaisé",
    imageUrl: "/images/avatars/lazy_avatar_8.png",
    unlockType: "COINS",
    price: 300,
    sortOrder: 43,
  },
  {
    name: "Renard Quiz Master",
    imageUrl: "/images/avatars/lazy_avatar_9.png",
    unlockType: "COINS",
    price: 300,
    sortOrder: 44,
  },
  {
    name: "Castor Fatigué Bleu",
    imageUrl: "/images/avatars/lazy_avatar_10.png",
    unlockType: "COINS",
    price: 300,
    sortOrder: 45,
  },
  {
    name: "Abeille Endormie Jaune",
    imageUrl: "/images/avatars/lazy_avatar_11.png",
    unlockType: "COINS",
    price: 300,
    sortOrder: 46,
  },
  {
    name: "Abeille Somnolente Orange",
    imageUrl: "/images/avatars/lazy_avatar_12.png",
    unlockType: "COINS",
    price: 300,
    sortOrder: 47,
  },
  {
    name: "Crocodile Neon Gamer",
    imageUrl: "/images/avatars/lazy_avatar_13.png",
    unlockType: "COINS",
    price: 300,
    sortOrder: 48,
  },
  {
    name: "Castor Assoupi Blanc",
    imageUrl: "/images/avatars/lazy_avatar_14.png",
    unlockType: "COINS",
    price: 300,
    sortOrder: 49,
  },
  {
    name: "Castor Fatigué Jaune",
    imageUrl: "/images/avatars/lazy_avatar_15.png",
    unlockType: "COINS",
    price: 300,
    sortOrder: 50,
  },
];

const FRAMES = [
  { name: "Émeraude", styleKey: "emerald", unlockType: "FREE", price: 0, sortOrder: 0 },
  { name: "Néon", styleKey: "neon", unlockType: "COINS", price: 500, sortOrder: 1 },
  { name: "Cyan pulsant", styleKey: "cyan", unlockType: "COINS", price: 750, sortOrder: 2 },
  { name: "Or", styleKey: "gold", unlockType: "COINS", price: 1000, sortOrder: 3 },
  { name: "Flammes", styleKey: "fire", unlockType: "COINS", price: 2000, sortOrder: 4 },
  { name: "Arc-en-ciel", styleKey: "rainbow", unlockType: "ACHIEVEMENT", price: 0, sortOrder: 5 },
  { name: "Cyber Glitch", styleKey: "cyber", unlockType: "COINS", price: 1500, sortOrder: 6 },
  {
    name: "Nébuleuse Cosmique",
    styleKey: "cosmic",
    unlockType: "COINS",
    price: 2500,
    sortOrder: 7,
  },
  {
    name: "Portail de l'Abysse",
    styleKey: "abyss",
    unlockType: "COINS",
    price: 3000,
    sortOrder: 8,
  },
  { name: "Éclat de Diamant", styleKey: "diamond", unlockType: "COINS", price: 4000, sortOrder: 9 },
];

async function main() {
  // Les éléments "ACHIEVEMENT" sont rattachés au premier exploit existant par défaut
  // ou résolus dynamiquement par titre.
  const firstAchievement = await prisma.achievement.findFirst({ orderBy: { id: "asc" } });
  if (!firstAchievement) {
    console.warn("Aucun exploit en base : les cosmétiques liés à un exploit seront ignorés.");
  }

  for (const avatar of AVATARS) {
    let achievementId = null;
    if (avatar.unlockType === "ACHIEVEMENT") {
      if (avatar.achievementTitle) {
        const ach = await prisma.achievement.findFirst({
          where: { title: avatar.achievementTitle },
        });
        if (ach) {
          achievementId = ach.id;
        } else if (firstAchievement) {
          achievementId = firstAchievement.id;
        }
      } else if (firstAchievement) {
        achievementId = firstAchievement.id;
      }
      if (!achievementId) continue;
    }

    const { achievementTitle: _achievementTitle, ...avatarData } = avatar;
    const data = {
      ...avatarData,
      achievementId,
    };

    const existing = await prisma.avatar.findFirst({ where: { name: avatar.name } });
    if (existing) {
      await prisma.avatar.update({ where: { id: existing.id }, data });
    } else {
      await prisma.avatar.create({ data });
    }
  }

  for (const frame of FRAMES) {
    if (frame.unlockType === "ACHIEVEMENT" && !firstAchievement) continue;
    const data = {
      ...frame,
      achievementId: frame.unlockType === "ACHIEVEMENT" ? firstAchievement.id : null,
    };
    await prisma.avatarFrame.upsert({
      where: { styleKey: frame.styleKey },
      update: data,
      create: data,
    });
  }

  console.log(`Seed cosmétiques terminé : ${AVATARS.length} avatars, ${FRAMES.length} cadres.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
