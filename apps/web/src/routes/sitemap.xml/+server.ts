import type { RequestHandler } from './$types';
import { getSiteOrigin } from '$lib/seo/site-origin';

type SitemapPage = {
  path: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: string;
};

const PAGES: SitemapPage[] = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/share', changefreq: 'weekly', priority: '0.9' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.6' }
];

export const GET: RequestHandler = ({ url }) => {
  const origin = getSiteOrigin(url);
  const today = new Date().toISOString().slice(0, 10);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map((page) => `  <url>
    <loc>${origin}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
