export type InstallOutcome = 'accepted' | 'dismissed';

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome }>;
}

export function isInstallPromptEvent(event: Event): event is InstallPromptEvent {
  return 'prompt' in event && 'userChoice' in event;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
