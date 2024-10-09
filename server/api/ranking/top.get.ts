import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  return await prisma.userProgress.findMany({
    include: {
      user: true,
    },
    orderBy: [{ xp: "desc" }],
    take: 20,
  });
});
