import prisma from "~~/server/utils/prisma";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const baseUrl = config.public.baseUrl || "https://lazyculture.fr";

  // Set the response header to XML
  setHeader(event, "Content-Type", "text/xml");

  // Fetch themes
  const themes = await prisma.questionTheme.findMany({ select: { slug: true, updateDate: true } });

  interface SitemapUrl {
    loc: string;
    lastmod?: string;
    changefreq: string;
    priority: string;
  }

  const staticUrls: SitemapUrl[] = [
    { loc: "/themes", changefreq: "weekly", priority: "1.0" },
    { loc: "/multiplayer", changefreq: "weekly", priority: "0.8" },
    { loc: "/ranking", changefreq: "daily", priority: "0.7" },
    { loc: "/ranking/daily", changefreq: "daily", priority: "0.7" },
    { loc: "/series/daily", changefreq: "daily", priority: "0.9" },
  ];

  const themeUrls: SitemapUrl[] = themes.map((theme) => ({
    loc: `/themes/${theme.slug}`,
    lastmod: theme.updateDate.toISOString(),
    changefreq: "weekly",
    priority: "0.8",
  }));

  const allUrls: SitemapUrl[] = [...staticUrls, ...themeUrls];

  const urlElements = allUrls
    .map((url) => {
      let el = "  <url>\n";
      el += `    <loc>${baseUrl}${url.loc}</loc>\n`;
      if ("lastmod" in url && url.lastmod) {
        el += `    <lastmod>${url.lastmod}</lastmod>\n`;
      } else {
        el += `    <lastmod>${new Date().toISOString()}</lastmod>\n`;
      }
      el += `    <changefreq>${url.changefreq}</changefreq>\n`;
      el += `    <priority>${url.priority}</priority>\n`;
      el += "  </url>";
      return el;
    })
    .join("\n");

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlElements}
</urlset>`;

  return sitemapXml;
});
