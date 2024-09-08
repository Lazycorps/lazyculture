import { PrismaClient } from "@prisma/client";
import { serverSupabaseUser } from "#supabase/server";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const userConnected = await serverSupabaseUser(event);
  if (userConnected == null) return;

  const user = await prisma.user.findFirst({
    where: { id: userConnected.id },
    include: { UserProgress: { include: { level: true}} },
  });
  let nextLevelTreshold = 100;
  if (user?.UserProgress?.levelId) {
    const nextLevel = await prisma.level.findFirst({
      where: { id: user.UserProgress.levelId + 1 },
      include: { UserProgress: true },
    });
    nextLevelTreshold = nextLevel?.xp_threshold ?? 100;
  }
  return {
    ...user,
    email: userConnected.email,
    nextLevelTreshold,
  };
});
