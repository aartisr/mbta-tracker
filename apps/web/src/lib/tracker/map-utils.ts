import type { MBTAStop } from './geo-types';
import type { TrackerVehicle } from './types';
import { vehicleIconName } from './map-icons';

export function toFeatureCollection(vehicles: TrackerVehicle[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: vehicles.map((vehicle) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [vehicle.lon, vehicle.lat]
      },
      properties: {
        id: vehicle.id,
        routeId: vehicle.routeId,
        routeLabel: vehicle.routeLabel,
        mode: vehicle.mode,
        icon: vehicleIconName(vehicle.mode, vehicle.routeId),
        directionId: vehicle.directionId,
        stopId: vehicle.stopId,
        stopSequence: vehicle.stopSequence,
        bearing: vehicle.bearing,
        timestamp: vehicle.timestamp
      }
    }))
  };
}

export function toStopFeatureCollection(stops: MBTAStop[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: stops.map((stop, index) => ({
      type: 'Feature',
      id: index,
      geometry: {
        type: 'Point',
        coordinates: [stop.longitude, stop.latitude]
      },
      properties: {
        id: stop.id,
        name: stop.name,
        wheelchairAccessible: stop.wheelchairAccessible ? 1 : 0,
        icon: stop.wheelchairAccessible ? 'stop-icon-accessible' : 'stop-icon-standard'
      }
    }))
  };
}
