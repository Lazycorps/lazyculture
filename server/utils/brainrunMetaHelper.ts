import prisma from "~~/server/utils/prisma";
import { BRAINRUN_TALENTS, type BrainrunTalentId } from "#shared/brainrunTalents";

export type BrainrunMetaProgressResult = {
  knowledgePoints: number;
  unlockedTalents: string[];
  discoveredRelics: string[];
  discoveredConsumables: string[];
};

export async function getMetaProgress(userId: string): Promise<BrainrunMetaProgressResult> {
  const progress = await prisma.brainrunMetaProgress.findUnique({ where: { userId } });
  return (
    progress ?? {
      knowledgePoints: 0,
      unlockedTalents: [],
      discoveredRelics: [],
      discoveredConsumables: [],
    }
  );
}

/**
 * Enregistre qu'une relique/un consommable a été obtenu au moins une fois, toutes runs
 * confondues (alimente le glossaire du lobby). Lecture-puis-écriture non atomique : un
 * double-clic peut au pire dupliquer un push, sans conséquence (l'appel suivant lit le
 * doublon et n'écrit rien de plus).
 */
async function recordDiscovery(
  userId: string,
  field: "discoveredRelics" | "discoveredConsumables",
  itemId: string,
): Promise<void> {
  const progress = await prisma.brainrunMetaProgress.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  if (progress[field].includes(itemId)) return;
  await prisma.brainrunMetaProgress.update({
    where: { userId },
    data: { [field]: { push: itemId } },
  });
}

export function recordRelicDiscovery(userId: string, relicId: string): Promise<void> {
  return recordDiscovery(userId, "discoveredRelics", relicId);
}

export function recordConsumableDiscovery(userId: string, consumableId: string): Promise<void> {
  return recordDiscovery(userId, "discoveredConsumables", consumableId);
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
