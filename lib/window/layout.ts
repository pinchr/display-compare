// Multi-monitor layout arrangements

export type LayoutMode = 'horizontal' | 'vertical' | 'stacked' | 'free';

export interface LayoutConfig {
  mode: LayoutMode;
  bezelMm: number;  // Gap between monitors in mm
  alignTop: boolean;
}

export const LAYOUT_PRESETS: Record<LayoutMode, LayoutConfig> = {
  horizontal: {
    mode: 'horizontal',
    bezelMm: 5,
    alignTop: true,
  },
  vertical: {
    mode: 'vertical',
    bezelMm: 5,
    alignTop: true,
  },
  stacked: {
    mode: 'stacked',
    bezelMm: 0,
    alignTop: true,
  },
  free: {
    mode: 'free',
    bezelMm: 0,
    alignTop: false,
  },
};

export interface MonitorPosition {
  monitorId: string;
  x: number;  // mm from origin
  y: number;  // mm from origin
  rotation: number;  // degrees
  widthMm: number;
  heightMm: number;
}

/**
 * Calculate monitor positions for a given layout mode
 */
export function calculateLayout(
  monitors: Array<{ id: string; widthMm: number; heightMm: number }>,
  mode: LayoutMode,
  config: LayoutConfig = LAYOUT_PRESETS.horizontal
): MonitorPosition[] {
  const positions: MonitorPosition[] = [];
  let currentX = 0;
  let currentY = 0;
  let maxHeightInRow = 0;

  monitors.forEach((monitor, index) => {
    if (mode === 'horizontal') {
      // Position monitors side by side
      positions.push({
        monitorId: monitor.id,
        x: currentX,
        y: config.alignTop ? 0 : (maxHeightInRow - monitor.heightMm) / 2,
        rotation: 0,
        widthMm: monitor.widthMm,
        heightMm: monitor.heightMm,
      });
      currentX += monitor.widthMm + config.bezelMm;
      maxHeightInRow = Math.max(maxHeightInRow, monitor.heightMm);
    } else if (mode === 'vertical') {
      // Stack monitors vertically
      positions.push({
        monitorId: monitor.id,
        x: config.alignTop ? 0 : (monitor.widthMm / 2),
        y: currentY,
        rotation: 0,
        widthMm: monitor.widthMm,
        heightMm: monitor.heightMm,
      });
      currentY += monitor.heightMm + config.bezelMm;
    } else if (mode === 'stacked') {
      // Overlap monitors (50% offset)
      positions.push({
        monitorId: monitor.id,
        x: currentX,
        y: currentY,
        rotation: 0,
        widthMm: monitor.widthMm,
        heightMm: monitor.heightMm,
      });
      currentX += monitor.widthMm * 0.5;
      currentY += monitor.heightMm * 0.5;
    } else {
      // Free mode - place at origin
      positions.push({
        monitorId: monitor.id,
        x: index * 50,
        y: index * 50,
        rotation: 0,
        widthMm: monitor.widthMm,
        heightMm: monitor.heightMm,
      });
    }
  });

  return positions;
}

/**
 * Get total dimensions of a multi-monitor setup
 */
export function getLayoutDimensions(
  positions: MonitorPosition[]
): { widthMm: number; heightMm: number } {
  if (positions.length === 0) return { widthMm: 0, heightMm: 0 };

  let maxX = 0;
  let maxY = 0;

  positions.forEach((pos) => {
    const right = pos.x + pos.widthMm;
    const bottom = pos.y + pos.heightMm;
    maxX = Math.max(maxX, right);
    maxY = Math.max(maxY, bottom);
  });

  return { widthMm: maxX, heightMm: maxY };
}
