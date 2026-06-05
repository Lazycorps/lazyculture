import prisma from "~/lib/prisma";
import { getRankFromPoints } from "~/server/utils/rankHelper";

export default defineEventHandler(async (event) => {
  const userConnected = event.context.user;
  console.log(
    "[/api/user/current] event.context.user:",
    userConnected?.id ?? null,
    userConnected?.email ?? null,
  );
  if (userConnected == null) return null;
  let user = await prisma.user.findFirst({
    where: { id: userConnected?.id },
    include: {
      UserProgress: { include: { level: true } },
      BattleRoyaleRank: true,
    },
  });

  console.log("[/api/user/current] prisma user found:", user?.id ?? null, "admin:", user?.admin);

  if (user == null) {
    user = await prisma.user.create({
      data: {
        id: userConnected.id,
        name: "",
        slug: "",
        createDate: new Date(),
        updateDate: new Date(),
      },
      include: {
        UserProgress: { include: { level: true } },
        BattleRoyaleRank: true,
      },
    });
  }

  let nextLevelTreshold = 100;
  if (user?.UserProgress?.levelId) {
    const nextLevel = await prisma.level.findFirst({
      where: { id: user.UserProgress.levelId + 1 },
      include: { UserProgress: true },
    });
    nextLevelTreshold = nextLevel?.xp_threshold ?? 100;
  }
  const brRank = user.BattleRoyaleRank || { points: 0, wins: 0, gamesPlayed: 0 };
  const rankInfo = getRankFromPoints(brRank.points);

  return {
    ...user,
    email: userConnected.email,
    nextLevelTreshold,
    brRank: {
      points: brRank.points,
      wins: brRank.wins,
      gamesPlayed: brRank.gamesPlayed,
      rankInfo,
    },
  };
});
