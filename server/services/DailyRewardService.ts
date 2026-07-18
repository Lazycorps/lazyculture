import prisma from "~~/server/utils/prisma";
import { toLocalDateStr } from "~~/server/utils/activityStreakHelper";

const CALENDAR_REWARDS = [15, 20, 25, 30, 35, 45, 100]; // Pièces uniquement (J1-J7)

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

  /** Retourne le statut complet du calendrier, de la quête et du streak d'activité. */
  async getDailyLoginStatus(userId: string) {
    const today = toLocalDateStr(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = toLocalDateStr(yesterdayDate);

    const wallet = await this.getOrCreateWallet(userId);
    const quest = await this.getOrCreateDailyQuest(userId);

    // 1. Calendrier de Connexion
    const claimedToday = wallet.lastDailyClaimStr === today;
    const streakBroken =
      wallet.lastDailyClaimStr !== today && wallet.lastDailyClaimStr !== yesterday;

    // Si streak brisé, on peut rattraper uniquement si on a déjà claim au moins une fois et qu'on a assez de pièces
    const canCatchUp = streakBroken && wallet.lastDailyClaimStr !== null && wallet.coins >= 20;

    // Prochain jour à réclamer (1 à 7)
    let nextDayIndex = 1;
    if (!streakBroken) {
      nextDayIndex = (wallet.dailyStreak % 7) + 1;
    } else {
      // Si la série est brisée mais qu'on ne rattrape pas, le prochain claim repartira au Jour 1
      nextDayIndex = 1;
    }

    // Vérifier si l'utilisateur a répondu à au moins une question aujourd'hui
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const answeredTodayCount = await prisma.questionResponse.count({
      where: {
        userId,
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });
    const hasAnsweredToday = answeredTodayCount > 0;

    // 2. Quête Quotidienne

    // 3. Série d'Activité
    // On lie le multiplicateur au dailyStreak (jours de connexion consécutifs)
    const displayStreak = wallet.dailyStreak;
    const activityMultiplier = this.getActivityStreakMultiplierFromStreak(displayStreak);

    return {
      calendar: {
        claimedToday,
        streakBroken,
        canCatchUp,
        dailyStreak: wallet.dailyStreak,
        nextDayIndex,
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
        streak: displayStreak,
        multiplier: activityMultiplier,
        bonusPercent: Math.round((activityMultiplier - 1) * 100),
      },
    };
  }

  /** Réclame le bonus quotidien. */
  async claimDailyLoginReward(userId: string, catchUp = false) {
    const today = toLocalDateStr(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = toLocalDateStr(yesterdayDate);

    const wallet = await this.getOrCreateWallet(userId);
    const claimedToday = wallet.lastDailyClaimStr === today;
    if (claimedToday) {
      throw createError({ statusCode: 400, statusMessage: "Bonus déjà réclamé aujourd'hui." });
    }

    // Vérifier si l'utilisateur a répondu à au moins une question aujourd'hui
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const answeredTodayCount = await prisma.questionResponse.count({
      where: {
        userId,
        date: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
    });
    if (answeredTodayCount === 0) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Vous devez répondre à au moins une question aujourd'hui avant de pouvoir réclamer votre bonus.",
      });
    }

    const streakBroken =
      wallet.lastDailyClaimStr !== today && wallet.lastDailyClaimStr !== yesterday;

    let finalCoinsGranted = 0;
    let newStreak = 0;

    if (streakBroken) {
      if (catchUp) {
        if (wallet.coins < 20) {
          throw createError({
            statusCode: 400,
            statusMessage: "Pièces insuffisantes pour le rattrapage (requis: 20 🪙).",
          });
        }
        // Le rattrapage sauve le streak :
        // 1. On réclame pour hier (ancien streak + 1)
        const streakForYesterday = wallet.dailyStreak + 1;
        const indexForYesterday = (streakForYesterday - 1) % 7;
        const yesterdayCoins = CALENDAR_REWARDS[indexForYesterday] ?? 0;

        // 2. On réclame pour aujourd'hui (ancien streak + 2)
        newStreak = streakForYesterday + 1;
        const indexForToday = (newStreak - 1) % 7;
        const todayCoins = CALENDAR_REWARDS[indexForToday] ?? 0;

        finalCoinsGranted = yesterdayCoins + todayCoins - 20; // Déduction du coût de rattrapage
      } else {
        // Pas de rattrapage : reset de la série au Jour 1
        newStreak = 1;
        finalCoinsGranted = CALENDAR_REWARDS[0] ?? 15;
      }
    } else {
      // Série non brisée (dernier claim hier ou première fois de la vie du compte)
      newStreak = wallet.dailyStreak + 1;
      const index = (newStreak - 1) % 7;
      finalCoinsGranted = CALENDAR_REWARDS[index] ?? 15;
    }

    // Mise à jour du portefeuille (on n'applique pas le multiplicateur de streak sur le login reward direct)
    await prisma.userWallet.update({
      where: { userId },
      data: {
        coins: { increment: finalCoinsGranted },
        totalEarned: { increment: Math.max(0, finalCoinsGranted) }, // totalEarned ne baisse jamais
        lastDailyClaimStr: today,
        dailyStreak: newStreak,
      },
    });

    return {
      success: true,
      coinsEarned: finalCoinsGranted > 0 ? finalCoinsGranted : 0,
      newStreak,
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
      // Sélectionne un template aléatoire
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
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = toLocalDateStr(yesterdayDate);

    const quest = await prisma.userDailyQuest.findUnique({ where: { id: questId } });
    if (!quest || quest.userId !== userId) {
      throw createError({ statusCode: 404, statusMessage: "Quête non trouvée." });
    }
    if (quest.claimed) {
      throw createError({ statusCode: 400, statusMessage: "Quête déjà réclamée." });
    }
    if (quest.progress < quest.target) {
      throw createError({ statusCode: 400, statusMessage: "Objectif non atteint." });
    }

    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.lastQuestClaimStr === today) {
      throw createError({
        statusCode: 400,
        statusMessage: "Vous avez déjà réclamé une quête aujourd'hui.",
      });
    }

    // Calcul de la série de quêtes
    let newQuestStreak = 1;
    if (wallet.lastQuestClaimStr === yesterday) {
      newQuestStreak = wallet.questStreak + 1;
    }

    // Formule : base 20 + 10 par jour consécutif, max 100
    const finalReward = Math.min(20 + (newQuestStreak - 1) * 10, 100);

    // Créditer les pièces et mettre à jour le streak de quête
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
    // Auto-génération de la quête si elle n'existe pas encore pour s'assurer que l'action compte
    const quest = await this.getOrCreateDailyQuest(userId);

    if (quest && quest.questType === questType && !quest.claimed && quest.progress < quest.target) {
      const newProgress = Math.min(quest.progress + amount, quest.target);
      await prisma.userDailyQuest.update({
        where: { id: quest.id },
        data: { progress: newProgress },
      });
    }
  }

  /** Récupère le multiplicateur de streak d'activité global. */
  async getActivityStreakMultiplier(userId: string): Promise<number> {
    const wallet = await prisma.userWallet.findUnique({ where: { userId } });
    if (!wallet) return 1.0;
    return this.getActivityStreakMultiplierFromStreak(wallet.activityStreak);
  }

  private getActivityStreakMultiplierFromStreak(streak: number): number {
    if (streak <= 1) return 1.0;
    const bonus = Math.min((streak - 1) * 0.1, 2.0); // +10% par jour sup, max +200%
    return 1.0 + bonus;
  }
}

export const dailyRewardService = new DailyRewardService();
