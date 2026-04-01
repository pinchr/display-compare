import { Monitor } from "./types";

// Oblicz przekątną monitora w cm (1 cal = 2.54 cm)
export function diagonalToCm(inches: number): number {
  return inches * 2.54;
}

// Oblicz fizyczną szerokość monitora w cm na podstawie przekątnej i proporcji
export function calcWidthCm(diagonal: number, widthPx: number, heightPx: number): number {
  const aspectRatio = widthPx / heightPx;
  const heightInches = diagonal / Math.sqrt(1 + aspectRatio * aspectRatio);
  const widthInches = heightInches * aspectRatio;
  return widthInches * 2.54;
}

// Oblicz fizyczną wysokość monitora w cm
export function calcHeightCm(diagonal: number, widthPx: number, heightPx: number): number {
  const aspectRatio = widthPx / heightPx;
  const heightInches = diagonal / Math.sqrt(1 + aspectRatio * aspectRatio);
  return heightInches * 2.54;
}

// Oblicz DPI (pikseli na cal)
export function calcDPI(widthPx: number, heightPx: number, widthCm: number): number {
  const widthInches = widthCm / 2.54;
  return widthPx / widthInches;
}

// Oblicz PPI (pixels per inch) — to samo co DPI dla monitora
export function calcPPI(widthPx: number, heightPx: number, diagonal: number): number {
  const diagonalPx = Math.sqrt(widthPx * widthPx + heightPx * heightPx);
  return diagonalPx / diagonal;
}

// Formatowanie rozdzielczości jako string
export function formatResolution(width: number, height: number): string {
  return `${width} × ${height}`;
}

// Pobierz wymiary pojedynczego okna przy danym podziale
export function getWindowSize(
  monitor: Monitor,
  windows: 2 | 3 | 4 | 6
): { widthPx: number; heightPx: number; widthCm: number; heightCm: number } {
  const widthCm = calcWidthCm(monitor.diagonal, monitor.widthPx, monitor.heightPx);
  const heightCm = calcHeightCm(monitor.diagonal, monitor.widthPx, monitor.heightPx);

  let cols: number, rows: number;
  switch (windows) {
    case 2:
      cols = 2;
      rows = 1;
      break;
    case 3:
      cols = 3;
      rows = 1;
      break;
    case 4:
      cols = 2;
      rows = 2;
      break;
    case 6:
      cols = 3;
      rows = 2;
      break;
  }

  return {
    widthPx: Math.floor(monitor.widthPx / cols),
    heightPx: Math.floor(monitor.heightPx / rows),
    widthCm: widthCm / cols,
    heightCm: heightCm / rows,
  };
}

// Pobierz proporcje ekranu jako string
export function getAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

// Pobierz powierzchnię ekranu w cm²
export function getSurfaceArea(diagonal: number, widthPx: number, heightPx: number): number {
  const w = calcWidthCm(diagonal, widthPx, heightPx);
  const h = calcHeightCm(diagonal, widthPx, heightPx);
  return w * h;
}

// Kolory dla overlay comparison (outline)
export const OVERLAY_COLORS = [
  "#F59E0B", // amber
  "#22c55e", // green
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#a855f7", // purple
];
