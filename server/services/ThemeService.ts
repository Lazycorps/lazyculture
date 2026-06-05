import { Prisma } from "@prisma/client";
import prisma from "~/lib/prisma";
import type { Theme } from "~/models/theme";

export class ThemeService {
  async getAllThemes() {
    const [themes, questions] = await Promise.all([
      prisma.questionTheme.findMany(),
      prisma.question.findMany({
        where: { deleted: false },
        select: {
          createDate: true,
          data: true,
        },
      }),
    ]);

    const latestDateByTheme: Record<string, Date> = {};
    for (const q of questions) {
      const themeSlugs = (q.data as any)?.theme;
      if (Array.isArray(themeSlugs)) {
        for (const slug of themeSlugs) {
          const date = q.createDate;
          if (!latestDateByTheme[slug] || date > latestDateByTheme[slug]) {
            latestDateByTheme[slug] = date;
          }
        }
      }
    }

    const themesWithLastQuestionDate = themes.map((theme) => {
      return {
        theme,
        latestDate: latestDateByTheme[theme.slug] || theme.updateDate || theme.createDate,
      };
    });

    themesWithLastQuestionDate.sort((a, b) => {
      return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
    });

    return themesWithLastQuestionDate.map((item) => item.theme);
  }

  getThemeBySlug(slug: string) {
    return prisma.questionTheme.findFirst({ where: { slug } });
  }

  async createTheme(theme: Theme, authorName: string) {
    try {
      const data: Prisma.QuestionThemeCreateInput = {
        name: theme.name,
        slug: theme.slug,
        picture: theme.picture,
        createDate: new Date(),
        updateDate: new Date(),
        userCreate: authorName,
        userUpdate: authorName,
      };
      return await prisma.questionTheme.create({ data });
    } catch (error) {
      const err = error as Error;
      throw createError({
        statusCode: 400,
        statusMessage: `Erreur lors de la création du thème: Erreur ${err.message}`,
      });
    }
  }

  async updateTheme(theme: Theme, authorName: string) {
    try {
      const data: Prisma.QuestionThemeUpdateInput = {
        name: theme.name,
        slug: theme.slug,
        picture: theme.picture,
        createDate: new Date(),
        updateDate: new Date(),
        userCreate: authorName,
        userUpdate: authorName,
      };
      return await prisma.questionTheme.update({
        where: { id: theme.id },
        data,
      });
    } catch (error) {
      const err = error as Error;
      throw createError({
        statusCode: 400,
        statusMessage: `Erreur lors de la création du thème: Erreur ${err.message}`,
      });
    }
  }

  async getThemeProgress(theme: string, userId?: string) {
    try {
      const isNotRandom = theme != "random";
      const questionCount = await prisma.question.count({
        where: {
          deleted: false,
          ...(isNotRandom && {
            data: {
              path: ["theme"],
              array_contains: theme,
            },
          }),
        },
      });

      let responseCount = 0;
      let mastery = 0;
      let hasNewQuestions = false;
      if (userId != null) {
        const responses = await this.getAllSuccessResponses(userId, theme);
        const lastResponse = await this.getLastResponses(userId, theme, isNotRandom ? 50 : 1000);
        responseCount = responses.length;
        const goodResponseCount = lastResponse.filter((r) => r.success).length;
        mastery = lastResponse.length > 20 ? (goodResponseCount / lastResponse.length) * 10 : 0;

        if (isNotRandom) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const newUnansweredCount = await prisma.question.count({
            where: {
              deleted: false,
              createDate: {
                gte: thirtyDaysAgo,
              },
              data: {
                path: ["theme"],
                array_contains: theme,
              },
              Response: {
                none: {
                  userId,
                },
              },
            },
          });
          hasNewQuestions = newUnansweredCount > 0;
        }
      }

      return { questionCount, responseCount, mastery, hasNewQuestions };
    } catch (e) {
      console.error("Error loading theme progress on server:", e);
      return { questionCount: 0, responseCount: 0, mastery: 0, hasNewQuestions: false };
    }
  }

  private getAllSuccessResponses(userId: string, theme: string) {
    const isNotRandom = theme != "random";
    return prisma.questionResponse.findMany({
      include: {
        question: true, // Inclure les questions pour accéder au champ JSON 'data'
      },
      where: {
        question: {
          deleted: false,
        },
        ...(isNotRandom && {
          question: {
            deleted: false,
            data: {
              path: ["theme"],
              array_contains: theme,
            },
          },
        }),
        userId,
        success: true,
      },
      distinct: ["questionId"],
    });
  }

  private getLastResponses(userId: string, theme: string, take: number) {
    const isNotRandom = theme != "random";
    return prisma.questionResponse.findMany({
      include: {
        question: true, // Inclure les questions pour accéder au champ JSON 'data'
      },
      where: {
        ...(isNotRandom && {
          question: {
            deleted: false,
            data: {
              path: ["theme"],
              array_contains: theme,
            },
          },
        }),
        userId,
      },
      orderBy: [{ date: "desc" }],
      take,
    });
  }
}

export const themeService = new ThemeService();
