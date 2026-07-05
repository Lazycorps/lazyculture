import prisma from "~~/server/utils/prisma";
import { responseService } from "~~/server/services/ResponseService";
import { coinsFromXp, grantCoins } from "~~/server/utils/walletHelper";

export class AdventureService {
  /**
   * Generates an Adventure path based on all non-deleted questions matching themeSlug
   */
  async generatePath(title: string, themeSlug: string) {
    // 1. Fetch non-deleted questions belonging to the theme slug
    const questions = await prisma.question.findMany({
      where: {
        deleted: false,
        data: {
          path: ["theme"],
          array_contains: themeSlug,
        },
      },
      select: {
        id: true,
        difficulty: true,
      },
    });

    const totalAvailable = questions.length;

    // 2. Enforce minimum of 20 questions (needed for 1 block of 4 steps + 1 control)
    if (totalAvailable < 20) {
      throw createError({
        statusCode: 400,
        statusMessage: `Ce thème ne contient que ${totalAvailable} questions. Il faut au moins 20 questions pour générer une Adventure.`,
      });
    }

    // 3. Determine the maximum number of blocks we can build (multiple of 20 questions)
    const numBlocks = Math.floor(totalAvailable / 20);
    const totalQuestionsNeeded = numBlocks * 20;
    const numSteps = numBlocks * 4;

    // 4. Implement Balanced Difficulty Algorithm
    // Sort all questions by difficulty
    questions.sort((a, b) => a.difficulty - b.difficulty);

    // Shuffle within similar difficulty tiers (optional, but keeps path diverse)
    // We slice the list into totalQuestionsNeeded questions to distribute them
    const selectedQuestions = questions.slice(0, totalQuestionsNeeded);

    // Split into 5 buckets of equal size S (numSteps)
    const bucketSize = numSteps;
    const bucket1 = this.shuffleArray(selectedQuestions.slice(0, bucketSize));
    const bucket2 = this.shuffleArray(selectedQuestions.slice(bucketSize, bucketSize * 2));
    const bucket3 = this.shuffleArray(selectedQuestions.slice(bucketSize * 2, bucketSize * 3));
    const bucket4 = this.shuffleArray(selectedQuestions.slice(bucketSize * 3, bucketSize * 4));
    const bucket5 = this.shuffleArray(
      selectedQuestions.slice(bucketSize * 4, totalQuestionsNeeded),
    );

    // 5. Construct stage sequence
    const stagesData = [];
    let sequence = 1;
    let controlCount = 0;
    let examCount = 0;
    let stepIndex = 0;

    while (stepIndex < numSteps) {
      // Add a block of up to 4 normal steps
      for (let j = 0; j < 4 && stepIndex < numSteps; j++) {
        const stepNum = stepIndex + 1;
        const stageQuestionIds = [
          bucket1[stepIndex]!.id,
          bucket2[stepIndex]!.id,
          bucket3[stepIndex]!.id,
          bucket4[stepIndex]!.id,
          bucket5[stepIndex]!.id,
        ];
        stagesData.push({
          sequence: sequence++,
          type: "STEP",
          title: `Étape ${stepNum}`,
          questionIds: stageQuestionIds,
        });
        stepIndex++;
      }

      // Add a Contrôle stage after every 4 steps
      controlCount++;
      stagesData.push({
        sequence: sequence++,
        type: "CONTROL",
        title: `Contrôle ${controlCount}`,
        questionIds: [],
      });

      // Add an Examen stage after every 5 Contrôles (every 20 steps)
      if (controlCount % 5 === 0) {
        examCount++;
        stagesData.push({
          sequence: sequence++,
          type: "EXAM",
          title: `Examen ${examCount}`,
          questionIds: [],
        });
      }
    }

    // 6. Create the adventure path in the database with nested stages
    const newPath = await prisma.adventure.create({
      data: {
        title,
        themeSlug,
        stages: {
          create: stagesData,
        },
      },
      include: {
        stages: true,
      },
    });

    return newPath;
  }

  /**
   * Delete an adventure path
   */
  async deletePath(id: number) {
    return prisma.adventure.delete({
      where: { id },
    });
  }

