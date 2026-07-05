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
];

const FRAMES = [
  { name: "Émeraude", styleKey: "emerald", unlockType: "FREE", price: 0, sortOrder: 0 },
  { name: "Néon", styleKey: "neon", unlockType: "COINS", price: 500, sortOrder: 1 },
  { name: "Cyan pulsant", styleKey: "cyan", unlockType: "COINS", price: 750, sortOrder: 2 },
  { name: "Or", styleKey: "gold", unlockType: "COINS", price: 1000, sortOrder: 3 },
  { name: "Flammes", styleKey: "fire", unlockType: "COINS", price: 2000, sortOrder: 4 },
  { name: "Arc-en-ciel", styleKey: "rainbow", unlockType: "ACHIEVEMENT", price: 0, sortOrder: 5 },
];

async function main() {
  // Les éléments "ACHIEVEMENT" sont rattachés au premier exploit existant ;
  // à ajuster ensuite depuis l'admin (/admin/cosmetics).
  const firstAchievement = await prisma.achievement.findFirst({ orderBy: { id: "asc" } });
  if (!firstAchievement) {
    console.warn("Aucun exploit en base : les cosmétiques liés à un exploit seront ignorés.");
  }

  for (const avatar of AVATARS) {
    if (avatar.unlockType === "ACHIEVEMENT" && !firstAchievement) continue;
    const data = {
      ...avatar,
      achievementId: avatar.unlockType === "ACHIEVEMENT" ? firstAchievement.id : null,
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
