import type { TrackerVehicle } from './types';

export type VehicleIconMode = Exclude<TrackerVehicle['mode'], 'all'>;

// MBTA route colors from MBTA v3 routes API (type=3 bus routes use FFC72C; SL uses silver 7C878E).
export const MBTA_ROUTE_PALETTES: Record<string, { body: string; stroke: string; accent: string }> = {
  red:     { body: '#DA291C', stroke: '#A31F15', accent: '#FF8A80' },
  orange:  { body: '#ED8B00', stroke: '#C47300', accent: '#FFD080' },
  blue:    { body: '#003DA5', stroke: '#002D7C', accent: '#80A3FF' },
  green:   { body: '#00843D', stroke: '#006630', accent: '#80E8AA' },
  silver:  { body: '#7C878E', stroke: '#5A6470', accent: '#C8D0D6' },
  purple:  { body: '#80276C', stroke: '#5E1C50', accent: '#E0A8D0' },
  ferry:   { body: '#0284c7', stroke: '#0369a1', accent: '#7DD3FC' },
  bus:     { body: '#FFC72C', stroke: '#1F2937', accent: '#CBD5E1' },
};

export function normalizeVehicleIconMode(mode: TrackerVehicle['mode']): VehicleIconMode {
  const normalized = String(mode).trim().toLowerCase();
  switch (normalized) {
    case 'subway':
      return 'subway';
    case 'commuter-rail':
    case 'commuter_rail':
    case 'commuter rail':
    case 'rail':
    case 'commuter':
      return 'commuter-rail';
    case 'ferry':
    case 'boat':
      return 'ferry';
    case 'all':
    case 'bus':
    default:
      return 'bus';
  }
}

export function routeColorKey(routeId: string | null, mode: TrackerVehicle['mode']): string {
  const id = (routeId ?? '').toLowerCase();
  if (id === 'red' || id === 'mattapan') return 'red';
  if (id === 'orange') return 'orange';
  if (id === 'blue') return 'blue';
  if (id.startsWith('green')) return 'green';
  if (id === 'silver' || id.startsWith('sl')) return 'silver';
  if (mode === 'commuter-rail') return 'purple';
  if (mode === 'ferry') return 'ferry';
  return 'bus';
}

