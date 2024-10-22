import prisma from "~/lib/prisma";
export async function updateUserProgress(userId: string, xpEarned: number) {
  const userProgress = await prisma.userProgress.findFirst({
    where: { userId: userId },
  });

  if (userProgress) {
    const userXpTot = userProgress.xp + xpEarned;
    const level = await prisma.level.findFirst({
      where: { xp_threshold: { lte: userXpTot } },
      orderBy: { xp_threshold: "desc" },
    });
    const updateUser = await prisma.userProgress.update({
      where: {
        userId: userId,
      },
      data: {
        xp: {
          increment: xpEarned,
        },
        levelId: level?.id,
      },
    });
    return {
      xpEarned: xpEarned,
      xpTot: updateUser.xp,
      previousLevel: userProgress.levelId,
      currentLevel: updateUser.levelId,
    };
  } else {
    const level = await prisma.level.findFirst({
      where: { xp_threshold: { gte: xpEarned } },
      orderBy: { xp_threshold: "asc" },
    });
    await prisma.userProgress.create({
      data: {
        userId: userId,
        xp: xpEarned,
        levelId: level?.id ?? 1,
      },
    });
  }
}
