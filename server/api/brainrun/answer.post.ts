import type { BrainrunResponseDTO } from "#shared/DTO/brainrunResponseDTO";
import { brainrunService } from "~~/server/services/BrainrunService";
import { getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const body = await readBody<BrainrunResponseDTO>(event);
  return brainrunService.submitAnswer(
    body.runId,
    body.questionId,
    body.userResponseId,
    userConnected.id,
  );
});