export function vehicleIconName(mode: TrackerVehicle['mode'], routeId: string | null | undefined = undefined): string {
  const colorKey = routeColorKey(routeId ?? null, mode);
  return `vehicle-icon-${normalizeVehicleIconMode(mode)}-${colorKey}`;
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

export function createVehicleIconImage(
  mode: VehicleIconMode,
  palette: { body: string; stroke: string; accent: string }
): ImageData {
  const canvas = document.createElement('canvas');
  const size = 56;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to render vehicle icon canvas.');
  }

  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Soft drop shadow under the vehicle body.
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2 + 13, 10, 3.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
  ctx.fill();

  // Front direction nose so heading is obvious when icon rotates.
  ctx.beginPath();
  ctx.moveTo(size / 2, 4);
  ctx.lineTo(size / 2 - 4.6, 11.5);
  ctx.lineTo(size / 2 + 4.6, 11.5);
  ctx.closePath();
  ctx.fillStyle = palette.body;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = palette.stroke;
  ctx.stroke();

  ctx.strokeStyle = palette.stroke;
  ctx.fillStyle = palette.body;

  if (mode === 'bus') {
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    roundedRectPath(ctx, 18, 16, 20, 25, 6);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    roundedRectPath(ctx, 21, 20, 14, 8, 2.6);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(22.5, 32);
    ctx.lineTo(33.5, 32);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = palette.accent;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(22, 40.5, 2.1, 0, Math.PI * 2);
    ctx.arc(34, 40.5, 2.1, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
  } else if (mode === 'subway') {
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    roundedRectPath(ctx, 15, 12, 26, 32, 6);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    roundedRectPath(ctx, 15, 12, 26, 9, 5);
    ctx.fillStyle = palette.accent;
    ctx.fill();

    ctx.beginPath();
    roundedRectPath(ctx, 18, 25, 9, 7, 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.88;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    roundedRectPath(ctx, 29, 25, 9, 7, 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.88;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.moveTo(28, 34);
    ctx.lineTo(28, 44);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = palette.stroke;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(20, 46.5, 2.4, 0, Math.PI * 2);
    ctx.arc(36, 46.5, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
  } else if (mode === 'commuter-rail') {
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    roundedRectPath(ctx, 16, 10, 24, 34, 7);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    roundedRectPath(ctx, 19, 16, 18, 11, 3);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    roundedRectPath(ctx, 19, 31, 8, 6, 2);
    roundedRectPath(ctx, 29, 31, 8, 6, 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(21, 47, 2.6, 0, Math.PI * 2);
    ctx.arc(35, 47, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
  } else {
    // Ferry silhouette.
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(17, 34);
    ctx.lineTo(39, 34);
    ctx.lineTo(35, 40);
    ctx.lineTo(21, 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    roundedRectPath(ctx, 24.5, 25, 7, 6, 1.8);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(17.5, 43.5);
    ctx.quadraticCurveTo(21, 41.8, 24.5, 43.5);
    ctx.quadraticCurveTo(28, 45.2, 31.5, 43.5);
    ctx.quadraticCurveTo(35, 41.8, 38.5, 43.5);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = palette.accent;
    ctx.stroke();
  }

  return ctx.getImageData(0, 0, size, size);
}

export function createStopIcon(accessible: boolean): ImageData {
  const size = 48;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot create stop icon canvas.');

  const bodyColor = accessible ? '#0369a1' : '#64748b';
  const strokeColor = accessible ? '#075985' : '#475569';
  const cx = size / 2;
  const cy = 15;
  const r = 12;

  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.ellipse(cx, size - 4, 6, 2.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.fill();

  const tipY = size - 6;
  const halfAngle = Math.asin(5 / r);
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI / 2 + halfAngle, Math.PI / 2 - halfAngle + Math.PI * 2);
  ctx.lineTo(cx, tipY);
  ctx.closePath();
  ctx.fillStyle = bodyColor;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = strokeColor;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.font = 'bold 9px "Avenir Next", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = bodyColor;
  ctx.fillText('T', cx, cy + 0.5);

  if (accessible) {
    ctx.beginPath();
    ctx.arc(cx + r - 1, cy - r + 1, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#16a34a';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + r - 1, cy - r + 1, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  return ctx.getImageData(0, 0, size, size);
}

export async function addVehicleIcons(
  mapInstance: import('maplibre-gl').Map,
  maplibregl: typeof import('maplibre-gl')
): Promise<void> {
  void maplibregl; // referenced for type inference, not used directly here
  const modes: VehicleIconMode[] = ['bus', 'subway', 'commuter-rail', 'ferry'];
  const colorKeys = Object.keys(MBTA_ROUTE_PALETTES) as (keyof typeof MBTA_ROUTE_PALETTES)[];

  for (const mode of modes) {
    for (const colorKey of colorKeys) {
      const iconName = `vehicle-icon-${mode}-${colorKey}`;
      const palette = MBTA_ROUTE_PALETTES[colorKey];
      const iconImage = createVehicleIconImage(mode, palette);

      if (mapInstance.hasImage(iconName)) {
        mapInstance.updateImage(iconName, iconImage);
      } else {
        mapInstance.addImage(iconName, iconImage);
      }
    }
  }

  for (const accessible of [true, false]) {
    const stopIconName = accessible ? 'stop-icon-accessible' : 'stop-icon-standard';
    const stopImage = createStopIcon(accessible);
    if (mapInstance.hasImage(stopIconName)) {
      mapInstance.updateImage(stopIconName, stopImage);
    } else {
      mapInstance.addImage(stopIconName, stopImage);
    }
  }
}
