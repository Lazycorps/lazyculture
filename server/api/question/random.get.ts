import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const randomQuestion: any =
    await prisma.$queryRaw`SELECT * FROM "Question" ORDER BY RANDOM() LIMIT 1;`;
  return randomQuestion[0];
});
