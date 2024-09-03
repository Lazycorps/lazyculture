import { PrismaClient } from "@prisma/client";
import { serverSupabaseClient } from "#supabase/server";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const userConnected = (await client.auth.getUser())?.data?.user;
  const query = getQuery(event);
  let ids = await getRandomQuestionsIds(
    query.theme as string,
    userConnected?.id
  );
  if (ids.length == 0)
    ids = await getRandomQuestionsIds(query.theme as string);
  const id = getRandomId(ids);
  return prisma.question.findFirst({ where: { id: id } });
});

const getRandomQuestionsIds = async (theme?: string, userId?: string) => {
  return await prisma.question.findMany({
    where: {
      ...(theme && {
        data: {
          path: ["theme"],
          array_contains: theme as string,
        },
      }),
      ...(userId && {
        Response: {
          none: {
            userId: userId,
            success: true,
          },
        },
      }),
    },
    select: {
      id: true,
    },
  });
};

const getRandomId = (ids: { id: number }[]) => {
  const randomIndex = Math.floor(Math.random() * ids.length);
  return ids[randomIndex].id;
};
