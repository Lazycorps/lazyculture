import { Prisma } from "@prisma/client";
import prisma from "~~/server/utils/prisma";
import type { Theme } from "#shared/theme";

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
        battleRoyale: theme.battleRoyale ?? true,
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
        battleRoyale: theme.battleRoyale ?? true,
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

  async getAllThemesProgress(userId?: string) {
    try {
      // 1. Get all theme definitions
      const themes = await prisma.questionTheme.findMany({
        select: { slug: true },
      });

      // 2. Question count per theme (non-deleted, not null data)
      const questionCounts = await prisma.$queryRaw<{ theme_slug: string; count: number }[]>`
        SELECT
          jsonb_array_elements_text(data->'theme') AS theme_slug,
          COUNT(*)::int AS count
        FROM "Question"
        WHERE deleted = false AND data IS NOT NULL
        GROUP BY theme_slug
      `;

      const totalQuestionsCount = await prisma.question.count({
        where: { deleted: false },
      });

      // Initialize the progress map
      const progressMap: Record<
        string,
        {
          questionCount: number;
          responseCount: number;
          mastery: number;
          hasNewQuestions: boolean;
        }
      > = {};

      for (const t of themes) {
        progressMap[t.slug] = {
          questionCount: 0,
          responseCount: 0,
          mastery: 0,
          hasNewQuestions: false,
        };
      }

      // Populate question count
      for (const row of questionCounts) {
        const themeProgress = progressMap[row.theme_slug];
        if (themeProgress) {
          themeProgress.questionCount = row.count;
        }
      }

      // Initialize random theme
      progressMap["random"] = {
        questionCount: totalQuestionsCount,
        responseCount: 0,
        mastery: 0,
        hasNewQuestions: false,
      };

      if (userId) {
        // 3. User success response count per theme
        const successCounts = await prisma.$queryRaw<{ theme_slug: string; count: number }[]>`
          SELECT
            jsonb_array_elements_text(q.data->'theme') AS theme_slug,
            COUNT(DISTINCT qr."questionId")::int AS count
          FROM "QuestionResponse" qr
          JOIN "Question" q ON qr."questionId" = q.id
          WHERE qr."userId" = ${userId}
            AND qr.success = true
            AND q.deleted = false
            AND q.data IS NOT NULL
          GROUP BY theme_slug
        `;

        for (const row of successCounts) {
          const themeProgress = progressMap[row.theme_slug];
          if (themeProgress) {
            themeProgress.responseCount = row.count;
          }
        }

        const randomSuccessResponses = await prisma.questionResponse.findMany({
          where: {
            userId,
            success: true,
            question: { deleted: false },
          },
          distinct: ["questionId"],
          select: { questionId: true },
        });
        progressMap["random"].responseCount = randomSuccessResponses.length;

        // 4. Mastery per theme
        const recentResponses = await prisma.$queryRaw<
          { theme_slug: string; success_count: number; total_count: number }[]
        >`
          WITH ranked_responses AS (
            SELECT
              qr.success,
              jsonb_array_elements_text(q.data->'theme') AS theme_slug,
              ROW_NUMBER() OVER (
                PARTITION BY jsonb_array_elements_text(q.data->'theme')
                ORDER BY qr.date DESC
              ) AS rn
            FROM "QuestionResponse" qr
            JOIN "Question" q ON qr."questionId" = q.id
            WHERE qr."userId" = ${userId}
              AND q.deleted = false
              AND q.data IS NOT NULL
          )
          SELECT
            theme_slug,
            COUNT(CASE WHEN success = true THEN 1 END)::int AS success_count,
            COUNT(*)::int AS total_count
          FROM ranked_responses
          WHERE rn <= 50
          GROUP BY theme_slug
        `;

        for (const row of recentResponses) {
          const themeProgress = progressMap[row.theme_slug];
          if (themeProgress) {
            const goodCount = row.success_count;
            const totalCount = row.total_count;
            themeProgress.mastery = totalCount > 20 ? (goodCount / totalCount) * 10 : 0;
          }
        }

        const randomRecentResponses = await prisma.questionResponse.findMany({
          where: {
            userId,
            question: { deleted: false },
          },
          select: { success: true },
          orderBy: { date: "desc" },
          take: 1000,
        });
        const randomGoodCount = randomRecentResponses.filter((r) => r.success).length;
        progressMap["random"].mastery =
          randomRecentResponses.length > 20
            ? (randomGoodCount / randomRecentResponses.length) * 10
            : 0;

        // 5. New unanswered questions per theme (created in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const newUnansweredThemes = await prisma.$queryRaw<{ theme_slug: string }[]>`
          SELECT DISTINCT
            jsonb_array_elements_text(q.data->'theme') AS theme_slug
          FROM "Question" q
          LEFT JOIN "QuestionResponse" qr ON qr."questionId" = q.id AND qr."userId" = ${userId}
          WHERE q.deleted = false
            AND q.data IS NOT NULL
            AND q."createDate" >= ${thirtyDaysAgo}
            AND qr.id IS NULL
        `;

        for (const row of newUnansweredThemes) {
          const themeProgress = progressMap[row.theme_slug];
          if (themeProgress) {
            themeProgress.hasNewQuestions = true;
          }
        }
      }

      return progressMap;
    } catch (e) {
      console.error("Error loading batch theme progress on server:", e);
      return {};
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
