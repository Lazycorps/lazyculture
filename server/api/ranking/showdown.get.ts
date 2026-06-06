import { rankingService } from "~~/server/services/RankingService";

export default defineEventHandler(() => rankingService.getShowdownTop());
