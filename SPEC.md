# DISPLAY-COMPARE — SPEC.md
**Data:** 2026-04-01
**Status:** MVP Faza 1 done | v0.2 workspace simulator added

**Update 2026-04-01 v0.2:**
- Workspace Simulator: realistic app mockups (drag & drop między monitorami, max 3 monitory)
- Zmieniona paleta kolorów: amber (#F59E0B) zamiast indigo/purple — premium, tool-like, nie "AI-generated"
- Workspace Simulator mockup categories: Development, Video, Design, Office, Gaming, Finance

---

## 1. Concept & Vision

**display-compare.com** (lub inna domena) — porównywarka rozmiarów monitorów i wyświetlaczy. Użytkownik wybiera 2-6 monitorów, widzi je nałożone na siebie w skali 1:1, oraz przykładowe layouty okien (2/3/4/6 okien) pokazujące ile treści się mieści przy danej rozdzielczości.

Wyróżniki:
- **AR Preview** — kamera + monitor 3D na biurku (cel phone'u)
- **Porównanie >2 monitorów** jednocześnie
- **Popularne presety** — bez logowania, od razu gotowe
- **Praktyczne layouty** — pokazanie realnych zastosowań (nie tylko suche DPI)

**Grupa docelowa:** kupujący monitory, gracze, programiści, projektanci — ludzie którzy wybierają monitor i chcą zobaczyć przed zakupem co się zmieści.

---

## 2. Design Language

### KOLORY (CSS variables) — Amber accent, warm & premium
```css
/* Amber accent — ciepły, premium, tool-like */
--color-accent: #F59E0B;          /* amber — główny akcent */
--color-accent-hover: #D97706;    /* ciemniejszy amber */
--color-accent-muted: rgba(245, 158, 11, 0.12);

/* Sky blue — secondary, contrast */
--color-accent-secondary: #0EA5E9;
--color-accent-secondary-muted: rgba(14, 165, 233, 0.12);

/* Backgrounds — głęboki charcoal */
--color-bg-primary: #0A0A0B;     /* główne tło */
--color-bg-secondary: #111113;   /* karty / sekcje */
--color-bg-tertiary: #18181B;     /* elevated */
--color-bg-elevated: #1C1C1F;     /* najwyższe elementy */

/* Borders */
--color-border: #27272A;          /* subtle borders */
--color-border-subtle: #1a1a1e;

/* Text */
--color-text-primary: #FAFAFA;   /* near white */
--color-text-secondary: #A1A1AA; /* muted */
--color-text-tertiary: #71717A;  /* very muted */

/* Semantic */
--color-success: #10B981;        /* emerald green */
--color-warning: #F59E0B;        /* amber */
--color-danger: #EF4444;         /* red */
--color-monitor-bezel: #141416;  /* ramka monitora */
```

**Dlaczego amber?** Warm, distinctive, doesn't scream "AI-generated" like indigo/purple. Premium feel, tool-like. Wyróżnia się na tle typowych niebiesko-fioletowych generatywnych UI.

### TYPOGRAFIA
- **Headlines:** Inter (700) — sharp, nowoczesny
- **Body:** Inter (400/500)
- **Mono (specyfikacje):** JetBrains Mono
- Font sizes: 12/14/16/20/24/32/48px scale

### SPACING
- Base unit: 4px
- Typical: 8, 12, 16, 24, 32, 48, 64px
- Card padding: 20px
- Section gaps: 48px

### ANIMACJE
- Entrance: fade + translateY(-8px), 300ms ease-out, stagger 50ms
- Hover: scale(1.02) + box-shadow glow, 200ms
- Monitor comparison: smooth spring-like transition when adding/removing
- AR camera: fade-in with slight zoom

### IKONY
- Lucide React — spójne, lekkie

### INSPIRACJE WIZUALNE
- Apple.com — przestrzenne, ciemne tło + jasne elementy
- Raycast — minimal, szybkie interakcje
- DisplayWars — funkcjonalność porównania, ale nowoczesna forma

---

## 3. Layout & Structure

### GŁÓWNA STRONA (Single Page App)

```
┌─────────────────────────────────────────────────────────┐
│  LOGO (display compare)          [Dodaj monitor] [+porównaj] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   [PRESETY POPULARNYCH MONITORÓW — quick select]       │
│   ████ 27" 4K  ████ 32" 4K  ████ 24" 1080p  ████ ...  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   [WORKSPACE — główny obszar roboczy]                  │
│                                                         │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│   │ MONITOR  │  │ MONITOR  │  │ MONITOR  │  [+ dodaj]  │
│   │  3D/2D   │  │  3D/2D   │  │  3D/2D   │             │
│   │ preview  │  │ preview  │  │ preview  │             │
│   └──────────┘  └──────────┘  └──────────┘             │
│                                                         │
│   [Nazwa: 27" LG UltraGear 4K]                         │
│   [Res: 3840×2160 | DPI: 163 | Matryca: IPS]           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   [PORÓWNANIE — nałożone na siebie]                   │
│   O overlays: ┌─────────────────────────┐              │
│               │    (monitory na sobie)  │  ← slider   │
│               │   scale 1:1 wpx)        │    opacity │
│               └─────────────────────────┘              │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   [LAYOUT PREVIEW — ile okien się mieści]             │
│   [2 okna] [3 okna] [4 okna] [6 okien grid]          │
│                                                         │
│   ┌─────┬─────┐  ┌─────┬─────┬─────┐                  │
│   │     │     │  │     │     │     │                  │
│   │  A  │  B  │  │  A  │  B  │  C  │                  │
│   │     │     │  │     │     │     │                  │
│   └─────┴─────┘  └─────┴─────┴─────┘                  │
│                                                         │
│   Rozdzielczość efektywna okna: WxH                  │
│   Porównanie rozmiarów pikseli                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   [SZCZEGÓŁY / SPECS — rozwijane]                     │
│   Wszystkie dane obu monitorów obok siebie            │
│   Tabela: przekątna, rozdzielczość, DPI,              │
│           powierzchnia cm², proporcje,                │
│           typ matrycy, odświeżanie,                   │
│           czas reakcji, porty                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### AR MODE (overlay na kamerze)
- Przycisk "🔬 AR Preview" na górze
- Po kliknięciu: dostęp do kamery (getUserMedia)
- Monitor renderowany jako 3D box (Three.js) w AR na biurku
- Slider do wyboru który monitor pokazać
- Tap na monitor → obracanie/powiększanie (touch gestures)

### RESPONSYWNOŚĆ
- Desktop: pełny layout jak wyżej
- Tablet: 2 monitory max w rzędzie
- Mobile: 1 monitor, poziome scrollowanie porównania

---

## 4. Features & Interactions

### 4.1 Preset Bar (Quick Select)
- **Top 12 popularnych monitorów** jako karty z miniaturą i ceną orientacyjną
- Click → dodaje monitor do workspace
- Można wybrać ile chcesz naraz (min 2, max 6)
- Hover: pokazuje badge "porównaj"

### 4.2 Workspace Monitor Cards
- **Dodawanie:** click na preset lub "[+ dodaj własny]"
- **Własny monitor:** modal z inputami (przekątna, rozdzielczość, proporcje) LUB search w bazie
- **Usuwanie:** X w rogu karty, confirm animation
- **Zmiana pozycji:** drag & drop (opcjonalne w v1)
- **Hover:** podświetla odpowiedni monitor w overlay comparison

### 4.3 Overlay Comparison (nałożenie)
- **Suwak opacity** — przesuwasz żeby widzieć kolejne monitory
- **Koloroutline** każdego monitora (różne kolory na outline)
- **Checkboxy** — który monitor pokazać na overlayu
- **Scale toggle:** real pixels vs normalized (żeby się nie rozjeżdżało)
- **Export:** PNG przycisk (html2canvas)

### 4.4 Layout Preview (Equal Divisions)
- **Wybór layoutu:** 2 / 3 / 4 / 6 okien (równe podziały CSS grid)
- **Dla każdego monitora:** pokazuje ile px i cm ma każde okno przy danym layout
- **Porównanie:** bar chart pokazujący relatywny rozmiar okna między monitorami
- **Wizualizacja:** kolorowe komórki z wymiarami px/cm pod spodem

### 4.5 Workspace Simulator (Real Mockups)
- **12 popularnych mockupów** w 6 kategoriach: Development, Video, Design, Office, Gaming, Finance
- **Mockupy:** Coding IDE, Dual Coding, Premiere Pro, DaVinci Resolve, Figma, Photoshop, Browser Suite, Excel/PowerPoint, Gaming Stream, Trading Dashboard, 3-Column General
- **Każdy mockup** = realistyczny układ okien (np. VS Code + Terminal + Browser + Spotify)
- **Kategorie** jako przyciski — szybki filtr
- **"Dodaj na Monitor 1/2/3"** lub "Wszystkie 3" — jednym kliknięciem
- **Przeciąganie okien** między monitorami (pointer events, bez biblioteki)
- **Max 3 monitory** porównania (layout dobrze wygląda tylko dla 2-3)
- **Realne wymiary px** podane pod każdym oknem — ile px naprawdę ma VS Code na 27" 4K vs 24" 1080p
- **Podsumowanie:** lista wszystkich okien z wymiarami px per monitor

### 4.6 AR Preview
- **Przycisk:** "AR Preview" — otwiera kamerę na fullscreen
- **Three.js scene** z modelem monitora w skali 1:1
- **Monitory jako prostokąty 3D** z cienką ramką (bezel)
- **Touch rotate/zoom** — pinch gesture
- **Overlay info:** najedź → pokazuje specyfikacje
- **Wylogowanie:** X lub swipe down

### 4.7 Search & Baza Monitorów
- **Search:** po nazwie, przekątnej, producencie
- **Filtry:** cena (od-do), rozdzielczość, typ matrycy, odświeżanie
- **Sortowanie:** popularność, cena, przekątna, DPI
- **Wyniki:** karty z miniaturowym zdjęciem + kluczowe specyfikacje

### 4.8 Afiliacja + Reklamy
- **Linki afiliacyjne:** "Zobacz na Amazon" → affiliation links
- ** Reklamy Google AdSense:** placeholder w sidebarze (desktop)
- **Tracking:** każdy click na Amazon/link = event do analytics

---

## 5. Component Inventory

### MonitorCard
- Miniaturka / placeholder monitora 3D
- Nazwa (truncated)
- Kluczowe specyfikacje: rozdzielczość, DPI, przekątna
- Checkbox (selected state)
- Hover: scale 1.02, glow border
- Remove button (X) — top right

### PresetChip
- Kompaktowa karta: ikona + "27\" 4K" + cena
- Wyświetla: przekątna, rozdzielczość (FHD/QHD/4K), cena
- Stany: default, hover, selected, disabled (gdy >=6 wybrane)
- Click: toggle selection

### OverlayCanvas
- SVG/Canvas z monitorami nałożonymi
- Każdy monitor: outline w innym kolorze
- Slider opacity (0-100%)
- Checkbox layer visibility

### LayoutGrid
- CSS Grid / SVG
- Wyświetla podzielony monitor na X okien
- Każde okno: label z rozmiarem px + cm
- Hover: highlight

### SpecTable
- Dwie kolumny (A vs B)
- Wiersze: każda specyfikacja
- Różnice podświetlone (czerwony/zielony indicator)

### ARViewer
- Fullscreen overlay
- Kamera background (getUserMedia)
- Three.js canvas overlay
- Control buttons: close, rotate, scale
- Loading state: spinner

### SearchModal
- Input z autocomplete
- Filtry jako chips
- Wyniki jako MonitorCard
- Pagination / infinite scroll

---

## 6. Technical Approach

### STACK
- **Next.js 14+** (App Router)
- **TypeScript** — całość
- **Tailwind CSS** — styling
- **Three.js + @react-three/fiber** — AR/3D
- **Prisma** — ORM (PostgreSQL lub SQLite na start)
- **Vercel** — hosting (free tier OK na MVP)

### ARCHITEKTURA
```
display-compare/
├── app/
│   ├── page.tsx              # główna strona
│   ├── layout.tsx             # root layout
│   └── globals.css
├── components/
│   ├── MonitorCard.tsx
│   ├── PresetBar.tsx
│   ├── OverlayCanvas.tsx
│   ├── LayoutGrid.tsx
│   ├── SpecTable.tsx
│   ├── ARViewer.tsx
│   ├── SearchModal.tsx
│   └── ui/                    # generic components
├── lib/
│   ├── monitors/
│   │   ├── presets.ts         # popularne monitory (hardcoded)
│   │   ├── calculations.ts    # DPI, cm, proporcje kalkulacje
│   │   └── types.ts
│   └── ar/
│       └── scene.tsx          # Three.js AR scene
├── hooks/
│   ├── useMonitors.ts
│   └── useAR.ts
├── public/
│   └── models/                 # 3D monitor model (GLTF)
├── prisma/
│   └── schema.prisma
├── SPEC.md
└── README.md
```

### DATA MODEL
```prisma
model Monitor {
  id            String   @id @default(cuid())
  name          String
  brand         String
  diagonal      Float    // cale
  widthPx       Int      // rozdzielczość pozioma
  heightPx      Int      // rozdzielczość pionowa
  panelType     String?  // IPS, VA, OLED, etc.
  refreshRate   Int?     // Hz
  responseTime  Int?     // ms
  brightness    Int?     // cd/m2
  contrast      String?  // np "1000:1"
  ports         String?  // HDMI, DP, USB-C...
  price         Float?   // orientacyjna cena
  imageUrl      String?  // zdjęcie
  source        String?  // skąd dane (amazon, manual)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### PRESETY (MVP — hardcoded, ~20 monitorów)
Zaczynamy od najpopularniejszych:
1. 24" 1080p (1920×1080) — klasyk
2. 27" 1080p — większy 1080p
3. 27" 1440p (2560×1440) — QHD
4. 27" 4K (3840×2160) — popularny wśród profesjonalistów
5. 32" 4K — duży 4K
6. 34" ultrawide 3440×1440
7. 49" superultrawide 5120×1440
8. 27" 1080p 360Hz (gaming)
9. 24" 1080p 240Hz (gaming)
10. 27" 4K 144Hz (OLED gaming)
11. 15.6" laptop 1920×1080
12. 16" MacBook Pro 3456×2234

### AR APPROACH
- **WebXR** via @react-three/xr (手套)
- Fallback dla iOS: **model-viewer** (ARKit)
- Monitor jako prostokąt BoxGeometry z cienką ramką
- Kamera device jako background (getUserMedia + video element)
- Tap to place / drag to move

### CRAWLING STRATEGY (faza 2)
- **pcpartpicker.com** — monitor specs API (jeśli dostępne)
- **gsmarena.com** — specyfikacje
- Scraping: Puppeteer/Playwright, raz dziennie
- Albo: ręczne API distributorów

---

## 7. MVP Scope (Faza 1 — do zrobienia)

### MUST HAVE
- [ ] Preset bar z 12 monitorami
- [ ] Workspace z max 4 monitorami
- [ ] Overlay comparison (2-4 na raz, opacity slider)
- [ ] Layout preview (2/3/4/6 okien)
- [ ] Spec table porównanie
- [ ] Responsive (mobile-friendly)
- [ ] Dark mode

### NICE TO HAVE (potem)
- [ ] Własny monitor (custom inputs)
- [ ] Baza monitorów + search
- [ ] AR preview
- [ ] Eksport PNG
- [ ] Afiliacja Amazon links
- [ ] Reklamy AdSense

---

## 8. Naming

**Nazwa:** `display-compare`
**Domena docelowa:** display-compare.com (sprawdzić dostępność)
**Alternatywy:** monitorcomp.pl, screensize.io (zajęte pewnie)

---

## 9. Monetyzacja

### Afiliacja Amazon
- Każdy monitor = link afiliacyjny Amazon
- "Zobacz cenę" → amazon.com?tag=xxx
- Commission: ~3-5% na Electronics

### Google AdSense
- Placeholder na sidebarze
- Baner na dole strony
- In-feed ads w wynikach wyszukiwania

### Dalsze (v2+)
- Sponsored listings w wyszukiwarce monitorów
- Porównywarka cen (CPL per lead)

---

*Last updated: 2026-04-01*
