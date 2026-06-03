import type { QuestionDataDTO } from "~/models/question";
import prisma from "~/lib/prisma";
import type {
  QuestionSeriesData,
  QuestionSeriesDTO,
  QuestionSeriesResponseDataResponse,
} from "~/models/series";
import type { SeriesResponseDTO } from "~/models/DTO/seriesResponseDTO";
import type { QuestionSeriesAscensionResponseData } from "~/models/series/seriesAscension";
import { getAuthenticatedUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<SeriesResponseDTO>(event);
  const question = await prisma.question.findFirst({
    where: { id: body.questionId },
  });

  if (!question?.data) return;

  const success = (question.data as unknown as QuestionDataDTO).response == body.userResponseId;

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
    const currentHealthPoint = success ? seriesHealtPoint : seriesHealtPoint - 1;
    const seriesEnded = currentHealthPoint == 0;
    return await prisma.questionSeriesResponse.create({
      data: {
        seriesId: body.seriesId,
        userId: userConnected.id,
        result: 0,
        seriesType: "ascent",
        data: {
          responses: [seriesResponseToAdd as any],
          healthPoint: currentHealthPoint,
          ended: seriesEnded,
          nextQuestion: (series.data as any as QuestionSeriesData).questionsIds[1],
          seriesType: "ascent",
        },
      },
    });
  } else {
    const responseData = seriesResponse.data as any as QuestionSeriesAscensionResponseData;
    //Si la question envoyé est != de la question suivante pas normal ! CHEAT !
    if (body.questionId != responseData.nextQuestion) return seriesResponse;
    const userHealthPoint = responseData.healthPoint;
    responseData.healthPoint = success ? userHealthPoint : userHealthPoint - 1;
    const countSeriesQuestions = series.data.questionsIds.length;
    const seriesAlreadyEnded = responseData.responses.length == countSeriesQuestions;
    if (seriesAlreadyEnded) return;

    responseData.responses.push(seriesResponseToAdd);
    const countResponse = responseData.responses.length;
    const countSuccessResponse = responseData.responses.filter((c) => c.success).length;

    responseData.ended =
      responseData.healthPoint == 0 ||
      responseData.responses.length >= series.data.questionsIds.length;

    let xpEarned = 0;
    if (responseData.ended) {
      xpEarned = await calculUserXP(countSuccessResponse, userConnected.id);
    }

    responseData.xpEarned = xpEarned;
    responseData.score = countSuccessResponse;

    responseData.nextQuestion =
      (series.data as any as QuestionSeriesData).questionsIds[countResponse] ?? 0;

    return await prisma.questionSeriesResponse.update({
      where: { id: seriesResponse.id },
      data: {
        data: responseData as any,
        updateDate: new Date(),
        result: countSuccessResponse,
        seriesType: "ascent",
      },
    });
  }
});

const calculUserXP = async (countSuccessResponse: number, userId: string) => {
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