  /**
   * Fetch paths with progression for the current user
   */
  async getPathsAndProgress(userId: string) {
    const paths = await prisma.adventure.findMany({
      orderBy: { createDate: "desc" },
      include: {
        stages: {
          select: { sequence: true },
        },
        progresses: {
          where: { userId },
        },
      },
    });

    return paths.map((path) => {
      const userProgress = path.progresses[0];
      const maxStage = Math.max(...path.stages.map((s) => s.sequence), 0);
      return {
        id: path.id,
        title: path.title,
        themeSlug: path.themeSlug,
        createDate: path.createDate,
        totalStages: maxStage,
        currentStage: userProgress ? userProgress.currentStage : 1,
        completed: userProgress ? userProgress.completed : false,
      };
    });
  }

  /**
   * Get detailed questions for a stage (checks unlock status)
   */
  async getStageQuestions(userId: string, adventureId: number, sequence: number) {
    const progress = await prisma.userAdventureProgress.findUnique({
      where: { userId_adventureId: { userId, adventureId } },
    });

    const currentUnlocked = progress?.currentStage ?? 1;
    const completed = progress?.completed ?? false;

    // Check if stage is unlocked
    if (sequence > currentUnlocked && !completed) {
      throw createError({
        statusCode: 403,
        statusMessage: "Cette étape est encore verrouillée.",
      });
    }

    const stage = await prisma.adventureStage.findFirst({
      where: { adventureId, sequence },
    });

    if (!stage) {
      throw createError({
        statusCode: 404,
        statusMessage: "Étape non trouvée.",
      });
    }

    let targetQuestionIds: number[] = [];

    if (stage.type === "STEP") {
      targetQuestionIds = stage.questionIds;
    } else if (stage.type === "CONTROL") {
      // Pick 10 random questions from preceding 4 steps
      const precedingSteps = await prisma.adventureStage.findMany({
        where: {
          adventureId,
          sequence: { lt: sequence },
          type: "STEP",
        },
        orderBy: { sequence: "desc" },
        take: 4,
      });
      const allIds = precedingSteps.flatMap((s) => s.questionIds);
      targetQuestionIds = this.shuffleArray(allIds).slice(0, 10);
    } else if (stage.type === "EXAM") {
      // Pick 20 random questions from ALL preceding steps in the entire path
      const precedingSteps = await prisma.adventureStage.findMany({
        where: {
          adventureId,
          sequence: { lt: sequence },
          type: "STEP",
        },
      });
      const allIds = precedingSteps.flatMap((s) => s.questionIds);
      targetQuestionIds = this.shuffleArray(allIds).slice(0, 20);
    }

    // Fetch non-deleted questions from database
    const questions = await prisma.question.findMany({
      where: { id: { in: targetQuestionIds }, deleted: false },
    });

    const themeSlugs = Array.from(
      new Set(questions.flatMap((q) => (q.data as any)?.theme || [])),
    ) as string[];

    const themes = await prisma.questionTheme.findMany({
      where: { slug: { in: themeSlugs } },
    });

    const themeMap = new Map(themes.map((t) => [t.slug, t.name]));

    const formattedQuestions = questions.map((q) => {
      const qData = JSON.parse(JSON.stringify(q.data)); // Deep clone JSON
      if (qData && Array.isArray(qData.propositions)) {
        qData.propositions = this.shuffleArray(qData.propositions);
      }
      const qThemes = (qData?.theme || []).map((slug: string) => themeMap.get(slug) || slug);

      return {
        ...q,
        data: qData,
        themes: qThemes,
      };
    });

    // Return the questions in a randomized order
    return this.shuffleArray(formattedQuestions);
  }

