/**
 * Arrivals Service
 * Fetches and formats arrival predictions from MBTA API
 */

import axios from 'axios';
import type {
  ArrivalForecast,
  StopArrivals,
  Alert,
  RouteStopsResponse,
  RouteStopInfo,
  VehicleInfoResponse,
  VehicleNextStop,
  CrowdingForecastPoint,
  StopCrowdingForecastResponse,
  RouteCrowdingForecastResponse,
  RouteCrowdingStopForecast,
  BoardingSuggestionOption
} from './types';
import { estimateCrowdingPercent, scoreBoardingOption } from './phase2-forecast';

const MBTA_API_BASE = 'https://api-v3.mbta.com';

interface MBTAPrediction {
  id: string;
  attributes: {
    arrival_time?: string;
    departure_time?: string;
    schedule_relationship: string;
    status?: string;
    stop_sequence: number;
  };
  relationships: {
    stop: { data: { id: string } };
    route: { data: { id: string } };
    trip: { data: { id: string } };
    vehicle?: { data: { id: string } | null };
  };
}

interface MBTATrip {
  id: string;
  attributes: {
    headsign: string;
    name: string;
    direction_id: number;
  };
  relationships: {
    route: { data: { id: string } };
  };
}

interface MBTARoute {
  id: string;
  attributes: {
    number: string;
    name: string;
    type: number;
    direction_names: string[];
  };
}

interface MBTAVehicle {
  id: string;
  attributes: {
    label?: string;
    latitude?: number;
    longitude?: number;
  };
}

interface MBTAAlertData {
  id: string;
  attributes: {
    effect: string;
    header: string;
    description: string;
    severity?: string;
  };
}

interface MBTAStopData {
  id: string;
  attributes: {
    name: string;
    latitude: number;
    longitude: number;
    wheelchair_boarding?: 0 | 1 | 2;
  };
}

interface MBTAPredictionForVehicle {
  attributes: {
    arrival_time?: string;
    departure_time?: string;
  };
  relationships: {
    stop: { data: { id: string } };
  };
}

interface MBTARouteSummary {
  id: string;
  attributes: {
    number?: string;
    long_name?: string;
    name?: string;
  };
}

interface MBTAVehicleDetail {
  id: string;
  attributes: {
    label?: string;
    latitude?: number;
    longitude?: number;
    occupancy_status?: string;
    current_status?: string;
  };
  relationships?: {
    route?: { data?: { id: string } };
    trip?: { data?: { id: string } };
  };
}

const modeMap: Record<number, string> = {
  0: 'subway',
  1: 'subway',
  2: 'rail',
  3: 'bus',
  4: 'ferry',
  5: 'cable_car',
  11: 'trolleybus',
};

export class ArrivalsService {
  private readonly forecastHorizons: Array<5 | 15 | 30 | 60> = [5, 15, 30, 60];

