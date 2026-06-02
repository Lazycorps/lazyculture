import prisma from "~/lib/prisma";
import { QuestionDataDTO, QuestionDTO, QuestionReportingDTO } from "~/models/question";
import { getAuthenticatedUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const user = await prisma.user.findUnique({ where: { id: userConnected?.id } });
  if (!user?.admin) {
    setResponseStatus(event, 403);
    return { error: "Vous n'avez pas les droits pour réaliser cette opération" };
  }
  const query = getQuery(event);

  await prisma.question.update({
    where: {
      id: parseInt(query.id as string, 10),
    },
    data: { deleted: true },
  });
});
