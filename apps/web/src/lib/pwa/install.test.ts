import { describe, expect, it, vi } from 'vitest';
import { isInstallPromptEvent } from './install';

describe('PWA install boundary', () => {
  it('recognizes a browser install-prompt event without coupling UI to browser globals', () => {
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn(async () => undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' as const })
    });

    expect(isInstallPromptEvent(event)).toBe(true);
  });

  it('does not treat ordinary events as install prompts', () => {
    expect(isInstallPromptEvent(new Event('click'))).toBe(false);
  });
});
