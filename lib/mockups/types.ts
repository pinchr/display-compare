// Popular use-case mockups for workspace simulator
// Each app window has absolute pixel dimensions (reference: 1920x1080).
// Windows KEEP their absolute px size when dragged between monitors —
// this is the whole point: same window looks tiny on 4K, big on 1080p.

export interface AppWindow {
  id: string;
  label: string;
  icon: string;
  color: string;   // header bar color
  // Absolute pixel dimensions (don't change between monitors!)
  widthPx: number;
  heightPx: number;
  // Content preview lines (shown inside the window)
  previewLines?: string[];  // for IDE/Terminal
  previewImage?: boolean;   // for browser/photo apps
  description: string;
}

export interface Mockup {
  id: string;
  name: string;
  category: string;
  icon: string;
  windows: AppWindow[];
}

// Reference monitor: 1920x1080 — all sizes based on this
export const MOCKUPS: Mockup[] = [
  // ─── CODING ───────────────────────────────────────────
  {
    id: "coding-ide",
    name: "Coding — IDE Setup",
    category: "Development",
    icon: "💻",
    windows: [
      {
        id: "vscode", label: "VS Code", icon: "⌨️", color: "#007ACC",
        widthPx: 1200, heightPx: 800,
        description: "Edytor kodu — ten rozmiar okna na każdym monitorze wygląda inaczej",
        previewLines: [
          "function calculateSum(items: number[]) {",
          "  return items.reduce((sum, n) => {",
          "    return sum + n;             // linia 50",
          "  }, 0);                        // linia 51",
          "}",
          "                         // ↓ linia 70",
          "// vim-vs-nano holy war below",
        ],
      },
      {
        id: "terminal", label: "Terminal", icon: "🖥️", color: "#1E1E1E",
        widthPx: 700, heightPx: 500,
        description: "Linia poleceń",
        previewLines: [
          "pinchr@macbook ~ % npm run dev",
          "▲ Next.js 16.2.2 (Turbopack)",
          "✓ Ready in 342ms",
          "pinchr@macbook ~ %",
        ],
      },
      {
        id: "browser", label: "Browser", icon: "🌐", color: "#4285F4",
        widthPx: 700, heightPx: 450,
        description: "Stack Overflow / dokumentacja",
        previewImage: true,
      },
      {
        id: "spotify", label: "Music", icon: "🎵", color: "#1DB954",
        widthPx: 700, heightPx: 220,
        description: "Spotify",
        previewLines: ["▶ Rolling in the Deep — Adele"],
      },
    ],
  },
  {
    id: "coding-dual",
    name: "Coding — Dual Monitor",
    category: "Development",
    icon: "🖥️🖥️",
    windows: [
      {
        id: "ide", label: "IDE", icon: "⌨️", color: "#007ACC",
        widthPx: 1100, heightPx: 900,
        description: "Główny edytor kodu",
        previewLines: [
          "export async function fetchData(url: string) {",
          "  const response = await fetch(url);",
          "  if (!response.ok) throw new Error(...);",
          "  return response.json();",
          "}",
        ],
      },
      {
        id: "terminal", label: "Terminal", icon: "🖥️", color: "#1E1E1E",
        widthPx: 820, heightPx: 500,
        description: "Build output / logs",
        previewLines: [
          "$ npm run build",
          "✓ Compiled in 2.7s",
          "✓ TypeScript in 1.5s",
          "$",
        ],
      },
      {
        id: "preview", label: "Preview", icon: "🔍", color: "#FF6B6B",
        widthPx: 820, heightPx: 380,
        description: "Podgląd aplikacji",
        previewImage: true,
      },
    ],
  },

  // ─── VIDEO EDITING ───────────────────────────────────
  {
    id: "video-premiere",
    name: "Video Editing — Premiere",
    category: "Video",
    icon: "🎬",
    windows: [
      {
        id: "timeline", label: "Timeline", icon: "🎞️", color: "#9999FF",
        widthPx: 1920, heightPx: 350,
        description: "Oś czasu Premiere Pro",
        previewLines: ["🎬 ████████░░░░░░░░░░░░░░░ 02:34 / 10:00"],
      },
      {
        id: "preview", label: "Preview", icon: "▶️", color: "#CC0000",
        widthPx: 1150, heightPx: 700,
        description: "Podgląd wideo",
        previewImage: true,
      },
      {
        id: "effects", label: "Effects", icon: "✨", color: "#7860FA",
        widthPx: 770, heightPx: 700,
        description: "Efekty / Audio",
        previewLines: ["Color Correction", "Audio Gain: +3dB"],
      },
      {
        id: "media", label: "Media Bin", icon: "📁", color: "#FF9900",
        widthPx: 770, heightPx: 230,
        description: "Biblioteka mediów",
      },
    ],
  },

  // ─── DESIGN ─────────────────────────────────────────
  {
    id: "design-figma",
    name: "Design — Figma",
    category: "Design",
    icon: "🎨",
    windows: [
      {
        id: "canvas", label: "Canvas", icon: "🖼️", color: "#F24E1E",
        widthPx: 1440, heightPx: 850,
        description: "Obszar roboczy Figma",
        previewImage: true,
      },
      {
        id: "layers", label: "Layers", icon: "📋", color: "#A259FF",
        widthPx: 480, heightPx: 500,
        description: "Warstwy",
        previewLines: ["▶ Frame 1", "  ▶ Section Header", "    Text: Title", "    Rectangle", "  ▶ Frame 2"],
      },
      {
        id: "components", label: "Components", icon: "🧩", color: "#1ABCFE",
        widthPx: 480, heightPx: 350,
        description: "Komponenty",
        previewLines: ["🔘 Button / Primary", "🔘 Button / Secondary", "🔘 Input / Default"],
      },
    ],
  },
  {
    id: "design-photoshop",
    name: "Design — Photoshop",
    category: "Design",
    icon: "🖌️",
    windows: [
      {
        id: "canvas", label: "Canvas", icon: "🖼️", color: "#31A8FF",
        widthPx: 1536, heightPx: 900,
        description: "Obszar roboczy Photoshop",
        previewImage: true,
      },
      {
        id: "tools", label: "Tools", icon: "🔧", color: "#C5C5C5",
        widthPx: 384, heightPx: 600,
        description: "Panel narzędzi",
      },
      {
        id: "layers", label: "Layers", icon: "📑", color: "#001E36",
        widthPx: 384, heightPx: 300,
        description: "Warstwy",
        previewLines: ["👁 Background", "👁 Logo", "👁 Text Layer"],
      },
    ],
  },

  // ─── BROWSING / OFFICE ────────────────────────────────
  {
    id: "office-browser",
    name: "Office — Browser Suite",
    category: "Office",
    icon: "📊",
    windows: [
      {
        id: "browser1", label: "Chrome", icon: "🌐", color: "#4285F4",
        widthPx: 960, heightPx: 900,
        description: "Główna przeglądarka",
        previewImage: true,
      },
      {
        id: "browser2", label: "Docs", icon: "📄", color: "#4285F4",
        widthPx: 960, heightPx: 500,
        description: "Google Docs / Notion",
        previewLines: [
          "Q3 2026 Marketing Strategy",
          "",
          "1. Focus on organic growth",
          "2. Launch referral program",
          "3. Expand to DE & FR markets",
        ],
      },
      {
        id: "slack", label: "Slack", icon: "💬", color: "#4A154B",
        widthPx: 960, heightPx: 400,
        description: "Komunikacja",
        previewLines: [
          "# general",
          "Alice: czy spotkanie o 15?",
          "Bob: tak, na Zoom",
          "Alice: 👍",
        ],
      },
    ],
  },
  {
    id: "office-excel",
    name: "Office — Spreadsheet",
    category: "Office",
    icon: "📈",
    windows: [
      {
        id: "excel", label: "Excel", icon: "📊", color: "#217346",
        widthPx: 1344, heightPx: 900,
        description: "Arkusz kalkulacyjny",
        previewLines: [
          "     A        B         C       D",
          "1  Month   Revenue   Costs   Profit",
          "2  Jan     $12,400   $8,200  $4,200",
          "3  Feb     $15,600   $9,100  $6,500",
          "4  Mar     $18,200  $10,800  $7,400",
          "5  Apr     $21,800  $11,200 $10,600",
        ],
      },
      {
        id: "ppt", label: "PowerPoint", icon: "📽️", color: "#D24726",
        widthPx: 576, heightPx: 500,
        description: "Prezentacja",
        previewImage: true,
      },
      {
        id: "outlook", label: "Outlook", icon: "📧", color: "#0078D4",
        widthPx: 576, heightPx: 400,
        description: "Email / Calendar",
        previewLines: [
          "Inbox (3)",
          "RE: Q4 planning — Alice 10:30",
          "Standup notes — Bob 09:15",
          "Invoice #2847 — Vendor 09:00",
        ],
      },
    ],
  },

  // ─── GAMING / STREAMING ───────────────────────────────
  {
    id: "gaming-stream",
    name: "Gaming — Streaming",
    category: "Gaming",
    icon: "🎮",
    windows: [
      {
        id: "game", label: "Game", icon: "🕹️", color: "#1A1A1A",
        widthPx: 1536, heightPx: 850,
        description: "Gry / Aplikacja",
        previewImage: true,
      },
      {
        id: "obs", label: "OBS", icon: "📹", color: "#263238",
        widthPx: 384, heightPx: 450,
        description: "OBS Studio",
        previewLines: ["● Recording", "Scene: Game + Cam", "CPU: 23%", "FPS: 144"],
      },
      {
        id: "chat", label: "Chat", icon: "💬", color: "#9146FF",
        widthPx: 384, heightPx: 380,
        description: "Czat stream",
        previewLines: ["user123: gg!", "pro_gamer: let's gooo", "viewer99: 🔥"],
      },
    ],
  },

  // ─── DASHBOARD / FINANCE ──────────────────────────────
  {
    id: "dashboard-trading",
    name: "Dashboard — Trading",
    category: "Finance",
    icon: "📉",
    windows: [
      {
        id: "chart", label: "Chart", icon: "📈", color: "#00D4AA",
        widthPx: 1248, heightPx: 850,
        description: "Wykresy TradingView",
        previewImage: true,
      },
      {
        id: "orderbook", label: "Order Book", icon: "📋", color: "#1E1E1E",
        widthPx: 672, heightPx: 500,
        description: "Zlecenia / Portfel",
        previewLines: [
          "BUY ORDERS",
          "68,450 × 0.5",
          "68,320 × 1.2",
          "68,100 × 0.8",
          "─────────────",
          "SELL ORDERS",
          "68,520 × 0.3",
          "68,700 × 0.9",
        ],
      },
      {
        id: "news", label: "News", icon: "📰", color: "#FF6B6B",
        widthPx: 672, heightPx: 350,
        description: "Wiadomości rynkowe",
        previewLines: ["BTC breaks $69K resistance", "Fed rate decision tomorrow", "ETH outflows from exchanges"],
      },
    ],
  },

  // ─── GENERAL ─────────────────────────────────────────
  {
    id: "general-3col",
    name: "General — 3 Columns",
    category: "General",
    icon: "🗂️",
    windows: [
      {
        id: "main", label: "Main", icon: "📌", color: "#F59E0B",
        widthPx: 960, heightPx: 900,
        description: "Główne okno",
        previewLines: ["Welcome to display-compare!", "", "This window is 960×900px.", "Drag it to any monitor to see how its physical size changes."],
      },
      {
        id: "side1", label: "Reference", icon: "📖", color: "#F59E0B",
        widthPx: 480, heightPx: 900,
        description: "Materiały referencyjne",
        previewLines: ["Reference docs here...", "Lorem ipsum dolor sit amet.", "Another line of text."],
      },
      {
        id: "side2", label: "Notes", icon: "📝", color: "#10B981",
        widthPx: 480, heightPx: 500,
        description: "Notatki",
        previewLines: ["Meeting notes 2026-04-01", "", "- Point one", "- Point two", "- Point three"],
      },
    ],
  },
];

export const CATEGORIES = [...new Set(MOCKUPS.map((m) => m.category))];
