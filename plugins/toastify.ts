import { defineNuxtPlugin } from "#app";
import Vue3Toastify, { type ToastContainerOptions } from "vue3-toastify";
import "vue3-toastify/dist/index.css";

export default defineNuxtPlugin((nuxtApp) => {
  // Enregistrer le composant ToastContainer globalement
  nuxtApp.vueApp.use(Vue3Toastify, {
    autoClose: 3000,
    hideProgressBar: true,
    limit: 1,
  } as ToastContainerOptions);
});
