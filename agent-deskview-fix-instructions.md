# Instrukcje dla agenta — naprawa DeskView (display-compare)

## Plik docelowy
`components/DeskView.tsx`

---

## ZMIANA 1 — FrontView: usuń zduplikowany useEffect (konflikt synchronizacji)

FrontView ma **dwa** useEffecty synchronizujące `localArrangements` z propsem `arrangements`.
Pierwszy (sprawdza `isDraggingRef.current`) i drugi (sprawdza `draggingId`). 
Usuń PIERWSZY, zostaw tylko DRUGI.

### Znajdź i usuń ten blok:
```tsx
  // Sync local arrangements from parent only when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalArrangements(arrangements);
    }
  }, [arrangements]);
```
(Zostaw tylko ten niżej, który sprawdza `!draggingId`.)

---

## ZMIANA 2 — FrontView SVG render: zastąp `arrangements.map` → `localArrangements.map`

W kodzie SVG FrontView (wewnątrz elementu `<svg>`) renderowane są monitory przez `arrangements.map`.
To powoduje, że podczas przeciągania monitor się nie rusza (props nie jest jeszcze zaktualizowany).

### Znajdź:
```tsx
{arrangements.map((arr, idx) => {
  const wCm = calcWidthCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
  const hCm = calcHeightCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
  const wPx = wCm * pxPerCm;
  const hPx = hCm * pxPerCm;
  const xPx = 600 + arr.xCm * pxPerCm - wPx / 2;
  // Monitor sits on desk surface - bottom of monitor at DESK_SURFACE_Y
  const yPx = DESK_SURFACE_Y - hPx - arr.yCm * pxPerCm;
```

### Zastąp pierwszą linię:
```tsx
{localArrangements.map((arr, idx) => {
```

---

## ZMIANA 3 — FrontView handlePointerMove: propaguj zmiany na bieżąco

Dodaj wywołanie `onArrangementsChange(updated)` wewnątrz `handlePointerMove`,
aby drugi widok (TopView) aktualizował się w czasie rzeczywistym podczas dragu.

### Znajdź w `handlePointerMove` (FrontView):
```tsx
    setLocalArrangements(prev => prev.map(arr => arr.id === draggingId ? { ...arr, xCm: newXCm, yCm: newYCm } : arr));
  }, [draggingId, pxPerCm]);
```

### Zastąp:
```tsx
    const updated = localArrangementsRef.current.map(arr =>
      arr.id === draggingId ? { ...arr, xCm: newXCm, yCm: newYCm } : arr
    );
    setLocalArrangements(updated);
    onArrangementsChange(updated);
  }, [draggingId, pxPerCm, onArrangementsChange]);
```

---

## ZMIANA 4 — FrontView: poprawna perspektywa biurka (DESK_SURFACE_Y)

Model fizyczny: **głowa się cofa**, biurko stoi w miejscu — ale obserwator widzi je
coraz wyżej (bliżej horyzontu) i mniejsze (perspektywa). 

### Znajdź:
```tsx
  // Desk position: appears lower when close, higher when far (closer to horizon)
  // Base desk Y is at bottom, moves up toward horizon as distance increases
  const DESK_SURFACE_Y = CANVAS_H - 60 - (headDistance - REF_DISTANCE) * 1.5;
```

### Zastąp:
```tsx
  // Perspective: desk stays fixed in 3D space, but appears to rise toward horizon
  // as the viewer (head) moves further away. Horizon is ~15% from top of canvas.
  const HORIZON_Y = CANVAS_H * 0.15;
  const BASE_DESK_Y = CANVAS_H - 60;
  const DESK_SURFACE_Y = BASE_DESK_Y + (HORIZON_Y - BASE_DESK_Y) * (1 - perspectiveScale);
```

---

## ZMIANA 5 — TopView SVG render: zastąp `arrangements.map` → `localArrangements.map`

