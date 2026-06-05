import { themeService } from "~/server/services/ThemeService";

export default defineEventHandler(() => themeService.getAllThemes());
