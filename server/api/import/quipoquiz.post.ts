import { serverSupabaseClient } from "#supabase/server";
import { importService } from "~~/server/services/ImportService";
import type { QuizzQuipoQuizRequestDTO } from "~~/server/services/ImportService";
import { assertApiKeyOrAdmin } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  await assertApiKeyOrAdmin(event);

  const supabase = await serverSupabaseClient(event);
  const request = await readBody<QuizzQuipoQuizRequestDTO>(event);
  return importService.importQuipoQuiz(supabase, request);
});
