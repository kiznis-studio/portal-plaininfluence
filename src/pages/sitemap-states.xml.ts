import type { APIRoute } from 'astro';
import { getAllStateAbbrs } from '../lib/db';

export const prerender = false;

const siteUrl = 'https://plaininfluence.com';

export const GET: APIRoute = async ({ locals }) => {
  const db = locals.runtime.env.DB;
  const states = await getAllStateAbbrs(db);

  const urls = states.map(s => `  <url>
    <loc>${siteUrl}/state/${s.abbr}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
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
