declare module 'supercluster' {
  export default class Supercluster<
    P extends object = object,
    C extends object = object
  > {
    constructor(options?: {
      radius?: number;
      maxZoom?: number;
      minPoints?: number;
      map?: (properties: P) => P;
      reduce?: (accumulated: C, properties: P) => void | C;
    });

    load(points: Array<{
      geometry: { coordinates: [number, number] };
      properties: P;
    }>): void;

    getClusters(
      bbox: [number, number, number, number],
      zoom: number
    ): Array<{
      id?: number | string;
      geometry: { coordinates: [number, number] };
      properties: any;
    }>;

    getLeaves(clusterId: number, limit: number, offset?: number): Array<{
      geometry: { coordinates: [number, number] };
      properties: any;
    }>;

    getExpandZoom(clusterId: number): number;
  }
}
