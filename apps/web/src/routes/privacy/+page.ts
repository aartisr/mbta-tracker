import { buildAbsoluteUrl } from '$lib/seo/site-origin';

export const load = ({ url }: { url: URL }) => ({
  canonicalUrl: buildAbsoluteUrl(url, '/privacy'),
  shareImageUrl: buildAbsoluteUrl(url, '/mbta-social-preview.svg')
});
