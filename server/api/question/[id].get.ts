import { serverSupabaseClient } from "#supabase/server";
import prisma from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event);
  const query = getQuery(event);

  return await prisma.question.findFirst({ where: { id: query.id as number } });
});
