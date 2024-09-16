import { PrismaClient } from "@prisma/client";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { ReportingDTO } from "~/models/DTO/reportingDTO";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const userConnected = (await client.auth.getUser())?.data?.user;
  if (!userConnected) return;
  
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
      commentaire: 'Question à vérifier'
    },
  });
});
