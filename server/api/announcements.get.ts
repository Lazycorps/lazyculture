import { announcementService } from "~~/server/services/AnnouncementService";

export default defineEventHandler(async () => {
  return announcementService.getActiveAnnouncements();
});
