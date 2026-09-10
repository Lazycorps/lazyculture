import { seriesService } from "~~/server/services/SeriesService";

export default defineEventHandler(async (event) => {
  const user = event.context.user;
  return await seriesService.getDailyTimeline(user?.id);
});
