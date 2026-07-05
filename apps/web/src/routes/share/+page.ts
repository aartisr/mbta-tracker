import { createTrackerConfig } from '$lib/tracker/config';
import { buildAbsoluteUrl } from '$lib/seo/site-origin';

export const load = ({ url }: { url: URL }) => {
  const canonicalUrl = buildAbsoluteUrl(url, '/share');

  return {
    config: createTrackerConfig(url, false),
    canonicalUrl,
    shareImageUrl: buildAbsoluteUrl(url, '/mbta-social-preview.svg')
  };
};
