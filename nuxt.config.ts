// https://nuxt.com/docs/api/configuration/nuxt-config
import vuetify from "vite-plugin-vuetify";

export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },
  css: ["vuetify/styles", "@/assets/styles/main.scss"],
  modules: [
    "@prisma/nuxt",

    async (options, nuxt) => {
      nuxt.hooks.hook("vite:extendConfig", (config) =>
        // @ts-ignore
        config.plugins.push(
          vuetify({
            autoImport: true,
            styles: {
              configFile: "assets/styles/vuetify.scss",
            },
          })
        )
      );
    },
  ],
  vite: {
    ssr: {
      noExternal: ["vuetify"],
    },
  },
});
