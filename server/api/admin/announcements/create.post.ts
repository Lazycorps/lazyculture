import { announcementService } from "~~/server/services/AnnouncementService";
import { assertAdmin, getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);

  const body = await readBody(event);
  if (!body.title?.trim() || !body.description?.trim() || !body.tag?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le titre, la description et le tag sont requis.",
    });
  }

  return announcementService.adminCreate(body);
});
