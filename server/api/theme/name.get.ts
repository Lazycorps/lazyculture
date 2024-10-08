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
  const query = getQuery(event);
  return prisma.questionTheme.findFirst({
    where: { slug: query.theme as string },
  });
});
