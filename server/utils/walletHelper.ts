import type { Prisma } from "@prisma/client";
import prisma from "~~/server/utils/prisma";
import { computeActivityStreak, toLocalDateStr } from "~~/server/utils/activityStreakHelper";

/** Règle unique de conversion XP → pièces, appliquée par tous les modes de jeu. */
export function coinsFromXp(xp: number): number {
  return Math.max(0, Math.ceil(xp / 10));
}

const DAILY_STREAK_BONUS_STEP = 5;
const DAILY_STREAK_BONUS_MAX = 50;

/** Bonus quotidien de série d'activité : +5 pièces par jour consécutif, plafonné à 50 (jour 10+). */
export function dailyStreakBonus(streak: number): number {
  if (streak <= 0) return 0;
  return Math.min(streak * DAILY_STREAK_BONUS_STEP, DAILY_STREAK_BONUS_MAX);
}

/**
 * Verse le bonus de série d'activité, une seule fois par jour, à la première
 * activité rémunératrice de la journée. La série est calculée depuis les
 * questions répondues (même définition que la page profil) ; seul le marqueur
 * "déjà versé aujourd'hui" est persisté sur le portefeuille.
 */
async function applyDailyActivityBonus(userId: string): Promise<void> {
  const today = toLocalDateStr(new Date());
  const wallet = await prisma.userWallet.findUnique({
    where: { userId },
    select: { lastActivityDay: true },
  });
  if (!wallet || wallet.lastActivityDay === today) return;
  const streak = Math.max(1, await computeActivityStreak(userId));

  await prisma.userWallet.update({
    where: { userId },
    data: {
      lastActivityDay: today,
      activityStreak: streak,
    },
  });
}

/**
 * Crédite des pièces au porte-monnaie global du joueur (créé au premier gain).
 * Tout gain compte comme activité du jour et déclenche le bonus de série,
 * sauf si countsAsActivity est false (rattrapage admin).
 */
export async function grantCoins(
  userId: string,
  amount: number,
  countsAsActivity = true,
  applyMultiplier = true,
): Promise<number> {
  if (amount <= 0) return 0;

  let finalAmount = amount;
  if (applyMultiplier) {
    const wallet = await prisma.userWallet.findUnique({
      where: { userId },
      select: { dailyStreak: true },
    });
    const streak = wallet?.dailyStreak || 0;
    const bonus = streak > 1 ? Math.min((streak - 1) * 0.1, 2.0) : 0;
    finalAmount = Math.ceil(amount * (1 + bonus));
  }

  await prisma.userWallet.upsert({
    where: { userId },
    update: { coins: { increment: finalAmount }, totalEarned: { increment: finalAmount } },
    create: { userId, coins: finalAmount, totalEarned: finalAmount },
  });

  if (countsAsActivity) {
    await applyDailyActivityBonus(userId);
  }

  return finalAmount;
}

/**
 * Rattrapage rétroactif : aligne le cumul de gains de chaque joueur sur son XP
 * totale (totalEarned >= coinsFromXp(xp)) et crédite la différence en pièces.
 * Idempotent : relancer la fonction ne crédite rien de plus tant que l'XP n'a
 * pas augmenté, et les gains déjà comptabilisés depuis le lancement sont déduits.
 */
export async function recalculateWalletsFromXp(): Promise<{
  usersCredited: number;
  coinsGranted: number;
}> {
  const [progresses, wallets] = await Promise.all([
    prisma.userProgress.findMany({ select: { userId: true, xp: true } }),
    prisma.userWallet.findMany({ select: { userId: true, totalEarned: true } }),
  ]);
  const earnedByUser = new Map(wallets.map((w) => [w.userId, w.totalEarned]));

  let usersCredited = 0;
  let coinsGranted = 0;
  for (const progress of progresses) {
    const target = coinsFromXp(progress.xp);
    const diff = target - (earnedByUser.get(progress.userId) ?? 0);
    if (diff > 0) {
      await grantCoins(progress.userId, diff, false);
      usersCredited++;
      coinsGranted += diff;
    }
  }
  return { usersCredited, coinsGranted };
}

/** Recalcule les streaks d'activité et de connexion de tous les portefeuilles à partir des réponses. */
export async function recalculateStreaksFromResponses(): Promise<{
  usersStreaksRecalculated: number;
}> {
  const wallets = await prisma.userWallet.findMany({ select: { userId: true } });

  const todayStr = toLocalDateStr(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalDateStr(yesterday);

  let usersStreaksRecalculated = 0;
  for (const wallet of wallets) {
    const userId = wallet.userId;
    const streak = await computeActivityStreak(userId);

    let lastDailyClaimStr: string | null = null;
    if (streak > 0) {
      const lastResponse = await prisma.questionResponse.findFirst({
        where: { userId },
        orderBy: { date: "desc" },
        select: { date: true },
      });
      if (lastResponse) {
        const lastRespStr = toLocalDateStr(lastResponse.date);
        if (lastRespStr === todayStr) {
          lastDailyClaimStr = todayStr;
        } else {
          lastDailyClaimStr = yesterdayStr;
        }
      }
    }

    await prisma.userWallet.update({
      where: { userId },
      data: {
        activityStreak: streak,
        dailyStreak: streak,
        lastDailyClaimStr,
      },
    });
    usersStreaksRecalculated++;
  }

  return { usersStreaksRecalculated };
}

/**
 * Débite le solde de façon atomique et conditionnelle (anti-double-dépense) :
 * l'update ne matche que si le solde couvre le montant. À appeler dans la même
 * transaction que la création de la possession.
 */
export async function spendCoins(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
): Promise<void> {
  const result = await tx.userWallet.updateMany({
    where: { userId, coins: { gte: amount } },
    data: { coins: { decrement: amount } },
  });
  if (result.count === 0) {
    throw createError({ statusCode: 400, statusMessage: "Pièces insuffisantes." });
  }
}
