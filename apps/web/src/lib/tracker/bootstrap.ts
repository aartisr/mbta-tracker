import { mountTracker, mountTrackerAuto, mountTrackerSelector } from './public';
import type { MountTrackerOptions } from './public';

export interface TrackerBootstrapApi {
  mountTracker: typeof mountTracker;
  mountTrackerSelector: typeof mountTrackerSelector;
  mountTrackerAuto: typeof mountTrackerAuto;
}

declare global {
  interface Window {
    MBTATracker?: TrackerBootstrapApi;
  }
}

export function createTrackerBootstrapApi(): TrackerBootstrapApi {
  return {
    mountTracker,
    mountTrackerSelector,
    mountTrackerAuto
  };
}

export function installTrackerBootstrap(targetWindow?: Window): TrackerBootstrapApi {
  const resolvedWindow = targetWindow ?? (typeof window !== 'undefined' ? window : undefined);
  if (!resolvedWindow) {
    throw new Error('Tracker bootstrap can only install in the browser.');
  }

  const api = createTrackerBootstrapApi();
  resolvedWindow.MBTATracker = api;
  return api;
}

export function bootstrapTracker(options: MountTrackerOptions) {
  return mountTracker(options);
}
