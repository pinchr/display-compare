// Application presets for window simulation
// Base dimensions at reference DPI (96 PPI)

export interface AppPreset {
  id: string;
  name: string;
  baseWidthPx: number;
  baseHeightPx: number;
  minFontPx: number;
  maxFontPx: number;
  icon: string;
  category: 'development' | 'browser' | 'communication' | 'design' | 'productivity' | 'system' | 'media';
}

export const APP_PRESETS: AppPreset[] = [
  {
    id: 'vscode',
    name: 'VS Code',
    baseWidthPx: 1200,
    baseHeightPx: 800,
    minFontPx: 12,
    maxFontPx: 18,
    icon: '📝',
    category: 'development',
  },
  {
    id: 'chrome',
    name: 'Chrome',
    baseWidthPx: 1280,
    baseHeightPx: 720,
    minFontPx: 12,
    maxFontPx: 16,
    icon: '🌐',
    category: 'browser',
  },
  {
    id: 'terminal',
    name: 'Terminal',
    baseWidthPx: 800,
    baseHeightPx: 500,
    minFontPx: 11,
    maxFontPx: 14,
    icon: '💻',
    category: 'system',
  },
  {
    id: 'slack',
    name: 'Slack',
    baseWidthPx: 1000,
    baseHeightPx: 700,
    minFontPx: 12,
    maxFontPx: 16,
    icon: '💬',
    category: 'communication',
  },
  {
    id: 'figma',
    name: 'Figma',
    baseWidthPx: 1400,
    baseHeightPx: 900,
    minFontPx: 11,
    maxFontPx: 14,
    icon: '🎨',
    category: 'design',
  },
  {
    id: 'finder',
    name: 'Finder',
    baseWidthPx: 900,
    baseHeightPx: 600,
    minFontPx: 12,
    maxFontPx: 16,
    icon: '📁',
    category: 'productivity',
  },
  {
    id: 'notion',
    name: 'Notion',
    baseWidthPx: 1000,
    baseHeightPx: 700,
    minFontPx: 12,
    maxFontPx: 16,
    icon: '📋',
    category: 'productivity',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    baseWidthPx: 800,
    baseHeightPx: 600,
    minFontPx: 11,
    maxFontPx: 14,
    icon: '🎵',
    category: 'media',
  },
  {
    id: 'discord',
    name: 'Discord',
    baseWidthPx: 900,
    baseHeightPx: 600,
    minFontPx: 12,
    maxFontPx: 16,
    icon: '🎮',
    category: 'communication',
  },
  {
    id: 'settings',
    name: 'Settings',
    baseWidthPx: 700,
    baseHeightPx: 500,
    minFontPx: 12,
    maxFontPx: 14,
    icon: '⚙️',
    category: 'system',
  },
];

export function getAppPreset(id: string): AppPreset | undefined {
  return APP_PRESETS.find((app) => app.id === id);
}

export function getAppsByCategory(category: AppPreset['category']): AppPreset[] {
  return APP_PRESETS.filter((app) => app.category === category);
}
