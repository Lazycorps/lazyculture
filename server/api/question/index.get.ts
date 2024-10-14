import prisma from "~/lib/prisma";
import { QuestionDataDTO } from "~/models/question";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  if (!query.id) return;
  const question = await prisma.question.findFirst({
    where: { id: +query.id },
  });

  if (question) {
    const questionThemes = (question.data as any as QuestionDataDTO).theme;
    const themes = await prisma.questionTheme.findMany({
      where: { slug: { in: questionThemes } },
    });

    return {
      ...question,
      themes: themes.map((t) => t.name),
    };
  }
});
