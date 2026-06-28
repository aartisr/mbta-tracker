import { writable } from 'svelte/store';
export const vehicles = writable(new Map());
export const routeFilter = writable("");
export const wsStatus = writable<'connecting' | 'open' | 'reconnecting' | 'closed'>('closed');
export const wsRetryIn = writable(0);