Tak samo jak w FrontView — TopView renderuje stare propsy.

### Znajdź w TopView (wewnątrz `return` SVG, wyszukaj po unikalnym fragmencie):
```tsx
{arrangements.map((arr, idx) => {
  const wCm = calcWidthCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
  const hCm = calcHeightCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
  const cx = HEAD_X + arr.xCm * SCALE;
  // DESK_Y: desk starts below head, moves UP as distance increases (toward horizon)
  const DESK_Y = HEAD_Y + 50 - (headDistance - REF_DISTANCE) * 1.1;
  const yMon = DESK_Y - arr.yCm * SCALE;
```

### Zastąp CAŁY ten blok otwierający (do nawiasu klamrowego `{`):
```tsx
{localArrangements.map((arr, idx) => {
  const wCm = calcWidthCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
  const hCm = calcHeightCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
  const cx = HEAD_X + arr.xCm * SCALE;
  // Desk is stationary in 3D. In bird's eye, head is always at bottom.
  // Desk front edge is headDistance * SCALE above the head indicator.
  const DESK_FRONT_Y = HEAD_Y - headDistance * SCALE;
  const yMon = DESK_FRONT_Y - arr.yCm * SCALE;
```

---

## ZMIANA 6 — TopView: dynamiczna skala (SCALE) dopasowana do canvas

Stała `SCALE = 1.5` powoduje, że przy dużych odległościach biurko wychodzi poza canvas.
Należy obliczyć SCALE dynamicznie, żeby scena zawsze mieściła się w widoku.

### Znajdź w TopView (stałe na górze funkcji):
```tsx
  const CANVAS_W = 800;
  const CANVAS_H = 340;
  const HEAD_X = CANVAS_W / 2;
  const HEAD_Y = CANVAS_H - 30;
  const DESK_Y = HEAD_Y + 10; // desk surface at head level
  const SCALE = 1.5;
```

### Zastąp:
```tsx
  const CANVAS_W = 800;
  const CANVAS_H = 340;
  const HEAD_X = CANVAS_W / 2;
  const HEAD_Y = CANVAS_H - 30;
  // Dynamic scale: fit the entire scene (head → desk → back of desk) into canvas height
  const TOTAL_SCENE_CM = headDistance + deskDepthCm + 15; // +15cm margin above desk
  const USABLE_H = CANVAS_H - 50; // 50px reserved for head indicator
  const SCALE = USABLE_H / TOTAL_SCENE_CM;
```

> **Usuń też linię** `const DESK_Y = HEAD_Y + 10;` — nie jest już używana po tej zmianie.

---

## ZMIANA 7 — TopView: popraw pozycję prostokąta biurka

Biurko jest rysowane jako `<rect>` na końcu SVG w TopView. Musi używać nowych zmiennych.

### Znajdź (blisko końca elementu `<svg>` w TopView):
```tsx
{/* Desk rectangle */}
```
Poszukaj `<rect` tuż po tym komentarzu. Powinien wyglądać mniej więcej tak:
```tsx
<rect
  x={HEAD_X - (deskWidthCm / 2) * SCALE}
  y={DESK_Y - deskDepthCm * SCALE}
  width={deskWidthCm * SCALE}
  height={deskDepthCm * SCALE}
  ...
/>
```

### Zastąp atrybuty `x`, `y`, `width`, `height`:
```tsx
<rect
  x={HEAD_X - (deskWidthCm / 2) * SCALE}
  y={HEAD_Y - headDistance * SCALE - deskDepthCm * SCALE}
  width={deskWidthCm * SCALE}
  height={deskDepthCm * SCALE}
  fill="rgba(120,80,30,0.10)"
  stroke="rgba(120,80,30,0.35)"
  strokeWidth={1}
  rx={3}
/>
```

---

## ZMIANA 8 — TopView handlePointerMove: napraw Y-drag (rect-relative bug)