  async getStopArrivals(stopId: string): Promise<StopArrivals | null> {
    try {
      // Fetch stop info
      const stopResponse = await axios.get(`${MBTA_API_BASE}/stops/${stopId}`, {
        params: {
          'fields[stop]': 'name,latitude,longitude,accessibility',
        },
        timeout: 5000,
      });

      const stop = stopResponse.data.data;
      if (!stop) {
        return null;
      }

      // Fetch predictions for this stop
      const predictionsResponse = await axios.get(`${MBTA_API_BASE}/predictions`, {
        params: {
          'filter[stop]': stopId,
          'include': 'trip,route,vehicle,stop',
          'fields[prediction]': 'arrival_time,departure_time,schedule_relationship,status',
          'fields[trip]': 'headsign,direction_id',
          'fields[route]': 'number,name,type,direction_names',
          'fields[vehicle]': 'label,latitude,longitude',
          'sort': 'arrival_time',
          'page[limit]': 100,
        },
        timeout: 5000,
      });

      const predictions: MBTAPrediction[] = predictionsResponse.data.data;
      const included = predictionsResponse.data.included || [];

      // Build lookup maps
      const tripsMap = new Map<string, MBTATrip>();
      const routesMap = new Map<string, MBTARoute>();
      const vehiclesMap = new Map<string, MBTAVehicle>();

      for (const item of included) {
        if (item.type === 'trip') {
          tripsMap.set(item.id, item);
        } else if (item.type === 'route') {
          routesMap.set(item.id, item);
        } else if (item.type === 'vehicle') {
          vehiclesMap.set(item.id, item);
        }
      }

      // Parse arrivals and group by direction
      const inbound: ArrivalForecast[] = [];
      const outbound: ArrivalForecast[] = [];

      const now = Date.now();

      for (const prediction of predictions) {
        try {
          const arrivalTime = prediction.attributes.arrival_time
            ? new Date(prediction.attributes.arrival_time).getTime()
            : null;

          if (!arrivalTime || arrivalTime < now) {
            continue; // Skip past arrivals
          }

          const tripId = prediction.relationships.trip.data.id;
          const routeId = prediction.relationships.route.data.id;
          const vehicleId = prediction.relationships.vehicle?.data?.id;

          const trip = tripsMap.get(tripId);
          const route = routesMap.get(routeId);
          const vehicle = vehicleId ? vehiclesMap.get(vehicleId) : null;

          if (!trip || !route) {
            continue;
          }

          const mode = modeMap[route.attributes.type] || 'unknown';
          const direction = route.attributes.direction_names[trip.attributes.direction_id] || 'Unknown';

          const forecast: ArrivalForecast = {
            trip_id: tripId,
            route_id: routeId,
            route_number: route.attributes.number,
            route_name: route.attributes.name,
            mode,
            direction,
            headsign: trip.attributes.headsign,
            vehicle_id: vehicleId,
            arrival_time: arrivalTime,
            eta_seconds: Math.floor((arrivalTime - now) / 1000),
            scheduled_time: arrivalTime, // Would need to fetch schedule separately
            delay_seconds: 0, // Would calculate from actual schedule
            is_live: !!vehicle,
            platform: undefined,
            accessibility_icons: [],
          };

          if (trip.attributes.direction_id === 0) {
            inbound.push(forecast);
          } else {
            outbound.push(forecast);
          }
        } catch (error) {
          console.error('[arrivals] Error parsing prediction:', error);
          continue;
        }
      }

      // Sort by arrival time
      inbound.sort((a, b) => a.arrival_time - b.arrival_time);
      outbound.sort((a, b) => a.arrival_time - b.arrival_time);

      // Fetch alerts for this stop
      const alerts = await this.fetchStopAlerts(stopId);

      return {
        stop_id: stopId,
        stop_name: stop.attributes.name,
        location: {
          latitude: stop.attributes.latitude,
          longitude: stop.attributes.longitude,
        },
        inbound: inbound.slice(0, 10), // Limit to 10 each direction
        outbound: outbound.slice(0, 10),
        alerts,
        last_updated: Date.now(),
      };
    } catch (error) {
      console.error('[arrivals] Error fetching stop arrivals:', error);
      return null;
    }
  }

