import { createError } from "h3";
import prisma from "../utils/prisma";
import {
  CALENDAR_REWARDS,
  computeActivityStreak,
  getPastLocalDateStr,
  getStreakTimeline,
  toLocalDateStr,
} from "../utils/activityStreakHelper";

export interface CompletedQuestNotificationDTO {
  id: number;
  category: "SHORT" | "LONG";
  questType: string;
  title: string;
  description: string;
  targetTheme?: string | null;
  themeName?: string | null;
  coinsEarned: number;
  questStreak: number;
}

export const SHORT_QUEST_TEMPLATES = [
  {
    type: "ANSWER_THEME_QUESTIONS",
    title: "Spécialiste {themeName}",
    description: "Répondre correctement à 5 questions du thème {themeName}.",
    target: 5,
    coinsReward: 10,
  },
  {
    type: "PLAY_SPEEDRUN_SPRINT",
    title: "Sprint Éclair",
    description: "Terminer 1 partie de Sprint dans le mode Speedrun.",
    target: 1,
    coinsReward: 10,
  },
  {
    type: "ANSWER_ANY_QUESTIONS_SHORT",
    title: "Échauffement Rapide",
    description: "Répondre correctement à 8 questions de culture générale.",
    target: 8,
    coinsReward: 10,
  },
];

export const LONG_QUEST_TEMPLATES = [
  {
    type: "ANSWER_QUESTIONS",
    title: "Le Savant",
    description: "Répondre correctement à 30 questions de culture générale.",
    target: 30,
    coinsReward: 20,
  },
  {
    type: "PLAY_SPEEDRUN",
    title: "Le Bolide",
    description: "Terminer 2 parties de Speedrun (Survie ou Sprint).",
    target: 2,
    coinsReward: 20,
  },
  {
    type: "PLAY_BRAINRUN",
    title: "Le Survivant",
    description: "Atteindre le premier boss (Acte 1) du Roguelite Brainrun.",
    target: 1,
    coinsReward: 20,
  },
  {
    type: "PLAY_MULTIPLAYER_OR_SOLO",
    title: "Le Duelliste",
    description:
      "Participer à 2 parties au choix en multijoueur (Battle Royale / Showdown) ou en solo rapide (Speedrun / Ascension).",
    target: 2,
    coinsReward: 20,
  },
  {
    type: "PLAY_ADVENTURE",
    title: "Le Conquérant",
    description: "Valider 5 étapes dans le mode Aventure.",
    target: 5,
    coinsReward: 20,
  },
];

