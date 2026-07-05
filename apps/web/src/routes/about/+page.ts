import { buildAbsoluteUrl } from '$lib/seo/site-origin';

export const load = ({ url }: { url: URL }) => ({
  canonicalUrl: buildAbsoluteUrl(url, '/about'),
  shareImageUrl: buildAbsoluteUrl(url, '/mbta-social-preview.svg')
});
