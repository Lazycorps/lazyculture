export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const baseUrl = config.public.baseUrl || "https://lazyculture.fr";

  // Set response headers to plain text
  setHeader(event, "Content-Type", "text/plain");

  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /adventure/",
    "Disallow: /series/battle-royale",
    "Disallow: /series/showdown",
    "Disallow: /confirm",
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`,
  ].join("\n");
});
