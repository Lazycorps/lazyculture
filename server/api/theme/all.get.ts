import { PrismaClient } from "@prisma/client";
import { serverSupabaseClient } from "#supabase/server";

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    return prisma.questionTheme.findMany();
});