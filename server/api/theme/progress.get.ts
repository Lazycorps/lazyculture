import { themeService } from "~~/server/services/ThemeService";

export default defineEventHandler((event) => {
  const userConnected = event.context.user;
  const query = getQuery(event);
  return themeService.getThemeProgress(query.theme as string, userConnected?.id);
});
