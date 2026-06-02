import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: true },
  modules: ["@nuxtjs/supabase", "@pinia/nuxt", "@nuxt/ui"],
  css: ["~/assets/styles/main.css"],
  vite: {
    resolve: {
      alias: {
        ".prisma/client/index-browser": "./node_modules/.prisma/client/index-browser.js",
      },
    },
  },
  // @ts-expect-error
  routeRules: {
    "/": {
      // Temporary redirect using a 307 status code
      redirect: "/themes",
    },
  },
  runtimeConfig: {
    apiKey: "",
    supabaseUrl: process.env.SUPABASE_URL,
    databaseUrl: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
  supabase: {
    redirect: false,
  },
});