  /**
   * Validates stage results and updates user progress if threshold is met
   */
  async completeStage(
    userId: string,
    adventureId: number,
    sequence: number,
    answers: Record<number, number>,
  ) {
    const progress = await prisma.userAdventureProgress.findUnique({
      where: { userId_adventureId: { userId, adventureId } },
    });

    const currentUnlocked = progress?.currentStage ?? 1;
    const completed = progress?.completed ?? false;

    // Verify stage is unlocked
    if (sequence > currentUnlocked && !completed) {
      throw createError({
        statusCode: 403,
        statusMessage: "Cette étape est encore verrouillée.",
      });
    }

    const stage = await prisma.adventureStage.findFirst({
      where: { adventureId, sequence },
    });

    if (!stage) {
      throw createError({
        statusCode: 404,
        statusMessage: "Étape non trouvée.",
      });
    }

    // 1. Fetch questions to evaluate score
    const questionIdsSubmitted = Object.keys(answers).map(Number);
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIdsSubmitted } },
    });

    let correctCount = 0;
    const totalQuestions = questions.length;

    for (const q of questions) {
      const isAnswerCorrect = (q.data as any).response === answers[q.id];
      if (isAnswerCorrect) {
        correctCount++;
      }
    }

    // 2. Determine passing threshold (80% correct required)
    const success = correctCount / totalQuestions >= 0.8;

    // 3. Record responses in DB via ResponseService (award XP)
    let xpEarnedTotal = 0;
    for (const [qIdStr, userResponseId] of Object.entries(answers)) {
      const questionId = Number(qIdStr);
      const res = await responseService.validateResponse(
        {
          questionId,
          userResponseId,
        },
        userId,
      );
      if (res?.xpEarned) {
        xpEarnedTotal += res.xpEarned;
      }
    }

    const isReplay = sequence < currentUnlocked || completed;

    if (success) {
      // Award stage completion bonus XP
      let bonusXp = 0;
      if (stage.type === "STEP") bonusXp = 50;
      else if (stage.type === "CONTROL") bonusXp = 150;
      else if (stage.type === "EXAM") bonusXp = 500;

      // Update user progress XP
      const progressRecord = await prisma.userProgress.findFirst({
        where: { userId },
      });
      if (progressRecord) {
        const userXpTot = progressRecord.xp + bonusXp;
        const level = await prisma.level.findFirst({
          where: { xp_threshold: { lte: userXpTot } },
          orderBy: { xp_threshold: "desc" },
        });
        await prisma.userProgress.update({
          where: { userId },
          data: {
            xp: { increment: bonusXp },
            levelId: level?.id,
          },
        });
      }
      await grantCoins(userId, coinsFromXp(bonusXp));

      // 4. Update stage scores map
      let stageScores: Record<string, number> = {};
      if (progress && progress.stageScores) {
        try {
          stageScores =
            typeof progress.stageScores === "string"
              ? JSON.parse(progress.stageScores)
              : JSON.parse(JSON.stringify(progress.stageScores));
        } catch (e) {
          stageScores = {};
        }
      }
      const prevScore = stageScores[sequence.toString()] ?? -1;
      if (correctCount > prevScore) {
        stageScores[sequence.toString()] = correctCount;
      }

      // 5. Update Adventure progression
      const nextStageExists = await prisma.adventureStage.findFirst({
        where: { adventureId, sequence: sequence + 1 },
      });

      if (isReplay) {
        if (progress) {
          await prisma.userAdventureProgress.update({
            where: { id: progress.id },
            data: {
              stageScores,
              updateDate: new Date(),
            },
          });
        }
      } else {
        if (progress) {
          await prisma.userAdventureProgress.update({
            where: { id: progress.id },
            data: {
              currentStage: nextStageExists ? sequence + 1 : sequence,
              completed: !nextStageExists ? true : progress.completed,
              stageScores,
              updateDate: new Date(),
            },
          });
        } else {
          await prisma.userAdventureProgress.create({
            data: {
              userId,
              adventureId,
              currentStage: nextStageExists ? sequence + 1 : sequence,
              completed: !nextStageExists,
              stageScores,
            },
          });
        }
      }

      return {
        success: true,
        score: correctCount,
        total: totalQuestions,
        xpEarnedTotal,
        bonusXp,
        hasNextStage: !!nextStageExists,
      };
    } else {
      return {
        success: false,
        isReplay,
        score: correctCount,
        total: totalQuestions,
        xpEarnedTotal,
        message: `Vous avez obtenu ${correctCount}/${totalQuestions} bonnes réponses. Vous devez obtenir au moins 80% pour valider l'étape.`,
      };
    }
  }

  // Private helper to shuffle arrays
  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }
}

export const adventureService = new AdventureService();
