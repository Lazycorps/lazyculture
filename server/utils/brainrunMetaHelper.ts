import prisma from "~~/server/utils/prisma";
import { BRAINRUN_TALENTS, type BrainrunTalentId } from "#shared/brainrunTalents";
import { BRAINRUN_DAILY_COIN_CAP } from "~~/server/utils/brainrunConfig";
import { grantCoins } from "~~/server/utils/walletHelper";

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
 * Crédite le porte-monnaie global du joueur (server/utils/walletHelper.ts) pour un palier d'acte
 * Brainrun, plafonné à BRAINRUN_DAILY_COIN_CAP pièces par jour (heure locale serveur, même
 * convention que le Daily quiz) tous paliers Brainrun confondus. Lecture-puis-écriture non
 * atomique (même filet de sécurité assumé que le reste de l'état Brainrun) : un double-clic peut
 * au pire faire dépasser le plafond de quelques pièces, sans conséquence grave. Retourne le
 * montant effectivement crédité (peut être inférieur à `amount` une fois le plafond atteint).
 */
export async function grantBrainrunActCoins(userId: string, amount: number): Promise<number> {
  if (amount <= 0) return 0;
  const today = new Date().toJSON().slice(0, 10);
  const progress = await prisma.brainrunMetaProgress.findUnique({ where: { userId } });
  const earnedToday =
    progress?.coinsEarnedDate?.toJSON().slice(0, 10) === today ? progress.coinsEarnedToday : 0;
  const grantable = Math.max(0, Math.min(amount, BRAINRUN_DAILY_COIN_CAP - earnedToday));

  await prisma.brainrunMetaProgress.upsert({
    where: { userId },
    update: { coinsEarnedToday: earnedToday + grantable, coinsEarnedDate: new Date(today) },
    create: { userId, coinsEarnedToday: grantable, coinsEarnedDate: new Date(today) },
  });
  await grantCoins(userId, grantable);
  return grantable;
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

  const satisfied =
    talent.prerequisites.length === 0 ||
    (talent.requireAll
      ? talent.prerequisites.every((id) => progress.unlockedTalents.includes(id))
      : talent.prerequisites.some((id) => progress.unlockedTalents.includes(id)));
  if (!satisfied) {
    throw createError({ statusCode: 400, statusMessage: "Prérequis non débloqué(s)." });
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
