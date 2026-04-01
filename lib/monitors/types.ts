export interface Monitor {
  id: string;
  name: string;
  brand: string;
  diagonal: number; // inches
  widthPx: number;
  heightPx: number;
  panelType?: string;
  refreshRate?: number; // Hz
  responseTime?: number; // ms
  brightness?: number; // cd/m2
  contrast?: string;
  ports?: string;
  price?: number;
  imageUrl?: string;
  source?: string;
  // Curved screen info
  curved?: boolean;           // true if monitor has curved screen
  curvatureRadius?: number;   // curve radius in mm (1000R = 1000mm radius)
  curvatureType?: "concave" | "convex"; // concave = curved toward user (typical for monitors)
}

export interface ComparisonState {
  monitors: Monitor[];
  layoutWindows: 2 | 3 | 4 | 6;
  overlayOpacity: number;
  overlayVisible: boolean[];
}

export interface LayoutInfo {
  monitorId: string;
  windows: number;
  windowWidthPx: number;
  windowHeightPx: number;
  windowWidthCm: number;
  windowHeightCm: number;
}