Y-drag używa `e.clientY` bezpośrednio zamiast relatywnego do SVG, co dodaje offset viewportu.

### Znajdź w `handlePointerMove` (TopView):
```tsx
    // Y-axis dragging - up/down movement (diagonal drag)
    const dy = e.clientY - dragStart.current.mouseY;
    const dyCm = -dy / SCALE; // invert: dragging up = positive yCm
    const newYCm = dragStart.current.arr.yCm + dyCm;
```

### Zastąp:
```tsx
    // Y-axis dragging — rect-relative, invert: drag up = positive yCm (monitor higher/farther)
    const mouseY = e.clientY - rect.top;
    const dy = mouseY - dragStart.current.mouseY;
    const dyCm = -dy / SCALE;
    const newYCm = dragStart.current.arr.yCm + dyCm;
```

---

## ZMIANA 9 — TopView handlePointerMove: propaguj zmiany na bieżąco

Tak samo jak w FrontView — dodaj `onArrangementsChange` w trakcie dragu.

### Znajdź w `handlePointerMove` (TopView):
```tsx
    setLocalArrangements(prev => prev.map(arr =>
      arr.id === draggingId ? { ...arr, xCm: newXCm, yCm: newYCm } : arr
    ));
  }, [draggingId, totalPhysCm, SCALE]);
```

### Zastąp:
```tsx
    const updated = localArrangementsRef.current.map(arr =>
      arr.id === draggingId ? { ...arr, xCm: newXCm, yCm: newYCm } : arr
    );
    setLocalArrangements(updated);
    onArrangementsChange(updated);
  }, [draggingId, totalPhysCm, SCALE, onArrangementsChange]);
```

---

## ZMIANA 10 — Rotacja: dodaj przycisk toggle per monitor (FrontView toolbar)

W toolbarze FrontView jest lista monitorów z suwakiem scale (`arrangements.map` w toolbarze).
Po każdym suwakiem dodaj przycisk obrotu.

### Znajdź toolbar FrontView (zwróć uwagę: TEN `arrangements.map` w toolbarze, NIE w SVG):
```tsx
{arrangements.map((arr, idx) => {
  const scale = uiScales[arr.id] ?? 1.0;
  const ppi = calcPPI(arr.monitor.widthPx, arr.monitor.heightPx, arr.monitor.diagonal);
  return (
    <div key={arr.id} className="flex items-center gap-1.5">
```

Zamień `arrangements.map` → `localArrangements.map` (żeby przyciski też używały live state):
```tsx
{localArrangements.map((arr, idx) => {
```

### Następnie znajdź zamknięcie każdego elementu `return (...)` w tej pętli
(szukaj `</div>` który zamyka `<div key={arr.id}`). 
Przed tym zamknięciem dodaj przycisk rotacji:

```tsx
      <button
        onClick={() => {
          const updated = localArrangementsRef.current.map(a =>
            a.id === arr.id ? { ...a, rotation: a.rotation === 0 ? 90 : 0 } : a
          );
          setLocalArrangements(updated);
          onArrangementsChange(updated);
        }}
        className={`px-1.5 py-0.5 text-[9px] rounded border transition-colors ${
          arr.rotation === 90
            ? 'bg-accent/20 border-accent/40 text-accent'
            : 'bg-bg-tertiary border-border text-text-tertiary hover:text-text-secondary'
        }`}
        title="Toggle portrait/landscape"
      >
        {arr.rotation === 90 ? '↕ Portrait' : '↔ Landscape'}
      </button>
```

---

## ZMIANA 11 — FrontView SVG: respektuj rotację podczas renderowania monitora

Po zmianie 2 (renderujemy `localArrangements`), należy uwzględnić `arr.rotation` przy obliczaniu wymiarów.

### Znajdź w SVG renderze FrontView (wewnątrz `localArrangements.map`):
```tsx
  const wCm = calcWidthCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
  const hCm = calcHeightCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
  const wPx = wCm * pxPerCm;
  const hPx = hCm * pxPerCm;
```

