import { PrismaClient } from "@prisma/client";
import { serverSupabaseClient } from "#supabase/server";
import { QuestionDataDTO } from "~/models/question";
import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const userConnected = (await client.auth.getUser())?.data?.user;
  const query = getQuery(event);
  let ids = await getRandomQuestionsIds(
    query.theme as string,
    userConnected?.id
  );
  if (ids.length == 0) ids = await getRandomQuestionsIds(query.theme as string);
  const id = getRandomId(ids);
  const question = await prisma.question.findFirst({ where: { id: id, deleted: false } });
  if (question) {
    const questionData = question.data as any as QuestionDataDTO;
    questionData.propositions = shuffleArray(questionData.propositions);
    const questionThemes = questionData.theme;
    const themes = await prisma.questionTheme.findMany({
      where: { slug: { in: questionThemes } },
    });

    return {
      ...question,
      themes: themes.map((t) => t.name),
    };
  }
});

const getRandomQuestionsIds = async (theme?: string, userId?: string) => {
  return await prisma.question.findMany({
    where: {
      ...(theme && {
        data: {
          path: ["theme"],
          array_contains: theme as string,
        },
      }),
      ...(userId && {
        Response: {
          none: {
            userId: userId,
            success: true,
          },
        },
      }),
    },
    select: {
      id: true,
    },
  });
};

const getRandomId = (ids: { id: number }[]) => {
  const randomIndex = Math.floor(Math.random() * ids.length);
  return ids[randomIndex].id;
};

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Échange des éléments
  }
  return array;
}