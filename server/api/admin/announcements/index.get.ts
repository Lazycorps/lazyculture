import { announcementService } from "~~/server/services/AnnouncementService";
import { assertAdmin, getAuthenticatedUser } from "~~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  await assertAdmin(userConnected.id);
  return announcementService.adminList();
});
