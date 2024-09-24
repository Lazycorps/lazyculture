import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  return await prisma.userProgress.findMany({
    include: {
      user: true,
    },
    orderBy: [{ xp: "desc" }],
    take: 20,
  });
});
