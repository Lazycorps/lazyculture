import { PrismaClient } from "@prisma/client";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { ResponseDTO } from "~/models/DTO/responseDTO";
import { QuestionDataDTO } from "~/models/question";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const userConnected = (await client.auth.getUser())?.data?.user;
  if (!userConnected) return;
  const body = await readBody<ResponseDTO>(event);
  const question = await prisma.question.findFirst({
    where: { id: body.questionId },
  });

  if (!question?.data) return;

  const success =
    (question.data as unknown as QuestionDataDTO).response ==
    body.userResponseId;

  await prisma.questionResponse.create({
    data: {
      userId: userConnected.id,
      questionId: body.questionId,
      success: success,
      date: new Date(),
    },
  });

  return;
});