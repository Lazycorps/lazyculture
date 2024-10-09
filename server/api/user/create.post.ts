import { serverSupabaseUser } from "#supabase/server";
import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  const userConnected = await serverSupabaseUser(event);
  const body = await readBody(event);
  if (userConnected == null) return;

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
