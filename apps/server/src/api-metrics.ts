export type RequestFailureCounter = {
  requests: number;
  failures: number;
};

export type TimedRequestFailureCounter = RequestFailureCounter & {
  totalMs: number;
};

export type ApiMetrics = {
  search: TimedRequestFailureCounter;
  stopArrivals: TimedRequestFailureCounter;
  routeStops: RequestFailureCounter;
  vehicleInfo: RequestFailureCounter;
  crowdingForecast: RequestFailureCounter;
  boardingSuggestion: RequestFailureCounter;
  myCommutes: RequestFailureCounter;
  commuteRecommendation: RequestFailureCounter;
  emergencyReroute: RequestFailureCounter;
  privacyDashboard: RequestFailureCounter;
  privacyConsent: RequestFailureCounter;
  missions: RequestFailureCounter;
  missionTracking: RequestFailureCounter;
  leaderboard: RequestFailureCounter;
  missionFeedback: RequestFailureCounter;
  communityPosts: RequestFailureCounter;
  rollout: { requests: number };
  telemetry: { requests: number; accepted: number; dropped: number };
};

export function createApiMetrics(): ApiMetrics {
  return {
    search: { requests: 0, failures: 0, totalMs: 0 },
    stopArrivals: { requests: 0, failures: 0, totalMs: 0 },
    routeStops: { requests: 0, failures: 0 },
    vehicleInfo: { requests: 0, failures: 0 },
    crowdingForecast: { requests: 0, failures: 0 },
    boardingSuggestion: { requests: 0, failures: 0 },
    myCommutes: { requests: 0, failures: 0 },
    commuteRecommendation: { requests: 0, failures: 0 },
    emergencyReroute: { requests: 0, failures: 0 },
    privacyDashboard: { requests: 0, failures: 0 },
    privacyConsent: { requests: 0, failures: 0 },
    missions: { requests: 0, failures: 0 },
    missionTracking: { requests: 0, failures: 0 },
    leaderboard: { requests: 0, failures: 0 },
    missionFeedback: { requests: 0, failures: 0 },
    communityPosts: { requests: 0, failures: 0 },
    rollout: { requests: 0 },
    telemetry: { requests: 0, accepted: 0, dropped: 0 }
  };
}
