<script lang="ts">
  import type { TrackerVehicle } from './types';
  import {
    initCluster,
    loadVehiclesIntoCluster,
    getClustersForZoom,
    type ClusterFeature,
    type PointFeature
  } from './clustering';

  export let vehicles: Map<string, TrackerVehicle> = new Map();
  export let zoom: number = 12;
  export let bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

  let cluster = initCluster();
  let clusterItems: (ClusterFeature | PointFeature)[] = [];

  // Update clustering when vehicles change
  $: if (vehicles.size > 0) {
    cluster = initCluster();
    loadVehiclesIntoCluster(cluster, vehicles);
    updateClusterDisplay();
  }

  // Recompute clusters when zoom or bounds change
  $: if (bounds && zoom >= 0) {
    updateClusterDisplay();
  }

  function updateClusterDisplay() {
    if (!bounds) return;
    clusterItems = getClustersForZoom(cluster, bounds, Math.floor(zoom));
  }

</script>
