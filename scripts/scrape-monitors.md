# Aktualizacja bazy monitorów — instrukcja

## Architektura

```
display-compare/
├── public/
│   └── monitors.json        ← BAZA DANYCH (JSON, git-tracked)
├── scripts/
│   └── fetch-monitors.ts    ← skrypt scrapujący
└── lib/monitors/
    ├── types.ts             ← interfejsy TypeScript
    └── presets.ts           ← fallback (14 hardcoded, zostaje)
```

---

## 1. Instalacja zależności

```bash
# Z katalogu głównego projektu display-compare:
npm install -D tsx
```

Skrypt nie wymaga żadnych zewnętrznych parserów HTML — używa wyłącznie wbudowanych
modułów Node.js (fetch, fs, util). Zero dodatkowych dependencji.

---

## 2. Kopiowanie skryptu

```bash
mkdir -p scripts
cp fetch-monitors.ts scripts/fetch-monitors.ts
```

Dodaj do `package.json`:
```json
"scripts": {
  "update-monitors": "npx tsx scripts/fetch-monitors.ts",
  "update-monitors:dry": "npx tsx scripts/fetch-monitors.ts --dry",
  "update-monitors:quick": "npx tsx scripts/fetch-monitors.ts --limit=100 --brands=LG,Samsung,Dell"
}
```

---

## 3. Uruchamianie

### Pełny scrape (wszystkie marki, może trwać godziny):
```bash
npm run update-monitors
```

### Test na 50 monitorach:
```bash
npx tsx scripts/fetch-monitors.ts --limit=50
```

### Tylko wybrane marki:
```bash
npx tsx scripts/fetch-monitors.ts --brands="LG,Samsung,Dell,BenQ,ASUS"
```

### Podgląd bez zapisu (dry run):
```bash
npx tsx scripts/fetch-monitors.ts --limit=20 --dry
```

### Odśwież tylko istniejące wpisy (nie dodawaj nowych):
```bash
npx tsx scripts/fetch-monitors.ts --update-only
```

---

## 4. Integracja z aplikacją

### Krok A — Zaktualizuj `lib/monitors/types.ts`

Dodaj nowe pola do interfejsu `Monitor`:

```typescript
export interface Monitor {
  // ... istniejące pola bez zmian ...
  
  // Nowe pola scrapowane:
  hdrSupport?: string;        // "HDR400", "HDR600", "Dolby Vision"
  syncTech?: string[];        // ["G-Sync", "FreeSync Premium"]
  vesa?: string;              // "100x100", "75x75"
  weight?: number;            // kg
  releaseYear?: number;       // rok premiery
  updatedAt?: string;         // ISO timestamp ostatniej aktualizacji
}
```

### Krok B — Stwórz `lib/monitors/index.ts`

```typescript
import type { Monitor } from "./types";
import { PRESET_MONITORS } from "./presets";

let _cache: Monitor[] | null = null;

export async function getMonitors(): Promise<Monitor[]> {
  if (_cache) return _cache;
  
  try {
    // Server-side (build time): czytaj plik bezpośrednio
    if (typeof window === "undefined") {
      const { readFileSync } = await import("fs");
      const { join } = await import("path");
      const filePath = join(process.cwd(), "public/monitors.json");
      if (require("fs").existsSync(filePath)) {
        _cache = JSON.parse(readFileSync(filePath, "utf-8"));
        return _cache!;
      }
    }
    
    // Client-side: fetch z /monitors.json
    const res = await fetch("/monitors.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _cache = await res.json();
    return _cache!;
  } catch {
    // Fallback do hardcoded presets jeśli plik nie istnieje
    console.warn("[monitors] Brak public/monitors.json — używam presets.ts");
    return PRESET_MONITORS;
  }
}

// Re-export dla kompatybilności wstecznej
export { PRESET_MONITORS } from "./presets";
```

### Krok C — Zaktualizuj komponenty używające monitorów

Wszędzie gdzie był `import { PRESET_MONITORS }`, zmień na:

```typescript
// Przed:
import { PRESET_MONITORS } from "@/lib/monitors/presets";
const monitors = PRESET_MONITORS;

// Po:
import { getMonitors } from "@/lib/monitors";
const monitors = await getMonitors();  // w async component / useEffect
```

---

## 5. Workflow aktualizacji bazy

```
1. npx tsx scripts/fetch-monitors.ts --limit=100 --brands="LG,Samsung"
   ↓
2. git diff public/monitors.json   (przejrzyj zmiany)
   ↓
3. git add public/monitors.json
   git commit -m "chore: update monitors db ($(jq length public/monitors.json) entries)"
   git push
   ↓
4. GitHub Pages automatycznie serwuje nowy plik
   — zero rebuild potrzebny dla danych
```

---

## 6. Struktura `monitors.json`

```json
[
  {
    "id": "lg-27gl850-27gl850-b",
    "name": "LG 27GL850-B",
    "brand": "LG",
    "diagonal": 27,
    "widthPx": 2560,
    "heightPx": 1440,
    "panelType": "Nano IPS",
    "refreshRate": 144,
    "responseTime": 1,
    "brightness": 350,
    "contrast": "1000:1",
    "ports": "HDMI 2.0, DisplayPort 1.4, USB-A",
    "source": "https://www.displayspecifications.com/en/model/...",
    "curved": false,
    "hdrSupport": "HDR10",
    "syncTech": ["G-Sync Compatible", "FreeSync Premium"],
    "vesa": "100x100",
    "weight": 4.8,
    "releaseYear": 2019,
    "updatedAt": "2026-04-02T00:00:00.000Z"
  }
]
```

---

## 7. Szacowany rozmiar pliku

| Ilość monitorów | Rozmiar JSON | Czas scrape |
|-----------------|-------------|-------------|
| 100             | ~80 KB      | ~2 min      |
| 500             | ~400 KB     | ~10 min     |
| 2 000           | ~1.6 MB     | ~45 min     |
| 5 000           | ~4 MB       | ~2 godz.    |

GitHub Pages serwuje pliki do 100 MB. 5000 monitorów = ~4 MB — całkowicie OK.
Przeglądarka poradzi sobie z filtrowaniem 5000 wpisów w JS bez problemu.

---

## 8. Automatyczne aktualizacje (opcjonalne)

Dodaj GitHub Actions `.github/workflows/update-monitors.yml`:

```yaml
name: Update monitors database

on:
  schedule:
    - cron: '0 3 * * 0'   # Co niedzielę o 3:00 UTC
  workflow_dispatch:        # Możliwość ręcznego uruchomienia

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx tsx scripts/fetch-monitors.ts --limit=500
      - name: Commit changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add public/monitors.json
          git diff --staged --quiet || git commit -m "chore: update monitors db [skip ci]"
          git push
```

