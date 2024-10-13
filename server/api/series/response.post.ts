import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { QuestionDataDTO } from "~/models/question";
import prisma from "~/lib/prisma";
import {
  QuestionSeriesResponseData,
  QuestionSeriesResponseDataResponse,
} from "~/models/series";
import { SeriesResponseDTO } from "~/models/DTO/seriesResponseDTO";

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const userConnected = (await client.auth.getUser())?.data?.user;
  if (!userConnected) return;
  const body = await readBody<SeriesResponseDTO>(event);
  const question = await prisma.question.findFirst({
    where: { id: body.questionId },
  });

  if (!question?.data) return;

  const success =
    (question.data as unknown as QuestionDataDTO).response ==
    body.userResponseId;

  const series = await prisma.questionSeries.findFirst({
    where: { id: body.seriesId },
  });
  if (!series) return;

  const seriesResponse = await prisma.questionSeriesResponse.findFirst({
    where: { seriesId: body.seriesId, userId: userConnected.id },
  });

  const seriesResponseToAdd: QuestionSeriesResponseDataResponse = {
    questionId: body.questionId,
    responseId: body.userResponseId,
    success,
    elapsedTime: 0,
  };

  if (!seriesResponse) {
    return await prisma.questionSeriesResponse.create({
      data: {
        seriesId: body.seriesId,
        userId: userConnected.id,
        data: {
          responses: [seriesResponseToAdd as any],
        },
      },
    });
  } else {
    const responseData =
      seriesResponse.data as any as QuestionSeriesResponseData;
    responseData.responses.push(seriesResponseToAdd);
    return await prisma.questionSeriesResponse.update({
      where: { id: seriesResponse.id },
      data: {
        data: responseData as any,
        updateDate: new Date(),
      },
    });
  }
});
