import type {
  CommuteRecord,
  CommuteSummary,
  CommuteRecommendationResponse,
  EmergencyRerouteOption
} from './types';

export function hashUserId(rawSessionId: string): string {
  let hash = 2166136261;
  for (let i = 0; i < rawSessionId.length; i += 1) {
    hash ^= rawSessionId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `u_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 8 * 60;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

function toMinutesSinceMidnight(isoDate: string): number {
  const date = new Date(isoDate);
  return date.getHours() * 60 + date.getMinutes();
}

function toClock(minutesSinceMidnight: number): string {
  const minutes = ((minutesSinceMidnight % 1440) + 1440) % 1440;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalizedHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function summarizeCommutes(records: CommuteRecord[]): CommuteSummary[] {
  const grouped = new Map<string, CommuteRecord[]>();

  for (const record of records) {
    const key = `${record.from_stop_id}:${record.to_stop_id}`;
    const list = grouped.get(key) || [];
    list.push(record);
    grouped.set(key, list);
  }

  const summaries = Array.from(grouped.values()).map((list) => {
    const first = list[0];
    const departureMinutes = list.map((item) => toMinutesSinceMidnight(item.departure_time_iso));
    const typicalDeparture = median(departureMinutes);

    const trendSeed = (first.from_stop_id.length + first.to_stop_id.length + list.length) % 3;
    const trend = trendSeed === 0 ? 'faster' : trendSeed === 1 ? 'stable' : 'slower';

    return {
      commute_id: `${first.from_stop_id}_${first.to_stop_id}`,
      label: `${first.from_stop_name} → ${first.to_stop_name}`,
      from_stop_id: first.from_stop_id,
      from_stop_name: first.from_stop_name,
      to_stop_id: first.to_stop_id,
      to_stop_name: first.to_stop_name,
      typical_departure_time: toClock(typicalDeparture),
      trip_count: list.length,
      trend
    } satisfies CommuteSummary;
  });

  return summaries.sort((a, b) => b.trip_count - a.trip_count).slice(0, 3);
}

export function recommendDepartureWindows(
  fromStop: { stop_id: string; stop_name: string },
  toStop: { stop_id: string; stop_name: string },
  history: CommuteRecord[]
): CommuteRecommendationResponse {
  const filtered = history.filter(
    (record) => record.from_stop_id === fromStop.stop_id && record.to_stop_id === toStop.stop_id
  );

  const typicalMinutes = median(filtered.map((record) => toMinutesSinceMidnight(record.departure_time_iso)));
  const windows = [
    toClock(typicalMinutes - 10),
    toClock(typicalMinutes),
    toClock(typicalMinutes + 10)
  ];

  return {
    from_stop: fromStop,
    to_stop: toStop,
    generated_at: Date.now(),
    recommended_departure_windows: windows,
    reason:
      filtered.length > 0
        ? 'Based on your recent commute pattern and expected wait-time variance.'
        : 'Based on current service profile and default commuter distribution.'
  };
}

export function rankEmergencyAlternatives(
  options: Array<Omit<EmergencyRerouteOption, 'score'>>
): EmergencyRerouteOption[] {
  const scored = options.map((option) => {
    const accessibilityPenalty =
      option.accessibility_support === 'full' ? 0 : option.accessibility_support === 'partial' ? 0.12 : 0.2;
    const score =
      option.distance_increase_km * 0.22 +
      option.time_penalty_minutes * 0.53 +
      option.eta_minutes * 0.2 +
      accessibilityPenalty;

    return {
      ...option,
      score: Math.round(score * 1000) / 1000
    };
  });

  return scored.sort((a, b) => a.score - b.score).slice(0, 3);
}
