import { PrismaClient } from "@prisma/client";
import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  return prisma.questionTheme.findMany();
});
