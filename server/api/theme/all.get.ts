import { PrismaClient } from "@prisma/client";
import { serverSupabaseClient } from "#supabase/server";
const config = useRuntimeConfig();
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
});

export default defineEventHandler(async (event) => {
  return prisma.questionTheme.findMany();
});
