import prisma from "~~/server/utils/prisma";
import type { ResponseDTO } from "#shared/DTO/responseDTO";
import { QuestionDataDTO } from "#shared/question";

export class ResponseService {
  async validateResponse(body: ResponseDTO, userId: string) {
    const question = await prisma.question.findFirst({
      where: { id: body.questionId },
    });

    if (!question?.data) return;

    const success = (question.data as unknown as QuestionDataDTO).response == body.userResponseId;

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
      const userProgress = await this.updateUserProgress(userId, question.xp_earned, successCount);
      return {
        success,
        xpEarned: userProgress.xpEarned,
        xpTot: userProgress.xpTot,
        previousLevel: userProgress.previousLevel,
        newLevel: userProgress.currentLevel,
      };
    } else return;
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
