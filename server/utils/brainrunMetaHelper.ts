import prisma from "~~/server/utils/prisma";
import { BRAINRUN_TALENTS, type BrainrunTalentId } from "#shared/brainrunTalents";

export type BrainrunMetaProgressResult = {
  knowledgePoints: number;
  unlockedTalents: string[];
};

export async function getMetaProgress(userId: string): Promise<BrainrunMetaProgressResult> {
  const progress = await prisma.brainrunMetaProgress.findUnique({ where: { userId } });
  return progress ?? { knowledgePoints: 0, unlockedTalents: [] };
}

/** Ajoute des Points de Savoir déjà calculés (cf. goldToKnowledgePoints) au solde du joueur. */
export async function grantKnowledgePoints(
  userId: string,
  amount: number,
): Promise<BrainrunMetaProgressResult> {
  if (amount <= 0) return getMetaProgress(userId);
  return prisma.brainrunMetaProgress.upsert({
    where: { userId },
    update: { knowledgePoints: { increment: amount } },
    create: { userId, knowledgePoints: amount, unlockedTalents: [] },
  });
}

/**
 * Débloque un talent : débit atomique et conditionnel du solde de PS (même filet de sécurité
 * anti-double-clic que l'achat en Boutique, cf. BrainrunService.buyShopItem).
 */
export async function unlockTalent(
  userId: string,
  talentId: BrainrunTalentId,
): Promise<BrainrunMetaProgressResult> {
  const talent = BRAINRUN_TALENTS[talentId];
  if (!talent) {
    throw createError({ statusCode: 400, statusMessage: "Talent inconnu." });
  }

  const progress = await getMetaProgress(userId);
  if (progress.unlockedTalents.includes(talentId)) {
    throw createError({ statusCode: 409, statusMessage: "Talent déjà débloqué." });
  }

  const result = await prisma.brainrunMetaProgress.updateMany({
    where: { userId, knowledgePoints: { gte: talent.cost } },
    data: { knowledgePoints: { decrement: talent.cost }, unlockedTalents: { push: talentId } },
  });
  if (result.count === 0) {
    throw createError({ statusCode: 400, statusMessage: "Points de Savoir insuffisants." });
  }
  return getMetaProgress(userId);
}
