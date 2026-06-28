import Supercluster from 'supercluster';
import type { TrackerVehicle } from './types';

export interface ClusterProperties {
  cluster: true;
  cluster_id: number;
  point_count: number;
  point_count_abbreviated: string;
  vehicle_ids: string[];
  modes: Set<string>;
  center: [number, number];
}

export interface PointProperties {
  cluster: false;
  vehicle_id: string;
  vehicle: TrackerVehicle;
  mode: string;
}

export type ClusterFeature = {
  geometry: { coordinates: [number, number] };
  properties: ClusterProperties;
};

export type PointFeature = {
  geometry: { coordinates: [number, number] };
  properties: PointProperties;
};

export type ClusterItem = ClusterFeature | PointFeature;

/**
 * Initialize Supercluster for vehicle clustering
 * Radius: 80px at zoom 0; adapts to zoom level
 * Max zoom: 18; cluster until Z18
 * Min points: 2 vehicles to create cluster
 */
export function initCluster() {
  return new Supercluster<PointProperties, ClusterProperties>({
    radius: 80,
    maxZoom: 18,
    minPoints: 2,
    map: () => ({
      cluster: false as const,
      vehicle_id: '',
      vehicle: {} as TrackerVehicle,
      mode: ''
    }),
    reduce: (acc, props) => {
      const mode = props.vehicle.mode || 'unknown';
      acc.vehicle_ids = acc.vehicle_ids || [];
      acc.vehicle_ids.push(props.vehicle_id);
      acc.modes = acc.modes || new Set();
      acc.modes.add(mode);
      return acc;
    }
  });
}

/**
 * Load vehicles into cluster index
 */
export function loadVehiclesIntoCluster(
  cluster: Supercluster<PointProperties, ClusterProperties>,
  vehicles: Map<string, TrackerVehicle>
) {
  const points = Array.from(vehicles.entries()).map(([id, vehicle]) => {
    const lat = vehicle.lat || 0;
    const lon = vehicle.lon || 0;
    const mode = vehicle.mode || 'unknown';

    return {
      geometry: { coordinates: [lon, lat] as [number, number] },
      properties: {
        cluster: false as const,
        vehicle_id: id,
        vehicle,
        mode
      }
    };
  });

  cluster.load(points);
  return points;
}

/**
 * Get clusters/points for current map bounds and zoom
 */
export function getClustersForZoom(
  cluster: Supercluster<PointProperties, ClusterProperties>,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  zoom: number
): ClusterItem[] {
  const clusters = cluster.getClusters(
    [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY],
    zoom
  );

  return clusters.map((item) => {
    if (item.properties?.cluster) {
      // This is a cluster
      const clusterId = item.id as number;
      const leaves = cluster.getLeaves(clusterId, Infinity);
      const modes = new Set<string>();
      const vehicleIds: string[] = [];

      leaves.forEach((leaf) => {
        if (leaf.properties?.mode) {
          modes.add(leaf.properties.mode);
        }
        if (leaf.properties?.vehicle_id) {
          vehicleIds.push(leaf.properties.vehicle_id);
        }
      });

      return {
        geometry: { coordinates: item.geometry.coordinates as [number, number] },
        properties: {
          cluster: true as const,
          cluster_id: clusterId,
          point_count: item.properties?.point_count || 0,
          point_count_abbreviated: item.properties?.point_count_abbreviated || '0',
          vehicle_ids: vehicleIds,
          modes,
          center: item.geometry.coordinates as [number, number]
        }
      } as ClusterFeature;
    } else {
      // This is a point (individual vehicle)
      return {
        geometry: { coordinates: item.geometry.coordinates as [number, number] },
        properties: item.properties as PointProperties
      } as PointFeature;
    }
  });
}

/**
 * Get zoom level where cluster expands
 */
export function getExpandZoom(
  cluster: Supercluster<PointProperties, ClusterProperties>,
  clusterId: number
): number {
  return cluster.getExpandZoom(clusterId);
}

/**
 * Determine badge color based on transit mode
 */
export function getModeColor(modes: Set<string>): string {
  if (modes.size === 0) return '#666666'; // Gray for unknown
  if (modes.size === 1) {
    const mode = Array.from(modes)[0].toLowerCase();
    switch (mode) {
      case 'red':
        return '#DA291C'; // Red Line
      case 'blue':
        return '#003DA5'; // Blue Line
      case 'orange':
        return '#ED8936'; // Orange Line
      case 'green':
        return '#00A84F'; // Green Line
      case 'bus':
        return '#FFC72C'; // Bus (yellow)
      default:
        return '#666666';
    }
  }
  // Mixed modes → teal
  return '#0891B2';
}
