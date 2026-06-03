import { Prisma } from "@prisma/client";
import { QuestionDataDTO } from "~/models/question";
import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig();

  // Vérification de l'authentification : Clé API ou Session Admin
  const apiKey = event.headers.get("x-api-key");
  let isAuthenticated = apiKey === runtimeConfig.apiKey;

  if (!isAuthenticated) {
    const userConnected = event.context.user;
    if (userConnected) {
      const user = await prisma.user.findUnique({ where: { id: userConnected.id } });
      if (user?.admin) {
        isAuthenticated = true;
      }
    }
  }

  if (!isAuthenticated) {
    setResponseStatus(event, 401);
    return { error: "Non autorisé" };
  }

  const questions = await readBody<QuestionDataDTO[]>(event);

  const questionsToAdd: Prisma.QuestionCreateInput[] = [];
  questions.forEach((q) => {
    const question: Prisma.QuestionCreateInput = {
      difficulty: q.difficulty,
      data: q as any,
      source: "ChatGpt",
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
