import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AlertCenter from '$lib/AlertCenter.svelte';
import type { TrackerAlert } from '$lib/tracker';

const mockAlerts: TrackerAlert[] = [
  {
    id: 'a-high',
    title: 'Red Line delay',
    detail: 'Subway service experiencing delays',
    severity: 'high'
  },
  {
    id: 'a-low',
    title: 'Bus stop moved',
    detail: 'Bus route detoured for maintenance',
    severity: 'low'
  },
  {
    id: 'a-medium',
    title: 'Harbor update',
    detail: 'Ferry boarding schedule adjusted',
    severity: 'medium'
  }
];

class MockNotification {
  static permission: NotificationPermission = 'default';

  static async requestPermission(): Promise<NotificationPermission> {
    MockNotification.permission = 'granted';
    return 'granted';
  }

  constructor(public title: string, public options?: NotificationOptions) {}

  onclick: (() => void) | null = null;

  close() {
    return;
  }
}

describe('AlertCenter', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('Notification', MockNotification as unknown as typeof Notification);
    MockNotification.permission = 'default';
  });

  it('filters alerts by severity and search query', async () => {
    render(AlertCenter, { alerts: mockAlerts });

    const severity = screen.getByLabelText('Severity:') as HTMLSelectElement;
    const search = screen.getByLabelText('Search alerts') as HTMLInputElement;

    await fireEvent.change(severity, { target: { value: 'high' } });
    await fireEvent.input(search, { target: { value: 'red line' } });

    expect(screen.getByText('Red Line delay')).toBeTruthy();
    expect(screen.queryByText('Bus stop moved')).toBeNull();
    expect(screen.queryByText('Harbor update')).toBeNull();
  });

  it('filters alerts by detected transit mode', async () => {
    render(AlertCenter, { alerts: mockAlerts });

    const mode = screen.getByLabelText('Mode:') as HTMLSelectElement;
    await fireEvent.change(mode, { target: { value: 'ferry' } });

    expect(screen.getByText('Harbor update')).toBeTruthy();
    expect(screen.queryByText('Red Line delay')).toBeNull();
  });

  it('stores notification preferences when enabling browser notifications', async () => {
    render(AlertCenter, { alerts: mockAlerts });

    await fireEvent.click(screen.getByRole('button', { name: /Enable browser notifications/i }));

    await waitFor(() => {
      const raw = localStorage.getItem('mbta_alert_notification_prefs_v1');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.enabled).toBe(true);
    });
  });
});
