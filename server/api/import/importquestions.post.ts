import { Prisma } from "@prisma/client";
import { QuestionDataDTO } from "~/models/question";
import prisma from "~/lib/prisma";
import { getAuthenticatedUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const user = await prisma.user.findUnique({ where: { id: userConnected?.id } });
  if (!user?.admin) {
    setResponseStatus(event, 403);
    return { error: "Vous n'avez pas les droits pour réaliser cette opération" };
  }

  const questions = await readBody<QuestionDataDTO[]>(event);

  const questionsToAdd: Prisma.QuestionCreateInput[] = [];
  questions.forEach((q) => {
    const question: Prisma.QuestionCreateInput = {
      difficulty: q.difficulty,
      data: q as any,
      source: "ImportQuestions",
      language: "fr",
      createDate: new Date(),
      updateDate: new Date(),
      userCreate: "IMPORT",
      userUpdate: "IMPORT",
    };
    questionsToAdd.push(question);
  });
  return prisma.question.createManyAndReturn({
    data: questionsToAdd as Prisma.QuestionCreateInput[],
  });
});
