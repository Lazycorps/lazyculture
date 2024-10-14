import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { QuestionDataDTO } from "~/models/question";
import prisma from "~/lib/prisma";
import {
  QuestionSeriesData,
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
    const countSeriesQuestions = (series.data as any as QuestionSeriesData)
      .questionsIds.length;
    const seriesAlreadyEnded =
      responseData.responses.length == countSeriesQuestions;
    if (seriesAlreadyEnded) return;
    responseData.responses.push(seriesResponseToAdd);
    const countResponse = responseData.responses.length;
    const countSuccessResponse = responseData.responses.filter(
      (c) => c.success
    ).length;
    const seriesEnded = countResponse == countSeriesQuestions;
    let xpEarned = 0;
    if (seriesEnded) {
      xpEarned = await calculUserXP(
        countResponse,
        countSeriesQuestions,
        countSuccessResponse,
        userConnected.id
      );
    }

    responseData.xpEarned = xpEarned;
    responseData.score =
      Math.round(
        ((countResponse / countSeriesQuestions) * 10 + Number.EPSILON) * 100
      ) / 100;

    return await prisma.questionSeriesResponse.update({
      where: { id: seriesResponse.id },
      data: {
        data: responseData as any,
        updateDate: new Date(),
      },
    });
  }
});

const calculUserXP = async (
  countResponse: number,
  countSeriesQuestions: number,
  countSuccessResponse: number,
  userId: string
) => {
  const multiplicator = 10 * (1 + countResponse / countSeriesQuestions);
  const userXpWin = Math.ceil(countSuccessResponse * multiplicator);

  const userProgress = await prisma.userProgress.findFirst({
    where: { userId: userId },
  });

  if (userProgress) {
    const userXpTot = userProgress.xp + userXpWin;
    const level = await prisma.level.findFirst({
      where: { xp_threshold: { lte: userXpTot } },
      orderBy: { xp_threshold: "desc" },
    });
    await prisma.userProgress.update({
      where: {
        userId: userId,
      },
      data: {
        xp: {
          increment: userXpWin,
        },
        levelId: level?.id,
      },
    });
  }

  return userXpWin;
};
