import { seriesService } from "~~/server/services/SeriesService";

export default defineEventHandler(async () => {
  return await seriesService.getDailyDays();
});
