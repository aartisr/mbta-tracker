import { createTrackerConfig } from '$lib/tracker/config';

export const load = ({ url }: { url: URL }) => {
  return {
    config: createTrackerConfig(url, true)
  };
};
