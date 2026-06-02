import { ReportingDTO } from "~/models/DTO/reportingDTO";
import prisma from "~/lib/prisma";
import { getAuthenticatedUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);

  const body = await readBody<ReportingDTO>(event);
  const question = await prisma.question.findFirst({
    where: { id: body.questionId },
  });

  if (!question?.data) return;

  await prisma.questionReporting.create({
    data: {
      userId: userConnected.id,
      questionId: body.questionId,
      closed: false,
      commentaire: body.comment,
    },
  });
});
