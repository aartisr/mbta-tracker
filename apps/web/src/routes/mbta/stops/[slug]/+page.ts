import { error } from '@sveltejs/kit';
import { buildAbsoluteUrl, getSiteOrigin } from '$lib/seo/site-origin';
import { getLandingPage } from '$lib/seo/landing-pages';

export const load = ({ params, url }: { params: { slug: string }; url: URL }) => {
  const landingPage = getLandingPage('stop', params.slug);

  if (!landingPage) {
    throw error(404, 'Stop landing page not found');
  }

  return {
    landingPage,
    canonicalUrl: buildAbsoluteUrl(url, landingPage.path),
    shareImageUrl: buildAbsoluteUrl(url, '/mbta-social-preview.svg'),
    siteOrigin: getSiteOrigin(url)
  };
};
