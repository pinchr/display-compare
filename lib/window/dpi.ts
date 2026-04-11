// DPI Calculator - calculates PPI and scaling factors between monitors

export interface MonitorSpecs {
  diagonal: number;      // inches
  widthPx: number;
  heightPx: number;
}

/**
 * Calculate pixel density (PPI) for a monitor
 * PPI = sqrt(width² + height²) / diagonal
 */
export function calculatePPI(monitor: MonitorSpecs): number {
  const { widthPx, heightPx, diagonal } = monitor;
  if (diagonal <= 0) return 96; // Default fallback
  
  const diagonalPx = Math.sqrt(widthPx ** 2 + heightPx ** 2);
  return diagonalPx / diagonal;
}

/**
 * Calculate physical dimensions in mm
 */
export function calculatePhysicalDimensions(monitor: MonitorSpecs): {
  widthMm: number;
  heightMm: number;
  diagonalMm: number;
} {
  const { widthPx, heightPx, diagonal } = monitor;
  const diagonalMm = diagonal * 25.4;
  
  // Aspect ratio
  const aspectRatio = widthPx / heightPx;
  const heightMm = diagonalMm / Math.sqrt(1 + aspectRatio ** 2);
  const widthMm = heightMm * aspectRatio;
  
  return { widthMm, heightMm, diagonalMm };
}

/**
 * Calculate scale factor when moving window between monitors
 * scale = targetPPI / sourcePPI
 * If scale > 1, window grows (higher PPI = more pixels per mm = sharper)
 * If scale < 1, window shrinks
 */
export function calculateScaleFactor(
  sourcePPI: number,
  targetPPI: number
): number {
  if (sourcePPI <= 0) return 1;
  return targetPPI / sourcePPI;
}

/**
 * Calculate scaled window dimensions when moving between monitors
 */
export function calculateScaledWindowDimensions(
  sourceWidth: number,
  sourceHeight: number,
  scaleFactor: number
): {
  scaledWidth: number;
  scaledHeight: number;
} {
  return {
    scaledWidth: Math.round(sourceWidth * scaleFactor),
    scaledHeight: Math.round(sourceHeight * scaleFactor),
  };
}

/**
 * Calculate scaled font size for a window when moving between monitors
 */
export function calculateScaledFontSize(
  sourceFontSize: number,
  sourcePPI: number,
  targetPPI: number
): number {
  const scaleFactor = calculateScaleFactor(sourcePPI, targetPPI);
  return Math.round(sourceFontSize * scaleFactor * 100) / 100;
}

/**
 * Get DPI scale level description
 */
export function getScaleDescription(scaleFactor: number): string {
  if (scaleFactor > 1.5) return 'Much larger (sharper text)';
  if (scaleFactor > 1.2) return 'Larger (sharper text)';
  if (scaleFactor > 0.9) return 'Similar size';
  if (scaleFactor > 0.7) return 'Smaller (more space)';
  if (scaleFactor > 0.5) return 'Much smaller (more space)';
  return 'Significantly smaller';
}

/**
 * Calculate reference scale at common DPI values
 */
export function getCommonDPIScales(): { name: string; ppi: number }[] {
  return [
    { name: 'Standard 1080p 24"', ppi: 92 },
    { name: 'Standard 1440p 27"', ppi: 109 },
    { name: '4K 27"', ppi: 163 },
    { name: '4K 32"', ppi: 138 },
    { name: '5K 27"', ppi: 218 },
  ];
}

/**
 * Convert pixel position to mm on a specific monitor
 */
export function pixelsToMm(
  px: number,
  dimensionPx: number,
  dimensionMm: number
): number {
  if (dimensionPx <= 0) return 0;
  return (px / dimensionPx) * dimensionMm;
}

/**
 * Convert mm to pixel position on a specific monitor
 */
export function mmToPixels(
  mm: number,
  dimensionMm: number,
  dimensionPx: number
): number {
  if (dimensionMm <= 0) return 0;
  return (mm / dimensionMm) * dimensionPx;
}
