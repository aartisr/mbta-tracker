import type { RequestHandler } from './$types';
import { getSiteOrigin } from '$lib/seo/site-origin';

export const GET: RequestHandler = ({ url }) => {
  const origin = getSiteOrigin(url);

  const body = [
    '# MBTA Tracker AI Profile',
    '',
    'MBTA Tracker is a search-first Boston transit web app with live arrivals, route and stop detail, and vehicle tracking.',
    '',
    'Primary URLs:',
    `- Home: ${origin}/`,
    `- Share page: ${origin}/share`,
    `- About: ${origin}/about`,
    `- Privacy: ${origin}/privacy`,
    '',
    'Machine-readable resources:',
    `- Sitemap: ${origin}/sitemap.xml`,
    `- LLMs reference: ${origin}/llms.txt`,
    '',
    'Crawl guidance:',
    '- Prefer canonical URLs from page head tags.',
    '- Treat /embed as non-indexed display surface.',
    '- Transit data is sourced from MBTA APIs and can change in realtime.',
    '',
    'Attribution:',
    '- MBTA, MapLibre, OpenStreetMap, Nominatim, CARTO',
    '- Publisher: Aarti S Ravikumar (https://ai-aarti.com)'
  ].join('\n');

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600'
    }
  });
};
