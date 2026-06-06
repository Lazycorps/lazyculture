import { Prisma } from "@prisma/client";
import prisma from "~~/server/utils/prisma";
import { QuestionDataDTO, QuestionDTO, QuestionReportingDTO } from "#shared/question";
import type { ReportingDTO } from "#shared/DTO/reportingDTO";

export class QuestionService {
  async getById(id: number) {
    const question = await prisma.question.findFirst({ where: { id } });
    if (!question) return undefined;

    const questionThemes = (question.data as any as QuestionDataDTO).theme;
    const themes = await prisma.questionTheme.findMany({
      where: { slug: { in: questionThemes } },
    });

    return {
      ...question,
      themes: themes.map((t) => t.name),
    };
  }

  async getAllForAdmin() {
    const questions = await prisma.question.findMany({
      include: {
        Reporting: {
          where: {
            closed: false, // Inclut seulement les rapports où closed = false
          },
        },
      },
    });

    return questions.map((question) => {
      const questionDTO = new QuestionDTO();
      questionDTO.id = question.id;
      questionDTO.difficulty = question.difficulty;
      questionDTO.source = question.source;
      questionDTO.createDate = question.createDate;
      questionDTO.updateDate = question.updateDate;
      questionDTO.userCreate = question.userCreate;
      questionDTO.userUpdate = question.userUpdate;
      questionDTO.deleted = question.deleted;

      questionDTO.reportings = question.Reporting.map((report) => {
        const reportingDTO = new QuestionReportingDTO();
        reportingDTO.id = report.id;
        reportingDTO.commentaire = report.commentaire;
        reportingDTO.closed = report.closed;
        return reportingDTO;
      });

      questionDTO.data = question.data as any as QuestionDataDTO;

      return questionDTO;
    });
  }

  async getRandom(theme?: string, userId?: string) {
    let ids = await this.getRandomQuestionsIds(theme, userId);
    if (ids.length == 0) ids = await this.getRandomQuestionsIds(theme);
    const id = this.getRandomId(ids);
    if (id === undefined) return null;

    const question = await prisma.question.findFirst({ where: { id } });
    if (!question) return undefined;

    const questionData = question.data as any as QuestionDataDTO;
    questionData.propositions = this.shuffleArray(questionData.propositions);
    const themes = await prisma.questionTheme.findMany({
      where: { slug: { in: questionData.theme } },
    });

    return {
      ...question,
      themes: themes.map((t) => t.name),
    };
  }

  async create(question: QuestionDTO, authorName: string) {
    try {
      const data: Prisma.QuestionCreateInput = {
        difficulty: question.difficulty,
        data: question.data as any,
        source: "Maintenance",
        language: "fr",
        createDate: new Date(),
        updateDate: new Date(),
        userCreate: authorName,
        userUpdate: authorName,
      };
      const newQuestion = await prisma.question.create({ data });
      return { newQuestion };
    } catch (error) {
      const err = error as Error;
      throw createError({
        statusCode: 400,
        statusMessage: `Erreur lors de la création de la question: ${err.message}`,
      });
    }
  }

  async update(question: QuestionDTO) {
    try {
      const updatedQuestion = await prisma.question.update({
        where: { id: question.id },
        data: {
          difficulty: question.difficulty,
          deleted: question.deleted,
          data: {
            libelle: question.data.libelle,
            theme: question.data.theme,
            commentaire: question.data.commentaire,
            response: question.data.response,
            img: question.data.img,
            propositions: question.data.propositions.map((prop) => ({
              id: prop.id,
              value: prop.value,
            })),
          },
          source: question.source,
          updateDate: new Date(),
          userUpdate: question.userUpdate,
          Reporting: {
            update: question.reportings.map((reporting) => ({
              where: { id: reporting.id },
              data: {
                closed: reporting.closed,
              },
            })),
          },
        },
      });

      return { updatedQuestion };
    } catch (error) {
      throw createError({
        statusCode: 400,
        statusMessage: "Erreur lors de la mise à jour de la question.",
      });
    }
  }

  softDelete(id: number) {
    return prisma.question.update({
      where: { id },
      data: { deleted: true },
    });
  }

  async report(reporting: ReportingDTO, userId: string) {
    const question = await prisma.question.findFirst({
      where: { id: reporting.questionId },
    });

    if (!question?.data) return;

    await prisma.questionReporting.create({
      data: {
        userId,
        questionId: reporting.questionId,
        closed: false,
        commentaire: reporting.comment,
      },
    });
  }

  async recalculateDifficulties() {
    // Récupérer et grouper les statistiques de réponses par question et succès
    const stats = await prisma.questionResponse.groupBy({
      by: ["questionId", "success"],
      _count: {
        _all: true,
      },
    });

    // Associer les stats par questionId : { correct: number, total: number }
    const questionStats: Record<number, { correct: number; total: number }> = {};
    for (const item of stats) {
      if (!questionStats[item.questionId]) {
        questionStats[item.questionId] = { correct: 0, total: 0 };
      }
      const current = questionStats[item.questionId]!;
      if (item.success) {
        current.correct += item._count._all;
      }
      current.total += item._count._all;
    }

    // Récupérer toutes les questions non supprimées
    const questions = await prisma.question.findMany({
      where: { deleted: false },
    });

    let updatedCount = 0;
    const MIN_RESPONSES = 3; // Minimum de réponses requis pour recalculer

    for (const question of questions) {
      const stat = questionStats[question.id];
      if (!stat || stat.total < MIN_RESPONSES) {
        continue; // Pas assez de réponses, on garde la difficulté existante
      }

      const successRate = (stat.correct / stat.total) * 100;
      let newDifficulty = question.difficulty;

      // Détermination de la difficulté selon les taux de succès
      if (successRate >= 80) {
        newDifficulty = 1; // Débutant
      } else if (successRate >= 60) {
        newDifficulty = 2; // Confirmé
      } else if (successRate >= 40) {
        newDifficulty = 3; // Expert
      } else if (successRate >= 20) {
        newDifficulty = 4; // Diabolique
      } else {
        newDifficulty = 5; // Impossible / Diabolique
      }

      if (newDifficulty !== question.difficulty) {
        const updatedData = question.data
          ? {
              ...(question.data as any),
              difficulty: newDifficulty,
            }
          : null;

        await prisma.question.update({
          where: { id: question.id },
          data: {
            difficulty: newDifficulty,
            ...(updatedData && { data: updatedData }),
          },
        });

        updatedCount++;
      }
    }

    return {
      success: true,
      updatedCount,
    };
  }

  private getRandomQuestionsIds(theme?: string, userId?: string) {
    return prisma.question.findMany({
      where: {
        deleted: false,
        ...(theme && {
          data: {
            path: ["theme"],
            array_contains: theme,
          },
        }),
        ...(userId && {
          Response: {
            none: {
              userId,
              success: true,
            },
          },
        }),
      },
      select: {
        id: true,
      },
    });
  }

  private getRandomId(ids: { id: number }[]): number | undefined {
    if (ids.length === 0) return undefined;
    const randomIndex = Math.floor(Math.random() * ids.length);
    return ids[randomIndex]?.id;
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j]!, array[i]!]; // Échange des éléments
    }
    return array;
  }
}

export const questionService = new QuestionService();
