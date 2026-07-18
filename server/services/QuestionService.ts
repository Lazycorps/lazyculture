import { Prisma } from "@prisma/client";
import prisma from "~~/server/utils/prisma";
import { QuestionDataDTO, QuestionDTO, QuestionReportingDTO } from "#shared/question";
import type { ReportingDTO } from "#shared/DTO/reportingDTO";

// Tirage pondéré par thème (getRandomIdsByThemeWeights) : nombre max de thèmes traités en parallèle.
// Chaque thème lance 2 requêtes ; borner à 5 plafonne à 10 connexions simultanées, sous la limite
// du pooler Supabase en session mode (pool_size 15), avec de la marge pour les autres requêtes.
const THEME_QUERY_CONCURRENCY = 5;

/** Vrai si la réponse donnée correspond à la réponse attendue de la question. Source unique de vérité, réutilisée par ResponseService et BrainrunService. */
export function isCorrectAnswer(question: { data: unknown }, userResponseId: number): boolean {
  return (question.data as unknown as QuestionDataDTO).response === userResponseId;
}

/** Retourne un clone de l'objet question expurgé de la réponse attendue et du commentaire d'explication pour éviter la triche. */
export function sanitizeQuestionForClient(question: any): any {
  if (!question || !question.data) return question;
  const safeData = { ...question.data };
  delete safeData.response;
  delete safeData.commentaire;
  delete safeData.commentaireImg;
  return {
    ...question,
    data: safeData,
  };
}

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
          include: {
            user: {
              select: {
                name: true,
              },
            },
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
        reportingDTO.userName = report.user?.name || "Inconnu";
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

  /**
   * Jusqu'à `count` IDs de questions aléatoires dans [minDifficulty, maxDifficulty], en excluant
   * `excludeIds` (anti-répétition sur une run Brainrun). Préfère les questions jamais réussies par
   * l'utilisateur (même logique que getRandom) ; si le pool est trop restreint, retombe sur toutes
   * les questions de la plage sans cette préférence plutôt que de renvoyer moins que `count`.
   *
   * Si `themes` est fourni (ennemi Brainrun), le filtre thème ("au moins un des thèmes donnés",
   * même pattern que getRandomQuestionsIds) est toujours appliqué : en cas de pool insuffisant,
   * l'élargissement se fait uniquement en remontant `maxDifficulty` jusqu'à 5, jamais en abandonnant
   * le filtre thème.
   *
   * `themeDifficultyOverrides` fixe une plage propre à certains thèmes (ex. culture_generale, cf.
   * BRAINRUN_CULTURE_GENERALE_DIFFICULTY_BY_ACT), à la place de [minDifficulty, maxDifficulty]
   * pour ce thème précis — y compris pendant l'élargissement ci-dessus, qui ne s'applique donc
   * qu'aux autres thèmes de la liste.
   *
   * `excludeThemes` (Purge Thématique Brainrun) exclut toute question portant l'un de ces thèmes,
   * même si elle porte aussi un des `themes` autorisés — une question peut avoir plusieurs thèmes
   * à la fois, donc filtrer uniquement sur `themes` ne suffit pas à garantir qu'un thème banni
   * n'apparaisse jamais.
   */
  async getRandomIdsByDifficulty(
    minDifficulty: number,
    maxDifficulty: number,
    count: number,
    excludeIds: number[],
    userId?: string,
    themes?: string[],
    themeDifficultyOverrides?: Record<string, [number, number]>,
    excludeThemes?: string[],
  ): Promise<number[]> {
    const buildThemeFilter = (maxDiff: number) =>
      themes && themes.length > 0
        ? {
            OR: themes.map((slug) => {
              const [themeMin, themeMax] = themeDifficultyOverrides?.[slug] ?? [
                minDifficulty,
                maxDiff,
              ];
              return {
                difficulty: { gte: themeMin, lte: themeMax },
                data: { path: ["theme"], array_contains: slug },
              };
            }),
          }
        : { difficulty: { gte: minDifficulty, lte: maxDiff } };
    const excludeThemesFilter =
      excludeThemes && excludeThemes.length > 0
        ? {
            NOT: excludeThemes.map((slug) => ({ data: { path: ["theme"], array_contains: slug } })),
          }
        : {};
    const whereForMaxDifficulty = (maxDiff: number) => ({
      deleted: false,
      id: { notIn: excludeIds },
      ...buildThemeFilter(maxDiff),
      ...excludeThemesFilter,
    });

    let candidates = await prisma.question.findMany({
      where: {
        ...whereForMaxDifficulty(maxDifficulty),
        ...(userId && { Response: { none: { userId, success: true } } }),
      },
      select: { id: true },
    });

    if (candidates.length < count) {
      candidates = await prisma.question.findMany({
        where: whereForMaxDifficulty(maxDifficulty),
        select: { id: true },
      });
    }

    if (candidates.length < count && themes && themes.length > 0 && maxDifficulty < 5) {
      candidates = await prisma.question.findMany({
        where: whereForMaxDifficulty(5),
        select: { id: true },
      });
    }

    return this.shuffleArray(candidates.map((c) => c.id)).slice(0, count);
  }

  /**
   * Variante Brainrun de getRandomIdsByDifficulty où le thème de CHAQUE question est tiré de façon
   * PONDÉRÉE par coefficient (`themeWeights`, cf. buildCombatThemeWeights) plutôt qu'uniformément
   * sur le volume de questions : pour chaque question, un thème est tiré au poids, puis une question
   * de ce thème est piochée (fraîches d'abord, cf. ci-dessous).
   *
   * Deux niveaux d'exclusion, comme le veut l'anti-répétition inter-runs :
   * - `excludeIds` (dur) : questions déjà servies dans la run en cours, jamais retirées.
   * - `softExcludeIds` (souple) : questions vues sur les runs précédentes ; préférées absentes mais
   *   réintroduites par thème si le vivier « frais » de ce thème est épuisé (fresh-first par thème),
   *   pour ne jamais bloquer un combat faute de question.
   *
   * `themeDifficultyOverrides` (culture_generale) et `excludeThemes` (Purge Thématique) sont
   * respectés par thème. Filet ultime : si le tirage pondéré ne remplit pas `count` (vivier global
   * trop maigre), on complète via getRandomIdsByDifficulty (cascade d'élargissement éprouvée).
   */
  async getRandomIdsByThemeWeights(
    themeWeights: { theme: string; weight: number }[],
    minDifficulty: number,
    maxDifficulty: number,
    count: number,
    excludeIds: number[],
    userId?: string,
    themeDifficultyOverrides?: Record<string, [number, number]>,
    excludeThemes?: string[],
    softExcludeIds?: number[],
  ): Promise<number[]> {
    if (themeWeights.length === 0) {
      return this.getRandomIdsByDifficulty(
        minDifficulty,
        maxDifficulty,
        count,
        excludeIds,
        userId,
        undefined,
        themeDifficultyOverrides,
        excludeThemes,
      );
    }

    const hardAndSoftExclude = [...excludeIds, ...(softExcludeIds ?? [])];
    // Par thème : file de candidats « fraîches d'abord » (jamais vues récemment + jamais réussies),
    // puis le reste (vues sur d'autres runs / déjà réussies) en repli.
    // Concurrence BORNÉE (chaque thème = 2 requêtes) : une Élite/Boss riche en thèmes lancerait
    // sinon 2×N requêtes d'un coup et saturerait le pool de connexions (session mode limité à 15).
    const perTheme = await this.mapWithConcurrency(
      themeWeights,
      THEME_QUERY_CONCURRENCY,
      async ({ theme }) => {
        const [tMin, tMax] = themeDifficultyOverrides?.[theme] ?? [minDifficulty, maxDifficulty];
        const [fresh, wide] = await Promise.all([
          this.fetchThemeCandidateIds(theme, tMin, tMax, hardAndSoftExclude, excludeThemes, userId),
          this.fetchThemeCandidateIds(theme, tMin, tMax, excludeIds, excludeThemes),
        ]);
        const freshSet = new Set(fresh);
        const candidates = [
          ...this.shuffleArray(fresh),
          ...this.shuffleArray(wide.filter((id) => !freshSet.has(id))),
        ];
        return { theme, candidates };
      },
    );
    const candidatesByTheme = new Map(perTheme.map((p) => [p.theme, p.candidates]));

    const picked = new Set<number>();
    const result: number[] = [];
    while (result.length < count) {
      const avail = themeWeights.filter((t) => (candidatesByTheme.get(t.theme)?.length ?? 0) > 0);
      if (avail.length === 0) break;
      const chosen = this.weightedPick(avail, (t) => t.weight);
      const list = candidatesByTheme.get(chosen.theme)!;
      let id: number | undefined;
      while (list.length > 0) {
        const candidate = list.shift()!;
        if (!picked.has(candidate)) {
          id = candidate;
          break;
        }
      }
      if (id === undefined) continue;
      picked.add(id);
      result.push(id);
    }

    if (result.length < count) {
      const fill = await this.getRandomIdsByDifficulty(
        minDifficulty,
        maxDifficulty,
        count - result.length,
        [...excludeIds, ...result],
        userId,
        themeWeights.map((t) => t.theme),
        themeDifficultyOverrides,
        excludeThemes,
      );
      for (const id of fill) {
        if (!picked.has(id)) {
          picked.add(id);
          result.push(id);
        }
      }
    }
    return result.slice(0, count);
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
    // Récupérer la première tentative de chaque utilisateur pour chaque question
    const firstAttempts = await prisma.questionResponse.findMany({
      distinct: ["userId", "questionId"],
      orderBy: [{ userId: "asc" }, { questionId: "asc" }, { date: "asc" }],
      select: {
        questionId: true,
        success: true,
      },
    });

    // Associer les stats par questionId : { correct: number, total: number }
    const questionStats: Record<number, { correct: number; total: number }> = {};
    for (const item of firstAttempts) {
      if (!questionStats[item.questionId]) {
        questionStats[item.questionId] = { correct: 0, total: 0 };
      }
      const current = questionStats[item.questionId]!;
      if (item.success) {
        current.correct += 1;
      }
      current.total += 1;
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

  shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j]!, array[i]!]; // Échange des éléments
    }
    return array;
  }

  /**
   * IDs des questions d'un thème donné dans une bande de difficulté, hors `excludeIds` et hors
   * `excludeThemes` (une question multi-thèmes portant un thème banni est écartée). Si
   * `userIdForSuccessFilter` est fourni, écarte aussi les questions déjà réussies par ce joueur.
   * Brique du tirage pondéré getRandomIdsByThemeWeights.
   */
  private async fetchThemeCandidateIds(
    theme: string,
    minDifficulty: number,
    maxDifficulty: number,
    excludeIds: number[],
    excludeThemes?: string[],
    userIdForSuccessFilter?: string,
  ): Promise<number[]> {
    const rows = await prisma.question.findMany({
      where: {
        deleted: false,
        id: { notIn: excludeIds },
        difficulty: { gte: minDifficulty, lte: maxDifficulty },
        data: { path: ["theme"], array_contains: theme },
        ...(excludeThemes && excludeThemes.length > 0
          ? {
              NOT: excludeThemes.map((slug) => ({
                data: { path: ["theme"], array_contains: slug },
              })),
            }
          : {}),
        ...(userIdForSuccessFilter
          ? { Response: { none: { userId: userIdForSuccessFilter, success: true } } }
          : {}),
      },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  /**
   * `Promise.all` à concurrence bornée : traite `items` par `fn` en maintenant au plus `limit`
   * exécutions en vol, en préservant l'ordre des résultats. Évite de saturer le pool de connexions
   * quand `fn` déclenche des requêtes DB (cf. getRandomIdsByThemeWeights).
   */
  private async mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results = new Array<R>(items.length);
    let next = 0;
    const worker = async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]!);
      }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
    return results;
  }

  /** Tirage pondéré d'un élément (poids > 0). Utilisé pour choisir le thème de chaque question. */
  private weightedPick<T>(items: T[], weight: (item: T) => number): T {
    const total = items.reduce((sum, item) => sum + weight(item), 0);
    let roll = Math.random() * total;
    for (const item of items) {
      roll -= weight(item);
      if (roll <= 0) return item;
    }
    return items[items.length - 1]!;
  }
}

export const questionService = new QuestionService();
