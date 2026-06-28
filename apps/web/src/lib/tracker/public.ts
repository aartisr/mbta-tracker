import { mount } from 'svelte';
import { default as TrackerWidget } from './TrackerWidget.svelte';
import { DEFAULT_TRACKER_CONFIG } from './config';
import type { TrackerWidgetConfig } from './types';

export { TrackerWidget };
export { DEFAULT_TRACKER_CONFIG };
export type { TrackerWidgetConfig };

export interface MountTrackerOptions {
  target: Element | ShadowRoot;
  config?: Partial<TrackerWidgetConfig>;
}

export function mountTracker({ target, config = {} }: MountTrackerOptions) {
  return mount(TrackerWidget, {
    target,
    props: {
      config: {
        ...DEFAULT_TRACKER_CONFIG,
        ...config
      }
    }
  });
}

export function mountTrackerSelector(selector: string, config: Partial<TrackerWidgetConfig> = {}) {
  if (typeof document === 'undefined') {
    throw new Error('Tracker widget can only mount in the browser.');
  }

  const target = document.querySelector(selector);
  if (!target) {
    throw new Error(`Tracker widget target not found: ${selector}`);
  }

  return mountTracker({ target, config });
}

export function mountTrackerAuto(root?: ParentNode) {
  if (typeof document === 'undefined') {
    return [];
  }

  const resolvedRoot = root ?? document;
  const nodes = Array.from(resolvedRoot.querySelectorAll<HTMLElement>('[data-mbta-tracker]'));
  return nodes.map((node) =>
    mountTracker({
      target: node,
      config: parseMountConfig(node)
    })
  );
}

function parseMountConfig(node: HTMLElement): Partial<TrackerWidgetConfig> {
  const config: Partial<TrackerWidgetConfig> = {};

  if (node.dataset.title) config.title = node.dataset.title;
  if (node.dataset.subtitle) config.subtitle = node.dataset.subtitle;
  if (node.dataset.wsUrl ?? node.dataset.ws) config.wsUrl = node.dataset.wsUrl ?? node.dataset.ws;
  if (node.dataset.mapStyle) config.mapStyle = node.dataset.mapStyle;
  if (node.dataset.center) {
    const parts = node.dataset.center.split(',').map((entry) => Number(entry.trim()));
    if (parts.length === 2 && parts.every((entry) => Number.isFinite(entry))) {
      config.center = [parts[0], parts[1]];
    }
  }
  if (node.dataset.zoom && Number.isFinite(Number(node.dataset.zoom))) config.zoom = Number(node.dataset.zoom);
  if (node.dataset.list) config.showList = node.dataset.list === 'true';
  if (node.dataset.alerts) config.showAlerts = node.dataset.alerts === 'true';
  if (node.dataset.search) config.showSearch = node.dataset.search === 'true';
  if (node.dataset.embed) config.embedded = node.dataset.embed === 'true';

  return config;
}
