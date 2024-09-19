import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    return prisma.questionTheme.findFirst({
        where: { slug: query.theme as string}
      });
});
