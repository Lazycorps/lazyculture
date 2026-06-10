import { initPwaInstall } from "~/composables/usePwaInstall";

/**
 * Enregistre le listener beforeinstallprompt dès le démarrage de l'app :
 * Chrome ne le déclenche qu'une seule fois, souvent avant le montage des
 * composants qui en ont besoin.
 */
export default defineNuxtPlugin(() => {
  initPwaInstall();
});
