import prisma from "~~/server/utils/prisma";
import { getAuthenticatedUser, assertAdmin } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  const paths = await prisma.adventure.findMany({
    orderBy: { createDate: "desc" },
    include: {
      stages: {
        select: {
          id: true,
          sequence: true,
          type: true,
          title: true,
        },
      },
    },
  });

  return paths;
});
