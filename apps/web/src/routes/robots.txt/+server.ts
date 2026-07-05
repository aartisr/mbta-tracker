import type { RequestHandler } from './$types';
import { getSiteOrigin } from '$lib/seo/site-origin';

export const GET: RequestHandler = ({ url }) => {
  const origin = getSiteOrigin(url);
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /embed',
    'Disallow: /health',
    `Sitemap: ${origin}/sitemap.xml`,
    `Host: ${origin.replace(/^https?:\/\//, '')}`,
    ''
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