### Zastąp:
```tsx
  const isPortrait = arr.rotation === 90;
  const wCm = isPortrait
    ? calcHeightCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx)
    : calcWidthCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
  const hCm = isPortrait
    ? calcWidthCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx)
    : calcHeightCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
  const wPx = wCm * pxPerCm;
  const hPx = hCm * pxPerCm;
```

---

## ZMIANA 12 — TopView SVG: respektuj rotację podczas renderowania monitora

Analogicznie w TopView — monitor obróćony o 90° ma zamienioną szerokość/głębokość w widoku z góry.

### Znajdź w SVG renderze TopView (wewnątrz `localArrangements.map`):
```tsx
  const wCm = calcWidthCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
  const hCm = calcHeightCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
  const cx = HEAD_X + arr.xCm * SCALE;
```

### Zastąp:
```tsx
  const isPortrait = arr.rotation === 90;
  const wCm = isPortrait
    ? calcHeightCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx)
    : calcWidthCm(arr.monitor.diagonal, arr.monitor.widthPx, arr.monitor.heightPx);
  // Physical depth of monitor body (~8cm), swapped for portrait
  const monitorDepthCm = isPortrait ? wCm * 0.12 : 8;
  const cx = HEAD_X + arr.xCm * SCALE;
```

Następnie w tym samym bloku znajdź linię rysującą monitor (flat = `<line>`, curved = `<path>`).
Dla **flat monitora** zastąp też szerokość linii lub prostokąta:

Zamiast samej `<line>` dla flat monitora, użyj `<rect>` żeby pokazać głębokość:
```tsx
{/* Flat monitor — rect showing width + depth from above */}
<rect
  x={cx - (wCm * SCALE) / 2}
  y={DESK_FRONT_Y - arr.yCm * SCALE - monitorDepthCm * SCALE}
  width={wCm * SCALE}
  height={monitorDepthCm * SCALE}
  fill={isPortrait ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.12)'}
  stroke={color}
  strokeWidth={3}
  rx={2}
  style={{ cursor: 'grab' }}
  onPointerDown={(e) => {
    e.stopPropagation();
    const rect = svgRef.current!.getBoundingClientRect();
    setDraggingId(arr.id);
    dragStart.current = { mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top, arr };
  }}
/>
```

---

## Podsumowanie kolejności zmian

| # | Zmiana | Dlaczego |
|---|--------|----------|
| 1 | Usuń zduplikowany useEffect w FrontView | Konflikt przy synchronizacji |
| 2 | `arrangements.map` → `localArrangements.map` w SVG FrontView | Monitor nie poruszał się w trakcie dragu |
| 3 | Dodaj `onArrangementsChange` w `handlePointerMove` FrontView | TopView nie wiedział o dragach FrontView |
| 4 | Popraw `DESK_SURFACE_Y` — perspektywa ku horyzontowi | Biurko schodziło zamiast unosić się |
| 5 | `arrangements.map` → `localArrangements.map` w SVG TopView | Monitor nie poruszał się w trakcie dragu |
| 6 | Dynamiczne `SCALE` w TopView | Scena wychodziła poza canvas przy dużych dystansach |
| 7 | Popraw pozycję `<rect>` biurka w TopView | Biurko leciało razem z głową zamiast stać |
| 8 | Napraw Y-drag (rect-relative) w TopView | Offset viewportu ~400px dodawał się do każdego ruchu |
| 9 | Dodaj `onArrangementsChange` w `handlePointerMove` TopView | FrontView nie wiedział o dragach TopView |
| 10 | Przycisk toggle rotacji w toolbarze | Nowa feature: portrait/landscape |
| 11 | Swap width/height przy rotacji w FrontView | Monitor pionowy musi mieć inne wymiary |
| 12 | Swap width/depth przy rotacji w TopView | Monitor pionowy inaczej wygląda z góry |
