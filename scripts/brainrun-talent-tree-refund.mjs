// One-off : à exécuter une seule fois au déploiement du nouvel arbre de talents Brainrun
// (Résistance/Dégâts/Utilitaire), avant/avec le nouveau shared/brainrunTalents.ts qui ne connaît
// plus les 4 anciens ids. Rembourse en Points de Savoir tout joueur ayant déjà débloqué un ou
// plusieurs des anciens talents plats, puis vide unlockedTalents pour repartir sur l'arbre.
//
// Usage : node --env-file=.env scripts/brainrun-talent-tree-refund.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Coûts figés au moment de la migration (shared/brainrunTalents.ts avant refonte) — codés en dur
// ici plutôt que lus depuis le catalogue, qui ne contient plus ces ids.
const OLD_TALENT_COSTS = {
  TOUGH_START: 30,
  RARE_FINDER: 50,
  STARTING_CAPITAL: 30,
  BOSS_STRIKE: 50,
};

async function main() {
  console.log("Remboursement des anciens talents Brainrun...");

  const progresses = await prisma.brainrunMetaProgress.findMany({
    where: { unlockedTalents: { isEmpty: false } },
  });

  let usersRefunded = 0;
  let totalRefunded = 0;

  for (const progress of progresses) {
    const refund = progress.unlockedTalents.reduce(
      (sum, id) => sum + (OLD_TALENT_COSTS[id] ?? 0),
      0,
    );

    await prisma.brainrunMetaProgress.update({
      where: { userId: progress.userId },
      data: {
        knowledgePoints: { increment: refund },
        unlockedTalents: [],
      },
    });

    usersRefunded++;
    totalRefunded += refund;
    console.log(
      `  ${progress.userId} : +${refund} PS (anciens talents : ${progress.unlockedTalents.join(", ")})`,
    );
  }

  console.log(`Terminé : ${usersRefunded} joueur(s) remboursé(s), ${totalRefunded} PS au total.`);
}

main()
  .catch((e) => {
    console.error("Erreur durant le remboursement :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
