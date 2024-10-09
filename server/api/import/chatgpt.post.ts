import { Prisma } from "@prisma/client";
import { QuestionDataDTO } from "~/models/question";
import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig();
  if (event.headers.get("x-api-key") != runtimeConfig.apiKey) {
    setResponseStatus(event, 401);
    return;
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
