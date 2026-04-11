# Display Compare - Architecture

## Overview
Display Compare is a web application for comparing monitor specifications and visualizing multi-monitor setups with realistic window scaling simulation.

## Core Features

### 1. Monitor Database (DONE)
- SQLite database with 144 monitors
- Basic specs: diagonal, resolution, panel type, refresh rate
- Source: rtings.com
- Cron job updates details incrementally

### 2. Visual Comparison (MVP)
- SVG-based monitor visualization
- Basic size comparison overlay
- Resolution标注

### 4. Window Simulation - INTEGRATED into Desk View
- ✅ **NOT a separate component** - fully part of Desk View
- ✅ Windows render on monitors in Front View
- ✅ Drag monitors on desk (SVG + 3D)
- ✅ Rotate 90° (portrait/landscape toggle)
- ✅ Realistic font scaling based on: monitor PPI + head distance + FOV
- ✅ Perspective scaling: windows shrink when you move back
- ✅ Per-monitor UI scale slider (0.3x to 3.0x)
- ✅ Head distance control (20-150cm)
- ✅ Scale references: Banana (18cm), iPhone (15cm)
- ✅ **Monitor info overlay**: diagonal, resolution, PPI
- ✅ **App content rendering**: VS Code, Terminal, Browser with realistic content

### 5. 3D Visualization

## NEW: Window Simulation Engine (IN PROGRESS)

### Goals
Allow users to:
1. Compare workstation screen real estate before purchase
2. Drag simulated app windows between monitors
3. See realistic DPI-based scaling (font size, UI elements)
4. Arrange multi-monitor setups (horizontal, vertical, stacked)
5. Preserve scale across different setups

### Three Visualization Modes

#### Mode A: SVG (2D) - PHASE 1
- 2D top-down view of monitors
- Drag & drop windows using mouse/touch
- DPI-aware font scaling calculation
- Position snapping (horizontal/vertical alignment)
- Export layout as PNG

#### Mode B: 3D (Three.js) - PHASE 2
- 3D perspective view of desk setup
- Windows render as floating planes
- Realistic monitor bezels and stands
- Camera rotation controls
- "Desk view" perspective

#### Mode C: AR (WebXR) - PHASE 3
- Place virtual monitors in real physical space
- Scale preserved via AR reference point
- Walk around the virtual setup
- Mobile AR support

### Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DISPLAY COMPARE APP                      │
├─────────────────────────────────────────────────────────────┤
│  UI Layer                                                     │
│  ├── Monitor Selector (dropdown/search)                       │
│  ├── Toolbar (apps + layout controls)                         │
│  ├── Canvas Area (SVG/3D/AR)                                 │
│  └── Setup Manager (save/load layouts)                        │
├─────────────────────────────────────────────────────────────┤
│  Core Engine                                                  │
│  ├── MonitorRegistry (DB + runtime cache)                     │
│  ├── DPI Calculator (PPI, scaling factor)                     │
│  ├── WindowManager (drag, resize, snap)                       │
│  └── LayoutEngine (arrangement, bounds)                        │
├─────────────────────────────────────────────────────────────┤
│  Renderers                                                    │
│  ├── SVGRenderer (DOM + transforms)                            │
│  ├── ThreeRenderer (WebGL scenes)                              │
│  └── XRRenderer (WebXR session)                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Calculations

#### 1. Physical Size (mm)
```
diagonal_mm = diagonal_inch * 25.4
width_mm = diagonal_mm / sqrt(1 + (height_px/width_px)^2)
height_mm = width_mm * (height_px / width_px)
```

#### 2. Pixel Density (PPI)
```
ppi = sqrt(width_px² + height_px²) / diagonal_inch
```

#### 3. Scale Factor Between Monitors
```
scale_A_to_B = ppi_B / ppi_A
```
When dragging window from monitor A to B:
- Window size in px scales by `scale_A_to_B`
- Font size in px scales by `scale_A_to_B`
- UI stays same physical size

#### 4. Coordinate Mapping
```
screen_to_mm(x_px, monitor) = x_px * (width_mm / width_px)
mm_to_screen(mm, monitor) = mm * (width_px / width_mm)
```

### Application Windows

Predefined app "templates" with realistic dimensions:

| App | Base Width (px) | Base Height (px) | DPI-aware |
|-----|-----------------|------------------|-----------|
| VS Code | 1200 | 800 | Yes |
| Chrome | 1280 | 720 | No (responsive) |
| Terminal | 800 | 500 | Yes |
| Slack | 1000 | 700 | Yes |
| Figma | 1400 | 900 | Yes |
| Finder | 900 | 600 | Yes |

### Layout Modes

#### 1. Horizontal
```
┌─────────┐┌─────────┐
│    A    ││    B    │
└─────────┘└─────────┘
Offset B = A.position.x + A.width_mm + bezel_mm
```

#### 2. Vertical
```
┌─────────┐
│    A    │
└─────────┘
┌─────────┐
│    B    │
└─────────┘
Offset B = A.position.y + A.height_mm + bezel_mm
```

#### 3. Stacked (positioned)
```
┌─────────┐
│ A (top)  │
│   ┌─────────┐
└───┤  B      │
    └─────────┘
Z-index support, 50% overlap
```

### Database Schema Updates

```sql
-- Window layouts table (new)
CREATE TABLE layouts (
    id TEXT PRIMARY KEY,
    name TEXT,
    monitors TEXT, -- JSON: [{monitor_id, x, y, z, rotation}, ...]
    windows TEXT,  -- JSON: [{app_type, x, y, width, height, monitor_id}, ...]
    created_at TEXT,
    updated_at TEXT
);

-- Preset app definitions (new table)
CREATE TABLE app_presets (
    id TEXT PRIMARY KEY,
    name TEXT,
    base_width_px INTEGER,
    base_height_px INTEGER,
    min_font_px REAL,
    max_font_px REAL,
    icon_svg TEXT
);
```

### API Endpoints Needed

```
POST /api/layouts           - Create layout
GET  /api/layouts/:id       - Get layout
POST /api/layouts/:id       - Update layout
DELETE /api/layouts/:id     - Delete layout
GET  /api/apps              - List app presets
POST /api/calculate-scale   - Calculate scale between monitors
```

### Performance Targets

- Initial load: < 2s
- Drag FPS: > 60fps (60Hz)
- Single layout: handle 10 monitors + 20 windows
- Switch mode (SVG→3D): < 1s

## Timeline

### Phase 1: SVG (2-3 weeks)
- Basic window drag & drop
- DPI calculation
- Toolbar with app launcher
- Save/load layouts

### Phase 2: 3D (2-3 weeks)
- Three.js setup
- 3D monitor models
- Camera controls
- Window planes in 3D

### Phase 3: AR (3-4 weeks)
- WebXR integration
- Hit testing
- Scale calibration
- Mobile support