  async getRouteStops(routeId: string, directionId?: number): Promise<RouteStopsResponse> {
    const params: Record<string, string> = {
      'filter[route]': routeId,
      'fields[stop]': 'name,latitude,longitude,wheelchair_boarding',
      'sort': 'name',
      'page[limit]': '300'
    };

    if (typeof directionId === 'number' && Number.isInteger(directionId)) {
      params['filter[direction_id]'] = String(directionId);
    }

    const [stopsResponse, vehiclesResponse] = await Promise.all([
      axios.get(`${MBTA_API_BASE}/stops`, { params, timeout: 5000 }),
      axios.get(`${MBTA_API_BASE}/vehicles`, {
        params: {
          'filter[route]': routeId,
          'fields[vehicle]': 'route_id,trip_id,label'
        },
        timeout: 5000
      })
    ]);

    const stops: MBTAStopData[] = stopsResponse.data.data || [];
    const vehicles: MBTAVehicle[] = vehiclesResponse.data.data || [];

    const vehicleIds = vehicles
      .map((vehicle) => vehicle.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    const stopsOut: RouteStopInfo[] = stops
      .filter((stop) => typeof stop.attributes.latitude === 'number' && typeof stop.attributes.longitude === 'number')
      .map((stop, index) => ({
        stop_id: stop.id,
        stop_name: stop.attributes.name,
        sequence: index + 1,
        latitude: stop.attributes.latitude,
        longitude: stop.attributes.longitude,
        wheelchair_accessible: stop.attributes.wheelchair_boarding === 1,
        upcoming_vehicle_ids: vehicleIds.slice(0, 3)
      }));

    return {
      route_id: routeId,
      direction_id: typeof directionId === 'number' ? directionId : undefined,
      stops: stopsOut,
      generated_at: Date.now()
    };
  }

  async getVehicleInfo(vehicleId: string): Promise<VehicleInfoResponse | null> {
    try {
      const vehicleResponse = await axios.get(`${MBTA_API_BASE}/vehicles/${vehicleId}`, {
        params: {
          include: 'route,trip,stop',
          'fields[vehicle]': 'label,latitude,longitude,occupancy_status,current_status'
        },
        timeout: 5000
      });

      const vehicle: MBTAVehicleDetail | undefined = vehicleResponse.data?.data;
      if (!vehicle) {
        return null;
      }

      const routeId = vehicle.relationships?.route?.data?.id || '';
      const tripId = vehicle.relationships?.trip?.data?.id;

      const [routeResponse, predictionsResponse] = await Promise.all([
        routeId
          ? axios.get(`${MBTA_API_BASE}/routes/${routeId}`, {
            params: { 'fields[route]': 'number,long_name,name' },
            timeout: 5000
          })
          : Promise.resolve({ data: { data: null } }),
        axios.get(`${MBTA_API_BASE}/predictions`, {
          params: {
            'filter[vehicle]': vehicleId,
            include: 'stop',
            'fields[prediction]': 'arrival_time,departure_time',
            'fields[stop]': 'name',
            sort: 'arrival_time',
            'page[limit]': 5
          },
          timeout: 5000
        })
      ]);

      const route: MBTARouteSummary | null = routeResponse.data?.data || null;

      const predictionItems: MBTAPredictionForVehicle[] = predictionsResponse.data?.data || [];
      const includedItems = predictionsResponse.data?.included || [];

      const stopNameById = new Map<string, string>();
      for (const item of includedItems) {
        if (item.type === 'stop' && item.id && item.attributes?.name) {
          stopNameById.set(item.id, item.attributes.name);
        }
      }

      const now = Date.now();
      const nextStops: VehicleNextStop[] = predictionItems
        .map((prediction) => {
          const stopId = prediction.relationships?.stop?.data?.id;
          const timestamp = prediction.attributes?.arrival_time || prediction.attributes?.departure_time;
          const arrivalTime = timestamp ? new Date(timestamp).getTime() : null;

          if (!stopId || !arrivalTime || arrivalTime <= now) {
            return null;
          }

          return {
            stop_id: stopId,
            stop_name: stopNameById.get(stopId) || stopId,
            arrival_time: arrivalTime,
            eta_seconds: Math.max(0, Math.floor((arrivalTime - now) / 1000))
          };
        })
        .filter((value): value is VehicleNextStop => value !== null)
        .slice(0, 5);

      return {
        vehicle_id: vehicle.id,
        route_id: routeId,
        route_number: route?.attributes?.number || routeId,
        route_name: route?.attributes?.long_name || route?.attributes?.name || routeId,
        trip_id: tripId,
        label: vehicle.attributes?.label,
        latitude: vehicle.attributes?.latitude,
        longitude: vehicle.attributes?.longitude,
        occupancy_status: vehicle.attributes?.occupancy_status,
        current_status: vehicle.attributes?.current_status,
        next_stops: nextStops,
        generated_at: Date.now()
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      throw error;
    }
  }

  async getStopCrowdingForecast(stopId: string): Promise<StopCrowdingForecastResponse | null> {
    const arrivals = await this.getStopArrivals(stopId);
    if (!arrivals) {
      return null;
    }

    const allArrivals = [...arrivals.inbound, ...arrivals.outbound];
    const routeDiversity = new Set(allArrivals.map((arrival) => arrival.route_id)).size;
    const now = Date.now();

    const timeline: CrowdingForecastPoint[] = this.forecastHorizons.map((horizon) => {
      const thresholdSeconds = horizon * 60;
      const arrivalsWithinHorizon = allArrivals.filter((arrival) => arrival.eta_seconds <= thresholdSeconds).length;
      const occupancyPercent = estimateCrowdingPercent({
        baseKey: stopId,
        arrivalsWithinHorizon,
        horizonMinutes: horizon,
        routeDiversity,
        timestampMs: now
      });

      return {
        horizon_minutes: horizon,
        occupancy_percent: occupancyPercent,
        confidence: Math.max(0.35, Math.min(0.92, 0.48 + arrivalsWithinHorizon * 0.06 + routeDiversity * 0.03)),
        sample_size: arrivalsWithinHorizon
      };
    });

    return {
      stop_id: stopId,
      stop_name: arrivals.stop_name,
      generated_at: now,
      timeline
    };
  }

  async getRouteCrowdingForecast(routeId: string, directionId?: number): Promise<RouteCrowdingForecastResponse> {
    const routeStops = await this.getRouteStops(routeId, directionId);
    const now = Date.now();

    const stops: RouteCrowdingStopForecast[] = routeStops.stops.slice(0, 30).map((stop) => {
      const routeDiversity = Math.max(1, stop.upcoming_vehicle_ids.length);
      const timeline: CrowdingForecastPoint[] = this.forecastHorizons.map((horizon) => {
        const arrivalsWithinHorizon = Math.max(1, Math.round(routeDiversity * (1 + (60 - horizon) / 120)));

        return {
          horizon_minutes: horizon,
          occupancy_percent: estimateCrowdingPercent({
            baseKey: `${routeId}:${stop.stop_id}`,
            arrivalsWithinHorizon,
            horizonMinutes: horizon,
            routeDiversity,
            timestampMs: now
          }),
          confidence: Math.max(0.32, Math.min(0.88, 0.4 + routeDiversity * 0.08)),
          sample_size: arrivalsWithinHorizon
        };
      });

      return {
        stop_id: stop.stop_id,
        stop_name: stop.stop_name,
        sequence: stop.sequence,
        timeline
      };
    });

    return {
      route_id: routeId,
      direction_id: routeStops.direction_id,
      generated_at: now,
      stops
    };
  }

  buildBoardingSuggestions(
    fromStop: { stop_id: string; stop_name: string },
    arrivals: ArrivalForecast[],
    crowdingTimeline: CrowdingForecastPoint[],
    preference: 'balanced' | 'fastest' | 'least_crowded'
  ): BoardingSuggestionOption[] {
    if (arrivals.length === 0) {
      return [];
    }

    const crowdingByHorizon = new Map<number, number>(
      crowdingTimeline.map((point) => [point.horizon_minutes, point.occupancy_percent])
    );

    const nearestHorizon = (etaMinutes: number): 5 | 15 | 30 | 60 => {
      if (etaMinutes <= 5) return 5;
      if (etaMinutes <= 15) return 15;
      if (etaMinutes <= 30) return 30;
      return 60;
    };

    const options = arrivals.slice(0, 8).map((arrival) => {
      const etaMinutes = Math.max(1, Math.round(arrival.eta_seconds / 60));
      const delayMinutes = Math.max(0, Math.round(arrival.delay_seconds / 60));
      const crowdingPercent = crowdingByHorizon.get(nearestHorizon(etaMinutes)) || 45;
      const transferCount = 0;

      return {
        route_id: arrival.route_id,
        route_number: arrival.route_number,
        route_name: arrival.route_name,
        headsign: arrival.headsign,
        departure_stop_id: fromStop.stop_id,
        departure_stop_name: fromStop.stop_name,
        eta_minutes: etaMinutes,
        crowding_percent: crowdingPercent,
        transfer_count: transferCount,
        delay_minutes: delayMinutes,
        score: scoreBoardingOption({
          etaMinutes,
          transferCount,
          crowdingPercent,
          delayMinutes,
          preference
        })
      };
    });

    const uniqueByRouteHeadsign = new Map<string, typeof options[number]>();
    for (const option of options) {
      const key = `${option.route_id}:${option.headsign}`;
      if (!uniqueByRouteHeadsign.has(key) || uniqueByRouteHeadsign.get(key)!.score > option.score) {
        uniqueByRouteHeadsign.set(key, option);
      }
    }

    const deduped = Array.from(uniqueByRouteHeadsign.values());
    if (deduped.length === 0) {
      return [];
    }

    const bestOverall = [...deduped].sort((a, b) => a.score - b.score)[0];
    const fastest = [...deduped].sort((a, b) => a.eta_minutes - b.eta_minutes)[0];
    const leastCrowded = [...deduped].sort((a, b) => a.crowding_percent - b.crowding_percent)[0];

    return [
      { option_type: 'best_overall', ...bestOverall },
      { option_type: 'fastest', ...fastest },
      { option_type: 'least_crowded', ...leastCrowded }
    ];
  }

  private async fetchStopAlerts(stopId: string): Promise<Alert[]> {
    try {
      const response = await axios.get(`${MBTA_API_BASE}/alerts`, {
        params: {
          'filter[stop]': stopId,
          'fields[alert]': 'effect,header,description,severity',
        },
        timeout: 5000,
      });

      const alertsData: MBTAAlertData[] = response.data.data || [];

      return alertsData.map(alert => ({
        id: alert.id,
        effect: alert.attributes.effect,
        title: alert.attributes.header,
        description: alert.attributes.description,
        severity: alert.attributes.severity as 'low' | 'medium' | 'high' | undefined,
      }));
    } catch (error) {
      console.error('[arrivals] Error fetching alerts:', error);
      return [];
    }
  }
}
