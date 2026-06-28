import { createTrackerConfig } from '$lib/tracker/config';

export const load = ({ url }: { url: URL }) => {
  const canonicalUrl = url.toString();

  return {
    config: createTrackerConfig(url, false),
    canonicalUrl,
    shareImageUrl: new URL('/mbta-social-preview.svg', url).toString()
  };
};
