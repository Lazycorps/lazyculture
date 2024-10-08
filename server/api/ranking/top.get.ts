import { PrismaClient } from "@prisma/client";
const config = useRuntimeConfig();
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
});

export default defineEventHandler(async (event) => {
  return await prisma.userProgress.findMany({
    include: {
      user: true,
    },
    orderBy: [{ xp: "desc" }],
    take: 20,
  });
});
