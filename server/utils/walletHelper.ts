import type { Prisma } from "@prisma/client";
import prisma from "~~/server/utils/prisma";

/** Règle unique de conversion XP → pièces, appliquée par tous les modes de jeu. */
export function coinsFromXp(xp: number): number {
  return Math.max(0, Math.ceil(xp / 10));
}

/** Crédite des pièces au porte-monnaie global du joueur (créé au premier gain). */
export async function grantCoins(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  await prisma.userWallet.upsert({
    where: { userId },
    update: { coins: { increment: amount }, totalEarned: { increment: amount } },
    create: { userId, coins: amount, totalEarned: amount },
  });
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
      await grantCoins(progress.userId, diff);
      usersCredited++;
      coinsGranted += diff;
    }
  }
  return { usersCredited, coinsGranted };
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
