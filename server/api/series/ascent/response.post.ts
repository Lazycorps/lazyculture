import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { QuestionDataDTO } from "~/models/question";
import prisma from "~/lib/prisma";
import {
  QuestionSeriesData,
  QuestionSeriesDTO,
  QuestionSeriesResponseDataResponse,
} from "~/models/series";
import { SeriesResponseDTO } from "~/models/DTO/seriesResponseDTO";
import { QuestionSeriesAscensionResponseData } from "~/models/series/seriesAscension";

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

  const series = (await prisma.questionSeries.findFirst({
    where: { id: body.seriesId },
  })) as QuestionSeriesDTO;
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
    const seriesHealtPoint = (series.data as QuestionSeriesData).healthPoint;
    const currentHealthPoint = success
      ? seriesHealtPoint
      : seriesHealtPoint - 1;
    const seriesEnded = currentHealthPoint == 0;
    return await prisma.questionSeriesResponse.create({
      data: {
        seriesId: body.seriesId,
        userId: userConnected.id,
        data: {
          responses: [seriesResponseToAdd as any],
          healthPoint: currentHealthPoint,
          ended: seriesEnded,
          nextQuestion: (series.data as any as QuestionSeriesData)
            .questionsIds[1],
          seriesType: "ascent",
        },
      },
    });
  } else {
    const responseData =
      seriesResponse.data as any as QuestionSeriesAscensionResponseData;
    //Si la question envoyé est != de la question suivante pas normal ! CHEAT !
    if (body.questionId != responseData.nextQuestion) return seriesResponse;
    const userHealthPoint = responseData.healthPoint;
    responseData.healthPoint = success ? userHealthPoint : userHealthPoint - 1;
    const countSeriesQuestions = series.data.questionsIds.length;
    const seriesAlreadyEnded =
      responseData.responses.length == countSeriesQuestions;
    if (seriesAlreadyEnded) return;

    responseData.responses.push(seriesResponseToAdd);
    const countResponse = responseData.responses.length;
    const countSuccessResponse = responseData.responses.filter(
      (c) => c.success
    ).length;

    responseData.ended =
      responseData.healthPoint == 0 ||
      responseData.responses.length >= series.data.questionsIds.length;

    let xpEarned = 0;
    if (responseData.ended) {
      xpEarned = await calculUserXP(
        countSeriesQuestions,
        countSuccessResponse,
        userConnected.id
      );
    }

    responseData.xpEarned = xpEarned;
    responseData.score = countSuccessResponse;

    responseData.nextQuestion = (
      series.data as any as QuestionSeriesData
    ).questionsIds[countResponse];

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
  countSeriesQuestions: number,
  countSuccessResponse: number,
  userId: string
) => {
  const fiveXp = Math.floor(countSuccessResponse / 5) * 20;
  const tenXp = Math.floor(countSuccessResponse / 10) * 40;
  const twentyFiveXp = Math.floor(countSuccessResponse / 25) * 100;
  const fiftyXp = Math.floor(countSuccessResponse / 50) * 200;
  const hundredXp = Math.floor(countSuccessResponse / 100) * 500;
  const userXpWin = fiveXp + tenXp + twentyFiveXp + fiftyXp + hundredXp;

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
