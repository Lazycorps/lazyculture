import prisma from "~~/server/utils/prisma";
import type { ResponseDTO } from "#shared/DTO/responseDTO";
import { isCorrectAnswer } from "~~/server/services/QuestionService";
import { coinsFromXp, grantCoins } from "~~/server/utils/walletHelper";

export class ResponseService {
  async validateResponse(body: ResponseDTO, userId: string) {
    const question = await prisma.question.findFirst({
      where: { id: body.questionId },
    });

    if (!question?.data) return;

    const success = isCorrectAnswer(question, body.userResponseId);

    await prisma.questionResponse.create({
      data: {
        userId,
        questionId: question.id,
        success: success,
        date: new Date(),
      },
    });

    const successCount = await prisma.questionResponse.count({
      where: {
        questionId: question.id,
        userId,
        success: true,
        date: {
          gt: new Date("2024-09-08"),
        },
      },
    });

    const questionData = question.data as any;
    const responseResult = {
      success,
      correctResponseId: questionData.response as number,
      commentaire: (questionData.commentaire as string) || "",
      commentaireImg: (questionData.commentaireImg as string) || "",
      xpEarned: 0,
      xpTot: 0,
      previousLevel: 0,
      newLevel: 0,
      coinsEarned: 0,
    };

    if (success) {
      const userProgress = await this.updateUserProgress(userId, question.xp_earned, successCount);
      responseResult.xpEarned = (userProgress.xpEarned ??
        (userProgress as any).userXpWin ??
        0) as number;
      responseResult.xpTot = (userProgress.xpTot ?? 0) as number;
      responseResult.previousLevel = (userProgress.previousLevel ?? 1) as number;
      responseResult.newLevel = (userProgress.currentLevel ?? 1) as number;
      responseResult.coinsEarned = coinsFromXp(responseResult.xpEarned);
      await grantCoins(userId, responseResult.coinsEarned);
    }

    return responseResult;
  }

  private async updateUserProgress(userId: string, xpEarned: number, successCount: number) {
    const userProgress = await prisma.userProgress.findFirst({
      where: { userId: userId },
    });

    const userXpWin = successCount == 0 ? xpEarned : Math.ceil(xpEarned / successCount);

    if (userProgress) {
      const userXpTot = userProgress.xp + userXpWin;
      const level = await prisma.level.findFirst({
        where: { xp_threshold: { lte: userXpTot } },
        orderBy: { xp_threshold: "desc" },
      });
      const updateUser = await prisma.userProgress.update({
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
      return {
        xpEarned: userXpWin,
        xpTot: updateUser.xp,
        previousLevel: userProgress.levelId,
        currentLevel: updateUser.levelId,
      };
    } else {
      const level = await prisma.level.findFirst({
        where: { xp_threshold: { gte: userXpWin } },
        orderBy: { xp_threshold: "asc" },
      });
      const userProgressCreated = await prisma.userProgress.create({
        data: {
          userId: userId,
          xp: userXpWin,
          levelId: level?.id ?? 1,
        },
      });

      return {
        userXpWin,
        xpTot: userXpWin,
        previousLevel: userProgressCreated.levelId,
        currentLevel: userProgressCreated.levelId,
      };
    }
  }
}

export const responseService = new ResponseService();
