import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const questions = await prisma.question.findFirst();
  return questions;
});
