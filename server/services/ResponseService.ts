import prisma from "~~/server/utils/prisma";
import type { ResponseDTO } from "#shared/DTO/responseDTO";
import { isCorrectAnswer } from "~~/server/services/QuestionService";
import { coinsFromXp, grantCoins } from "~~/server/utils/walletHelper";
import { dailyRewardService } from "~~/server/services/DailyRewardService";

const DAILY_REWARD_CAP = 150;

export class ResponseService {
  async validateResponse(body: ResponseDTO, userId?: string, bypassDailyCap = false) {
    const question = await prisma.question.findFirst({
      where: { id: body.questionId },
    });

    if (!question?.data) return;

    const success = isCorrectAnswer(question, body.userResponseId);

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

    if (userId) {
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

      if (success) {
        // Incrémente la progression de la quête quotidienne
        await dailyRewardService.incrementQuestProgress(userId, "ANSWER_QUESTIONS", 1);

        let isCapped = false;
        if (!bypassDailyCap) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dailyAnswersCount = await prisma.questionResponse.count({
            where: {
              userId,
              date: {
                gte: today,
              },
            },
          });
          if (dailyAnswersCount > DAILY_REWARD_CAP) {
            isCapped = true;
          }
        }

        if (isCapped) {
          const userProgress = await prisma.userProgress.findFirst({
            where: { userId },
          });
          responseResult.xpEarned = 0;
          responseResult.xpTot = userProgress?.xp ?? 0;
          responseResult.previousLevel = userProgress?.levelId ?? 1;
          responseResult.newLevel = userProgress?.levelId ?? 1;
          responseResult.coinsEarned = 0;
        } else {
          const multiplier = await dailyRewardService.getActivityStreakMultiplier(userId);
          const userProgress = await this.updateUserProgress(
            userId,
            question.xp_earned,
            successCount,
            multiplier,
          );
          responseResult.xpEarned = (userProgress.xpEarned ??
            (userProgress as any).userXpWin ??
            0) as number;
          responseResult.xpTot = (userProgress.xpTot ?? 0) as number;
          responseResult.previousLevel = (userProgress.previousLevel ?? 1) as number;
          responseResult.newLevel = (userProgress.currentLevel ?? 1) as number;
          responseResult.coinsEarned = coinsFromXp(responseResult.xpEarned);
          // grantCoins applies the multiplier by default, but since responseResult.xpEarned is already multiplied
          // and coinsFromXp is computed from it, we pass applyMultiplier = false to avoid double multiplication.
          await grantCoins(userId, responseResult.coinsEarned, true, false);
        }
      }
    }

    return responseResult;
  }

  private async updateUserProgress(
    userId: string,
    xpEarned: number,
    successCount: number,
    multiplier = 1.0,
  ) {
    const userProgress = await prisma.userProgress.findFirst({
      where: { userId: userId },
    });

    const baseXp = successCount == 0 ? xpEarned : Math.ceil(xpEarned / successCount);
    const userXpWin = Math.ceil(baseXp * multiplier);

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
