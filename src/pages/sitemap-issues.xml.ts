import type { APIRoute } from 'astro';
import type { D1Database } from '../lib/d1-adapter';
import { getAllIssueCodes } from '../lib/db';

export const prerender = false;

const siteUrl = 'https://plaininfluence.com';

export const GET: APIRoute = async ({ locals }) => {
  const db = (locals as any).runtime?.env?.DB as D1Database;
  const issues = await getAllIssueCodes(db);

  const urls = issues.map(i => `  <url>
    <loc>${siteUrl}/issue/${i.code}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
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
