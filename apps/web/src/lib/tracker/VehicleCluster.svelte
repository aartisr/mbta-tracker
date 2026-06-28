<script lang="ts">
  import type { VehicleUpdate } from './types';
  import {
    initCluster,
    loadVehiclesIntoCluster,
    getClustersForZoom,
    getModeColor,
    type ClusterFeature,
    type PointFeature
  } from './clustering';
  import type maplibregl from 'maplibre-gl';

  export let vehicles: Map<string, VehicleUpdate> = new Map();
  export let zoom: number = 12;
  export let bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  export let onClusterClick: (centerId: number, center: [number, number]) => void = () => {};
  export let onVehicleClick: (vehicleId: string) => void = () => {};
  export let map: maplibregl.Map | null = null;

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

  function handleClusterClick(clusterId: number, center: [number, number]) {
    onClusterClick(clusterId, center);
  }

  function handleVehicleClick(vehicleId: string) {
    onVehicleClick(vehicleId);
  }

  /**
   * Render clusters as GeoJSON features
   * This component doesn't render directly; it provides cluster data
   * TrackerWidget consumes this and adds it to the map via GeoJSON source
   */
</script>

<!-- 
  This component is a data provider for clustering.
  It computes clusters and exposes them for TrackerWidget to render on the map.
  
  Usage in TrackerWidget:
  
  <VehicleCluster
    {vehicles}
    {zoom}
    {bounds}
    {map}
    onClusterClick={handleClusterClick}
    onVehicleClick={handleVehicleClick}
    bind:clusterItems
  />
  
  Then in the map layer:
  - Add a cluster source with GeoJSON from clusterItems
  - Style clusters with count badges and color coding
  - Style individual vehicles with mode-specific icons
-->

<svelte:fragment>
  <!-- Exported data: clusterItems is available to parent via bind: -->
  {#if clusterItems.length > 0}
    <!-- Clusters computed and ready to render -->
  {/if}
</svelte:fragment>

<style>
  /* No styles; this is a data provider component */
</style>
