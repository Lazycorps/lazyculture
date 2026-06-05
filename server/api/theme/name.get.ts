import { themeService } from "~/server/services/ThemeService";

export default defineEventHandler((event) => {
  const query = getQuery(event);
  return themeService.getThemeBySlug(query.theme as string);
});