export class DailyRewardService {
  /** Récupère ou crée le portefeuille de l'utilisateur. */
  private async getOrCreateWallet(userId: string) {
    let wallet = await prisma.userWallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await prisma.userWallet.create({
        data: { userId, coins: 0, totalEarned: 0 },
      });
    }
    return wallet;
  }

  /** Sélectionne un thème aléatoire depuis la base de données (en excluant éventuellement un slug). */
  async getRandomTheme(excludeSlug?: string): Promise<{ slug: string; name: string } | null> {
    const themes = await prisma.questionTheme.findMany({
      where: excludeSlug ? { slug: { not: excludeSlug } } : undefined,
      select: { slug: true, name: true },
    });
    if (!themes.length) return null;
    return themes[Math.floor(Math.random() * themes.length)] ?? null;
  }

  /** Génère la quête courte pour aujourd'hui. */
  private async generateShortQuest(userId: string, today: string, excludeSlug?: string) {
    const theme = await this.getRandomTheme(excludeSlug);
    const themeSlug = theme?.slug || "culture_generale";
    const themeName = theme?.name || "Culture Générale";

    return await prisma.userDailyQuest.create({
      data: {
        userId,
        category: "SHORT",
        questType: "ANSWER_THEME_QUESTIONS",
        targetTheme: themeSlug,
        themeName,
        title: `Spécialiste ${themeName}`,
        description: `Répondre correctement à 5 questions du thème ${themeName}.`,
        target: 5,
        coinsReward: 10,
        dateStr: today,
      },
    });
  }

  /** Génère la quête longue pour aujourd'hui. */
  private async generateLongQuest(userId: string, today: string, excludeType?: string) {
    const available = excludeType
      ? LONG_QUEST_TEMPLATES.filter((t) => t.type !== excludeType)
      : LONG_QUEST_TEMPLATES;
    const template =
      available[Math.floor(Math.random() * available.length)] ?? LONG_QUEST_TEMPLATES[0]!;

    return await prisma.userDailyQuest.create({
      data: {
        userId,
        category: "LONG",
        questType: template.type,
        title: template.title,
        description: template.description,
        target: template.target,
        coinsReward: template.coinsReward,
        dateStr: today,
      },
    });
  }

  /** Récupère ou génère les 2 quêtes (SHORT et LONG) pour aujourd'hui. */
  async getOrCreateDailyQuests(userId: string) {
    const today = toLocalDateStr(new Date());

    let shortQuest = await prisma.userDailyQuest.findUnique({
      where: {
        userId_dateStr_category: { userId, dateStr: today, category: "SHORT" },
      },
    });

    let longQuest = await prisma.userDailyQuest.findUnique({
      where: {
        userId_dateStr_category: { userId, dateStr: today, category: "LONG" },
      },
    });

    if (!shortQuest) {
      shortQuest = await this.generateShortQuest(userId, today);
    }

    if (!longQuest) {
      longQuest = await this.generateLongQuest(userId, today);
    }

    return { shortQuest, longQuest };
  }

  /** Formate un objet quête pour les retours API DTO. */
  private formatQuestDTO(quest: any, wallet: any) {
    const isShort = quest.category === "SHORT";
    const streakBonus = isShort ? 0 : Math.min(wallet.questStreak * 10, 80);
    const totalReward = isShort
      ? quest.coinsReward
      : Math.min(quest.coinsReward + streakBonus, 100);

    let actionUrl = "/themes";
    let actionLabel = "Jouer";

    if (quest.questType === "ANSWER_THEME_QUESTIONS" && quest.targetTheme) {
      actionUrl = `/themes/${quest.targetTheme}`;
      actionLabel = `Thème ${quest.themeName || "Quiz"}`;
    } else if (
      quest.questType === "ANSWER_QUESTIONS" ||
      quest.questType === "ANSWER_ANY_QUESTIONS_SHORT"
    ) {
      actionUrl = "/themes/random";
      actionLabel = "Quiz Solo";
    } else if (quest.questType === "PLAY_SPEEDRUN" || quest.questType === "PLAY_SPEEDRUN_SPRINT") {
      actionUrl = "/series/speedrun";
      actionLabel = "Speedrun";
    } else if (quest.questType === "PLAY_BRAINRUN") {
      actionUrl = "/brainrun";
      actionLabel = "Brainrun";
    } else if (quest.questType === "PLAY_MULTIPLAYER_OR_SOLO") {
      actionUrl = "/solo";
      actionLabel = "Jouer";
    } else if (quest.questType === "PLAY_ADVENTURE") {
      actionUrl = "/adventure";
      actionLabel = "Aventure";
    }

    return {
      id: quest.id,
      category: quest.category as "SHORT" | "LONG",
      type: quest.questType,
      title: quest.title,
      description: quest.description,
      target: quest.target,
      progress: quest.progress,
      claimed: quest.claimed,
      targetTheme: quest.targetTheme,
      themeName: quest.themeName,
      rerolled: quest.rerolled ?? false,
      baseReward: quest.coinsReward,
      streakBonus,
      totalReward,
      questStreak: wallet.questStreak,
      actionUrl,
      actionLabel,
    };
  }

  /** Retourne le statut complet du calendrier, des quêtes et de la timeline de série unifiée. */
  async getDailyLoginStatus(userId: string) {
    const today = toLocalDateStr(new Date());

    const wallet = await this.getOrCreateWallet(userId);
    const { shortQuest, longQuest } = await this.getOrCreateDailyQuests(userId);
    const timelineData = await getStreakTimeline(userId);

    const streak = timelineData.currentStreak;
    const hasAnsweredToday = timelineData.hasAnsweredToday;
    const claimedToday = timelineData.claimedToday || wallet.lastDailyClaimStr === today;
    const canRerollToday = wallet.lastQuestRerollStr !== today;

    // Jour du cycle de 7 jours (1 à 7)
    const dayCycleIndex = streak > 0 ? ((streak - 1) % 7) + 1 : 1;
    const todayRewardCoins = CALENDAR_REWARDS[dayCycleIndex - 1] ?? 15;

    // Multiplicateur XP & Pièces basé sur la série réelle
    const activityMultiplier = this.getActivityStreakMultiplierFromStreak(streak);
    const bonusPercent = Math.round((activityMultiplier - 1) * 100);

    const canRepair = timelineData.canRepair && wallet.coins >= timelineData.repairCost;

    const formattedShort = shortQuest ? this.formatQuestDTO(shortQuest, wallet) : null;
    const formattedLong = longQuest ? this.formatQuestDTO(longQuest, wallet) : null;

    return {
      streak: {
        current: streak,
        multiplier: activityMultiplier,
        bonusPercent,
        hasAnsweredToday,
        claimedToday,
        dayCycleIndex,
        todayRewardCoins,
        rewards: CALENDAR_REWARDS,
      },
      timeline: timelineData.timeline,
      repair: {
        canRepair,
        canRepairYesterday: timelineData.canRepair,
        missedDaysCount: timelineData.missedDaysCount,
        cost: timelineData.repairCost,
        previousStreakToRestore: timelineData.previousStreakToRestore,
        userCoins: wallet.coins,
      },
      // Compatibilité rétrograde avec les anciens templates
      calendar: {
        claimedToday,
        streakBroken: !hasAnsweredToday && streak === 0,
        canCatchUp: canRepair,
        dailyStreak: streak,
        nextDayIndex: dayCycleIndex,
        rewards: CALENDAR_REWARDS,
        hasAnsweredToday,
      },
      canRerollToday,
      shortQuest: formattedShort,
      longQuest: formattedLong,
      quest: formattedLong, // Compatibilité rétrograde
      quests: [formattedShort, formattedLong].filter(Boolean),
      activity: {
        streak,
        multiplier: activityMultiplier,
        bonusPercent,
      },
    };
  }

  /**
   * Rachat de série d'une absence (jusqu'à 3 jours consécutifs manqués).
   * Coûte des pièces selon le barème (20 🪙 pour 1j, 50 🪙 pour 2j, 90 🪙 pour 3j).
   */
  async repairStreak(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const timelineData = await getStreakTimeline(userId);

    if (!timelineData.canRepair || timelineData.missedDaysCount <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Aucune série cassée récente éligible au rachat (max 3 jours).",
      });
    }

    const totalCost = timelineData.repairCost;
    if (wallet.coins < totalCost) {
      throw createError({
        statusCode: 400,
        statusMessage: `Pièces insuffisantes pour racheter la série (${totalCost} 🪙 requis pour ${timelineData.missedDaysCount} jour(s)).`,
      });
    }

    const previousStreak = timelineData.previousStreakToRestore;
    const costPerDay = Math.round(totalCost / timelineData.missedDaysCount);

    // Débiter le montant total
    await prisma.userWallet.update({
      where: { userId },
      data: {
        coins: { decrement: totalCost },
      },
    });

    // Insérer chaque jour racheté chronologiquement
    for (let i = 0; i < timelineData.missedDates.length; i++) {
      const missedDateStr = timelineData.missedDates[i];
      if (!missedDateStr) continue;
      const repairedStreakCount = previousStreak + i + 1;
      await prisma.userStreakDay.upsert({
        where: { userId_dateStr: { userId, dateStr: missedDateStr } },
        update: {
          status: "REPAIRED",
          streakCount: repairedStreakCount,
          cost: costPerDay,
        },
        create: {
          userId,
          dateStr: missedDateStr,
          status: "REPAIRED",
          streakCount: repairedStreakCount,
          cost: costPerDay,
          claimed: false,
        },
      });
    }

    // Recalculer et synchroniser la série
    const restoredStreak = await computeActivityStreak(userId);
    const todayStr = toLocalDateStr(new Date());

    await prisma.userStreakDay.updateMany({
      where: { userId, dateStr: todayStr },
      data: { streakCount: restoredStreak },
    });

    await prisma.userWallet.update({
      where: { userId },
      data: {
        activityStreak: restoredStreak,
        dailyStreak: restoredStreak,
      },
    });

    return {
      success: true,
      restoredStreak,
      cost: totalCost,
      repairedDaysCount: timelineData.missedDaysCount,
    };
  }

  /**
   * Réclame les pièces du jour actuel du calendrier.
   */
  async claimDailyLoginReward(userId: string, catchUp = false) {
    if (catchUp) {
      return await this.repairStreak(userId);
    }

    const today = toLocalDateStr(new Date());
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.lastDailyClaimStr === today) {
      throw createError({
        statusCode: 400,
        statusMessage: "Récompense du jour déjà réclamée.",
      });
    }

    const timelineData = await getStreakTimeline(userId);
    if (!timelineData.hasAnsweredToday) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Vous devez répondre à au moins une question aujourd'hui pour valider votre journée avant de réclamer.",
      });
    }

    const streak = timelineData.currentStreak;
    const dayCycleIndex = streak > 0 ? ((streak - 1) % 7) + 1 : 1;
    const finalCoinsGranted = CALENDAR_REWARDS[dayCycleIndex - 1] ?? 15;

    await prisma.$transaction([
      prisma.userStreakDay.upsert({
        where: { userId_dateStr: { userId, dateStr: today } },
        update: { claimed: true },
        create: {
          userId,
          dateStr: today,
          status: "PLAYED",
          streakCount: streak,
          cost: 0,
          claimed: true,
        },
      }),
      prisma.userWallet.update({
        where: { userId },
        data: {
          coins: { increment: finalCoinsGranted },
          totalEarned: { increment: finalCoinsGranted },
          lastDailyClaimStr: today,
          dailyStreak: streak,
          activityStreak: streak,
        },
      }),
    ]);

    return {
      success: true,
      coinsEarned: finalCoinsGranted,
      newStreak: streak,
    };
  }

  /**
   * Auto-réclame instantanément une quête terminée.
   * Crédite les pièces, actualise la série de quêtes et retourne les informations de notification.
   */
  private async autoClaimQuest(
    userId: string,
    questId: number,
  ): Promise<CompletedQuestNotificationDTO | null> {
    const today = toLocalDateStr(new Date());
    const yesterdayStr = getPastLocalDateStr(1);

    const quest = await prisma.userDailyQuest.findUnique({
      where: { id: questId },
    });

    if (!quest || quest.claimed) return null;

    const wallet = await this.getOrCreateWallet(userId);

    let newQuestStreak = wallet.questStreak || 0;
    if (wallet.lastQuestClaimStr === yesterdayStr) {
      newQuestStreak = wallet.questStreak + 1;
    } else if (wallet.lastQuestClaimStr !== today) {
      newQuestStreak = 1;
    }

    const isShort = quest.category === "SHORT";
    const coinsReward = isShort
      ? quest.coinsReward
      : Math.min(20 + Math.max(0, newQuestStreak - 1) * 10, 100);

    await prisma.$transaction([
      prisma.userDailyQuest.update({
        where: { id: questId },
        data: {
          claimed: true,
          progress: quest.target,
        },
      }),
      prisma.userWallet.update({
        where: { userId },
        data: {
          coins: { increment: coinsReward },
          totalEarned: { increment: coinsReward },
          lastQuestClaimStr: today,
          questStreak: newQuestStreak,
        },
      }),
    ]);

    return {
      id: quest.id,
      category: quest.category as "SHORT" | "LONG",
      questType: quest.questType,
      title: quest.title,
      description: quest.description,
      targetTheme: quest.targetTheme,
      themeName: quest.themeName,
      coinsEarned: coinsReward,
      questStreak: newQuestStreak,
    };
  }

  /**
   * Réclame manuellement les récompenses d'une quête complétée (méthode de secours).
   */
  async claimDailyQuest(userId: string, questId: number) {
    const quest = await prisma.userDailyQuest.findUnique({
      where: { id: questId },
    });
    if (!quest || quest.userId !== userId) {
      throw createError({ statusCode: 404, statusMessage: "Quête non trouvée." });
    }
    if (quest.claimed) {
      throw createError({
        statusCode: 400,
        statusMessage: "Quête déjà réclamée.",
      });
    }
    if (quest.progress < quest.target) {
      throw createError({
        statusCode: 400,
        statusMessage: "Objectif non atteint.",
      });
    }

    const notification = await this.autoClaimQuest(userId, questId);
    if (!notification) {
      throw createError({ statusCode: 400, statusMessage: "Erreur lors de la réclamation." });
    }

    return {
      success: true,
      coinsEarned: notification.coinsEarned,
      questStreak: notification.questStreak,
    };
  }

  /**
   * Permet à l'utilisateur de remplacer une quête quotidienne (1 fois par jour max).
   */
  async rerollDailyQuest(userId: string, questId: number) {
    const today = toLocalDateStr(new Date());
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.lastQuestRerollStr === today) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Vous avez déjà remplacé une quête aujourd'hui (1 seul changement par jour).",
      });
    }

    const quest = await prisma.userDailyQuest.findUnique({
      where: { id: questId },
    });

    if (!quest || quest.userId !== userId) {
      throw createError({ statusCode: 404, statusMessage: "Quête non trouvée." });
    }

    if (quest.dateStr !== today) {
      throw createError({ statusCode: 400, statusMessage: "Cette quête a expiré." });
    }

    if (quest.claimed || quest.progress >= quest.target) {
      throw createError({
        statusCode: 400,
        statusMessage: "Impossible de remplacer une quête déjà terminée ou réclamée.",
      });
    }

    let updatedQuest;
    if (quest.category === "SHORT") {
      const newTheme = await this.getRandomTheme(quest.targetTheme || undefined);
      const themeSlug = newTheme?.slug || "culture_generale";
      const themeName = newTheme?.name || "Culture Générale";

      updatedQuest = await prisma.userDailyQuest.update({
        where: { id: quest.id },
        data: {
          questType: "ANSWER_THEME_QUESTIONS",
          targetTheme: themeSlug,
          themeName,
          title: `Spécialiste ${themeName}`,
          description: `Répondre correctement à 5 questions du thème ${themeName}.`,
          target: 5,
          progress: 0,
          coinsReward: 10,
          rerolled: true,
        },
      });
    } else {
      const available = LONG_QUEST_TEMPLATES.filter((t) => t.type !== quest.questType);
      const template =
        available[Math.floor(Math.random() * available.length)] ?? LONG_QUEST_TEMPLATES[0]!;

      updatedQuest = await prisma.userDailyQuest.update({
        where: { id: quest.id },
        data: {
          questType: template.type,
          targetTheme: null,
          themeName: null,
          title: template.title,
          description: template.description,
          target: template.target,
          progress: 0,
          coinsReward: template.coinsReward,
          rerolled: true,
        },
      });
    }

    await prisma.userWallet.update({
      where: { userId },
      data: { lastQuestRerollStr: today },
    });

    return {
      success: true,
      quest: this.formatQuestDTO(updatedQuest, wallet),
      canRerollToday: false,
    };
  }

  /**
   * Appelé lorsqu'une question est répondue correctement.
   * Incrémente les quêtes thématiques (si le thème correspond) et les quêtes générales.
   * Auto-réclame immédiatement les quêtes complétées.
   */
  async handleQuestionAnswered(
    userId: string,
    questionThemes: string[] = [],
    amount = 1,
  ): Promise<CompletedQuestNotificationDTO[]> {
    const { shortQuest, longQuest } = await this.getOrCreateDailyQuests(userId);
    const completedQuests: CompletedQuestNotificationDTO[] = [];

    const questsToEvaluate = [shortQuest, longQuest].filter(Boolean);

    for (const quest of questsToEvaluate) {
      if (quest.claimed || quest.progress >= quest.target) continue;

      let shouldIncrement = false;

      if (
        quest.questType === "ANSWER_QUESTIONS" ||
        quest.questType === "ANSWER_ANY_QUESTIONS_SHORT"
      ) {
        shouldIncrement = true;
      } else if (quest.questType === "ANSWER_THEME_QUESTIONS" && quest.targetTheme) {
        const normalizedTarget = quest.targetTheme.toLowerCase().replace(/[-_\s]/g, "");
        const match = questionThemes.some((t) => {
          if (!t || typeof t !== "string") return false;
          const norm = t.toLowerCase().replace(/[-_\s]/g, "");
          return (
            norm === normalizedTarget ||
            norm.includes(normalizedTarget) ||
            normalizedTarget.includes(norm)
          );
        });

        if (
          match ||
          (normalizedTarget === "culturegenerale" &&
            questionThemes.some(
              (t) => typeof t === "string" && t.toLowerCase().includes("culture"),
            ))
        ) {
          shouldIncrement = true;
        }
      }

      if (shouldIncrement) {
        const newProgress = Math.min(quest.progress + amount, quest.target);
        if (newProgress >= quest.target) {
          const autoClaimed = await this.autoClaimQuest(userId, quest.id);
          if (autoClaimed) completedQuests.push(autoClaimed);
        } else {
          await prisma.userDailyQuest.update({
            where: { id: quest.id },
            data: { progress: newProgress },
          });
        }
      }
    }

    return completedQuests;
  }

  /**
   * Incrémente la progression d'une quête spécifique (Speedrun, Brainrun, Aventure...)
   * et auto-réclame si l'objectif est atteint.
   */
  async incrementQuestProgress(
    userId: string,
    questType: string,
    amount = 1,
  ): Promise<CompletedQuestNotificationDTO[]> {
    const { shortQuest, longQuest } = await this.getOrCreateDailyQuests(userId);
    const completedQuests: CompletedQuestNotificationDTO[] = [];

    const questsToEvaluate = [shortQuest, longQuest].filter(Boolean);

    for (const quest of questsToEvaluate) {
      if (quest.claimed || quest.progress >= quest.target) continue;

      if (quest.questType === questType) {
        const newProgress = Math.min(quest.progress + amount, quest.target);
        if (newProgress >= quest.target) {
          const autoClaimed = await this.autoClaimQuest(userId, quest.id);
          if (autoClaimed) completedQuests.push(autoClaimed);
        } else {
          await prisma.userDailyQuest.update({
            where: { id: quest.id },
            data: { progress: newProgress },
          });
        }
      }
    }

    return completedQuests;
  }

  /** Récupère le multiplicateur de streak global d'un utilisateur. */
  async getActivityStreakMultiplier(userId: string): Promise<number> {
    const streak = await computeActivityStreak(userId);
    return this.getActivityStreakMultiplierFromStreak(streak);
  }

  private getActivityStreakMultiplierFromStreak(streak: number): number {
    if (streak <= 1) return 1.0;
    const bonus = Math.min((streak - 1) * 0.1, 2.0); // +10% par jour sup, max +200%
    return 1.0 + bonus;
  }
}

export const dailyRewardService = new DailyRewardService();
