import { PrismaClient } from "@prisma/client";
import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  return prisma.questionTheme.findFirst({
    where: { slug: query.theme as string },
  });
});
