import prisma from "~~/server/utils/prisma";
import {
  CALENDAR_REWARDS,
  computeActivityStreak,
  getStreakTimeline,
  toLocalDateStr,
} from "~~/server/utils/activityStreakHelper";

const QUEST_TEMPLATES = [
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

  /** Retourne le statut complet du calendrier, de la quête et de la timeline de série unifiée. */
  async getDailyLoginStatus(userId: string) {
    const today = toLocalDateStr(new Date());

    const wallet = await this.getOrCreateWallet(userId);
    const quest = await this.getOrCreateDailyQuest(userId);
    const timelineData = await getStreakTimeline(userId);

    const streak = timelineData.currentStreak;
    const hasAnsweredToday = timelineData.hasAnsweredToday;
    const claimedToday = timelineData.claimedToday || wallet.lastDailyClaimStr === today;

    // Jour du cycle de 7 jours (1 à 7)
    const dayCycleIndex = streak > 0 ? ((streak - 1) % 7) + 1 : 1;
    const todayRewardCoins = CALENDAR_REWARDS[dayCycleIndex - 1] ?? 15;

    // Multiplicateur XP & Pièces basé sur la série réelle
    const activityMultiplier = this.getActivityStreakMultiplierFromStreak(streak);
    const bonusPercent = Math.round((activityMultiplier - 1) * 100);

    const canRepair = timelineData.canRepair && wallet.coins >= timelineData.repairCost;

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
      quest: quest
        ? {
            id: quest.id,
            type: quest.questType,
            title: quest.title,
            description: quest.description,
            target: quest.target,
            progress: quest.progress,
            claimed: quest.claimed,
            baseReward: quest.coinsReward,
            streakBonus: Math.min(wallet.questStreak * 10, 80),
            totalReward: Math.min(20 + wallet.questStreak * 10, 100),
            questStreak: wallet.questStreak,
          }
        : null,
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
      // Si un rattrapage est demandé via l'ancien paramètre, rediriger vers repairStreak
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

    // Vérifier si l'utilisateur a joué aujourd'hui
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

    // Mettre à jour UserStreakDay et UserWallet
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

  /** Récupère ou génère une quête pour aujourd'hui. */
  async getOrCreateDailyQuest(userId: string) {
    const today = toLocalDateStr(new Date());

    let quest = await prisma.userDailyQuest.findUnique({
      where: {
        userId_dateStr: { userId, dateStr: today },
      },
    });

    if (!quest) {
      const template = QUEST_TEMPLATES[Math.floor(Math.random() * QUEST_TEMPLATES.length)];
      if (!template) {
        throw createError({
          statusCode: 500,
          statusMessage: "Erreur interne de génération de quête.",
        });
      }
      quest = await prisma.userDailyQuest.create({
        data: {
          userId,
          questType: template.type,
          title: template.title,
          description: template.description,
          target: template.target,
          coinsReward: template.coinsReward,
          dateStr: today,
        },
      });
    }

    return quest;
  }

  /** Réclame les récompenses d'une quête complétée. */
  async claimDailyQuest(userId: string, questId: number) {
    const today = toLocalDateStr(new Date());
    const yesterdayStr = getPastLocalDateStr(1);

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

    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.lastQuestClaimStr === today) {
      throw createError({
        statusCode: 400,
        statusMessage: "Vous avez déjà réclamé une quête aujourd'hui.",
      });
    }

    let newQuestStreak = 1;
    if (wallet.lastQuestClaimStr === yesterdayStr) {
      newQuestStreak = wallet.questStreak + 1;
    }

    const finalReward = Math.min(20 + (newQuestStreak - 1) * 10, 100);

    await prisma.$transaction([
      prisma.userDailyQuest.update({
        where: { id: questId },
        data: { claimed: true },
      }),
      prisma.userWallet.update({
        where: { userId },
        data: {
          coins: { increment: finalReward },
          totalEarned: { increment: finalReward },
          lastQuestClaimStr: today,
          questStreak: newQuestStreak,
        },
      }),
    ]);

    return {
      success: true,
      coinsEarned: finalReward,
      questStreak: newQuestStreak,
    };
  }

  /** Incrémente la progression de la quête active du jour. */
  async incrementQuestProgress(userId: string, questType: string, amount: number) {
    const quest = await this.getOrCreateDailyQuest(userId);

    if (quest && quest.questType === questType && !quest.claimed && quest.progress < quest.target) {
      const newProgress = Math.min(quest.progress + amount, quest.target);
      await prisma.userDailyQuest.update({
        where: { id: quest.id },
        data: { progress: newProgress },
      });
    }
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
