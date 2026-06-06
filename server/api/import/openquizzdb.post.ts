import type { OpenQuizzDB } from "#shared/openQuizzDB";
import { importService } from "~~/server/services/ImportService";
import { assertApiKeyOrAdmin } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  await assertApiKeyOrAdmin(event);

  const query = getQuery(event);
  const body = await readBody<OpenQuizzDB>(event);
  return importService.importOpenQuizzDB(body, query.theme?.toString());
});
