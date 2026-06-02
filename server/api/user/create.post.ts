import prisma from "~/lib/prisma";
import { getAuthenticatedUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody(event);

  const userInDb = await prisma.user.findFirst({
    where: { id: userConnected.id },
  });
  if (userInDb == null) {
    await prisma.user.create({
      data: {
        id: userConnected.id,
        name: body.name,
        slug: body.slug,
        createDate: new Date(),
        updateDate: new Date(),
      },
    });
  }
});
