import type { Theme } from "~/models/theme";
import { themeService } from "~/server/services/ThemeService";
import { assertAdmin, getAuthenticatedUser } from "~/server/utils/auth";

export default defineEventHandler(async (event) => {
  const userConnected = getAuthenticatedUser(event);
  const admin = await assertAdmin(userConnected.id);
  const theme = await readBody<Theme>(event);
  return themeService.createTheme(theme, admin.name);
});
