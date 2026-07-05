import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  ssr: true,
  compatibilityDate: "2024-04-03",
  app: {
    head: {
      titleTemplate: "%s - LazyCulture",
      title: "LazyCulture",
      htmlAttrs: {
        lang: "fr",
        class: "dark",
      },
      meta: [
        {
          name: "description",
          content:
            "Découvrez et apprenez avec Lazyculture, la plateforme compétitive de quiz et d'apprentissage thématique en culture générale.",
        },
        {
          name: "keywords",
          content:
            "quiz, culture générale, apprentissage, battle royale, showdown, lazyculture, jeux de culture",
        },
        { name: "robots", content: "index, follow" },
        { property: "og:site_name", content: "Lazyculture" },
        { property: "og:type", content: "website" },
        {
          property: "og:title",
          content: "Lazyculture - Plateforme compétitive de Culture Générale",
        },
        {
          property: "og:description",
          content:
            "Découvrez et apprenez avec Lazyculture. Quiz, aventure, duel en temps réel et classement quotidien.",
        },
        {
          property: "og:image",
          content:
            "https://osyurrvwveoeevfsshhz.supabase.co/storage/v1/object/public/images/themes/random.jpg",
        },
        { name: "twitter:card", content: "summary_large_image" },
        {
          name: "twitter:title",
          content: "Lazyculture - Plateforme compétitive de Culture Générale",
        },
        {
          name: "twitter:description",
          content:
            "Découvrez et apprenez avec Lazyculture. Quiz, aventure, duel en temps réel et classement quotidien.",
        },
      ],
    },
  },
  future: {
    compatibilityVersion: 4,
  },
  devtools: { enabled: true },
  modules: ["@nuxtjs/supabase", "@pinia/nuxt", "@nuxt/ui", "@vite-pwa/nuxt"],
  // @ts-expect-error
  pwa: {
    registerType: "prompt",
    client: {
      // Vérifie les mises à jour du service worker toutes les heures
      // pour les sessions qui restent ouvertes longtemps
      periodicSyncForUpdates: 3600,
    },
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
      navigateFallback: "/",
      cleanupOutdatedCaches: true,
      importScripts: ["/sw-push.js"],
    },
    devOptions: {
      enabled: true,
      type: "module",
      navigateFallback: "/",
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
    "/admin/**": { ssr: false },
    "/adventure/**": { ssr: false },
    "/series/battle-royale": { ssr: false },
    "/series/showdown": { ssr: false },
    "/brainrun": { ssr: false },
    "/brainrun/talents": { ssr: false },
    "/login": { ssr: false },
    "/confirm": { ssr: false },
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
