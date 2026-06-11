import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  ssr: false,
  compatibilityDate: "2024-04-03",
  app: {
    head: {
      titleTemplate: "%s - LazyCulture",
      title: "LazyCulture",
      htmlAttrs: {
        class: "dark",
      },
    },
  },
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },
  modules: ["@nuxtjs/supabase", "@pinia/nuxt", "@nuxt/ui", "@vite-pwa/nuxt"],
  // @ts-expect-error
  pwa: {
    registerType: "autoUpdate",
    manifest: {
      name: "Lazyculture",
      short_name: "Lazyculture",
      description: "Découvrez et apprenez avec Lazyculture",
      theme_color: "#070a13",
      background_color: "#070a13",
      display: "standalone",
      start_url: "/",
      scope: "/",
      orientation: "any",
      icons: [
        {
          src: "/pwa-64x64.png",
          sizes: "64x64",
          type: "image/png",
        },
        {
          src: "/pwa-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/maskable-icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
      navigateFallback: "/200.html",
      cleanupOutdatedCaches: true,
      importScripts: ["/sw-push.js"],
    },
    devOptions: {
      enabled: true,
      type: "module",
    },
  },
  css: ["~/assets/styles/main.css"],
  vite: {
    resolve: {
      alias: {
        ".prisma/client/index-browser": "./node_modules/.prisma/client/index-browser.js",
      },
    },
  },
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
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    public: {
      baseUrl: process.env.BASE_URL || "http://localhost:3000",
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    },
  },
  supabase: {
    redirect: false,
  },
});
