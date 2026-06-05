import { serverSupabaseClient } from "#supabase/server";
import { importService } from "~/server/services/ImportService";
import type { QuizzCultureRequestDTO } from "~/server/services/ImportService";
import { assertApiKeyOrAdmin } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  await assertApiKeyOrAdmin(event);

  const supabase = await serverSupabaseClient(event);
  const request = await readBody<QuizzCultureRequestDTO>(event);
  return importService.importCultureQuizz(supabase, request);
});
