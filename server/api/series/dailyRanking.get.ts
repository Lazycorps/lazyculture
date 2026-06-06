import { seriesService } from "~~/server/services/SeriesService";

export default defineEventHandler(() => seriesService.getDailyRanking());
