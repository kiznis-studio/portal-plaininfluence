import type { APIRoute } from 'astro';

export const prerender = false;

const siteUrl = 'https://plaininfluence.com';

const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/politicians/', priority: '0.9', changefreq: 'weekly' },
  { path: '/organizations/', priority: '0.9', changefreq: 'weekly' },
  { path: '/issues/', priority: '0.8', changefreq: 'weekly' },
  { path: '/states/', priority: '0.8', changefreq: 'weekly' },
  { path: '/rankings/', priority: '0.8', changefreq: 'weekly' },
  { path: '/about', priority: '0.3', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.2', changefreq: 'yearly' },
  { path: '/terms', priority: '0.2', changefreq: 'yearly' },
  { path: '/contact', priority: '0.3', changefreq: 'yearly' },
];

export const GET: APIRoute = async () => {
  const urls = staticPages.map(p => `  <url>
    <loc>${siteUrl}${p.path}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
};
