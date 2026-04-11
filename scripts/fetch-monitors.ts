// scripts/fetch-monitors.ts
// Uruchomienie: npx tsx scripts/fetch-monitors.ts
// Wymaga: npm i -D tsx playwright
// Automatycznie pobiera monitory z displayspecifications.com

import * as fs from "fs";
import * as path from "path";
import { chromium, ChromiumBrowser } from "playwright";

interface MonitorRaw {
  id: string;
  name: string;
  brand: string;
  diagonal: number;
  widthPx: number;
  heightPx: number;
  panelType?: string;
  refreshRate?: number;
  responseTime?: number;
  brightness?: number;
  contrast?: string;
  ports?: string[];
  curved?: boolean;
  curvatureRadius?: number;
  curvatureType?: string;
  price?: number;
  source?: string;
  updatedAt: string;
}

// ======= KONFIGURACJA =======
const OUTPUT_PATH = path.join(process.cwd(), "public", "monitors.json");

// Marki do scrapowania
// UWAGA: Samsung brand page (/en/brand/08cd6) zawiera ~90% TV — POMIJAMY tę sekcję
// Inne brand pages są głównie monitorami
const BRAND_PATHS: string[] = [
  "/en/brand-db0f8",    // ASUS (monitory desktop + DIY)
  "/en/brand-62dea",    // BenQ
  "/en/brand-1fe710",   // AOC
  "/en/brand-1c8449",   // BOE
  "/en/brand-db2e1",    // LG
  "/en/brand-505dc1",   // Dell
  "/en/brand-37b4b",    // ViewSonic
  "/en/brand-7c1cb",    // Acer
  "/en/brand-7fc3d",    // HP
  "/en/brand-f7665f",   // Kuycon
  "/en/brand-695155",   // Dough
  "/en/brand-7da0d",    // Lenovo
  "/en/brand-db2e3",    // MSI
];

// Filtry modeli:
// Zakres przekątnej monitorów desktop: 17" – 57" (ponad 60" to prawie zawsze TV)
const MIN_DIAGONAL = 17;
const MAX_DIAGONAL = 57;

// Lista wzorców modeli TV (suffix/prefix w numerze modelu, nie na początku nazwy)
const TV_MODEL_PATTERNS: RegExp[] = [
  /^UN\d{2,3}/i,   // Samsung UN40..., UN55..., UN65...
  /^QN\d{2,3}/i,   // Samsung QN40..., QN55..., QN65... (QLED TV)
  /^UE\d{2,3}/i,   // Samsung UE40..., UE55... (EU models)
  /^UA\d{2,3}/i,   // Samsung UA40..., UA55... (Asia models)
  /^TU\d{2,3}/i,   // Samsung TU50..., TU55... (2020+ LED TV)
  /^TQ\d{2,3}/i,   // Samsung TQ55..., TQ65... (2022+ Neo QLED)
  /^QE\d{2,3}/i,   // Samsung QE55..., QE65... (QLED TV full model)
  /^RW/,           // RCA RWT..., RWH...
  /^M[0-9]{2,3}/i, // Inne TV z M-prefix
  /^K\d{2,3}/i,    // Some Sharp/K 其他 TV
];

function isLikelyTV(nameRaw: string, diagonal: number): boolean {
  // Ekstrakcja numeru modelu (wszystko po pierwszejspacji = marka + reszta)
  // np. "Samsung UN65JU6700" → "UN65JU6700"
  const parts = nameRaw.trim().split(/\s+/);
  const modelNumber = parts.slice(1).join(""); // reszta po nazwie marki

  // Sprawdź wzorce TV w numerze modelu
  for (const pattern of TV_MODEL_PATTERNS) {
    if (pattern.test(modelNumber)) return true;
  }

  // Alternatywnie: bardzo duża przekątna (> MAX_DIAGONAL) ale z TV pattern
  // (dla monitorów poniżej MAX_DIAGONAL pomijamy ten warunek)

  return false;
}

const SCRAPE_DELAY_MS_MIN = 2000;
const SCRAPE_DELAY_MS_MAX = 14000;
const NAVIGATE_TIMEOUT_MS = 15000;
// =============================

let browser: ChromiumBrowser;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(): Promise<void> {
  const ms = SCRAPE_DELAY_MS_MIN + Math.floor(Math.random() * (SCRAPE_DELAY_MS_MAX - SCRAPE_DELAY_MS_MIN));
  return sleep(ms);
}

// Pobierz WSZYSTKIE linki do modeli z strony marki
async function getAllModelLinks(brandPath: string): Promise<{ href: string; text: string }[]> {
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

  try {
    const url = `https://www.displayspecifications.com${brandPath}`;
    await page.goto(url, { timeout: NAVIGATE_TIMEOUT_MS, waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    const links = await page.$$eval("a[href*='/en/model/']", (els: HTMLAnchorElement[]) => {
      const seen = new Set<string>();
      const result: { href: string; text: string }[] = [];
      for (const e of els) {
        const href = e.pathname;
        if (seen.has(href)) continue;
        const text = (e.textContent ?? "").trim();
        if (!text) continue; // pomijamy linki z obrazkiem (pusty textContent)
        seen.add(href);
        result.push({ href, text });
      }
      return result;
    });

    console.log(`  ✓ ${brandPath}: ${links.length} modeli`);
    return links;
  } catch (e: any) {
    console.warn(`  ⚠ ${brandPath}: błąd — ${e.message.slice(0, 60)}`);
    return [];
  } finally {
    await page.close();
  }
}

// Scrapuj pojedynczy monitor
async function scrapeMonitor(modelPath: string): Promise<MonitorRaw | null> {
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

  try {
    const url = `https://www.displayspecifications.com${modelPath}`;
    const res = await page.goto(url, { timeout: NAVIGATE_TIMEOUT_MS, waitUntil: "domcontentloaded" });
    if (!res || res.status() >= 400) return null;

    try {
      await page.waitForSelector("h1, table", { timeout: 15000 });
    } catch {
      return null;
    }

    async function getTableValue(headerPat: string): Promise<string> {
      const rows = await page.$$("table tr");
      for (const row of rows) {
        const cells = await row.$$("td");
        if (cells.length < 2) continue;
        const first = (await cells[0].textContent())?.trim() ?? "";
        if (first.toLowerCase().includes(headerPat.toLowerCase())) {
          return (await cells[1].textContent())?.trim() ?? "";
        }
      }
      return "";
    }

    const title = await page.title();
    const rawName = title || modelPath;

    const nameRaw = rawName
      .replace(/\s*-\s*Specifications$/i, "")
      .replace(/^[\d"\'.°\s]+/, "")
      .trim();

    const brand = nameRaw.split(/\s+/)[0] ?? "Unknown";
    const slug = modelPath.replace("/en/model/", "");
    const id = `${brand.toLowerCase().replace(/\s+/g, "-")}-${slug}`.substring(0, 64);

    // Resolution
    const resText = await getTableValue("Resolution");
    const resMatch = resText.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/i);
    const widthPx = resMatch ? parseInt(resMatch[1], 10) : 0;
    const heightPx = resMatch ? parseInt(resMatch[2], 10) : 0;

    // Diagonal z tytułu
    const diagMatch = rawName.match(/^(\d+[\."']?)\s*/);
    const diagFromTitle = diagMatch ? parseFloat(diagMatch[1].replace(/["']/, ".")) : 0;
    const diagText = await getTableValue("Diagonal");
    const diagNumMatch = diagText.match(/(\d+)/);
    const diagonal = diagFromTitle > 0 ? diagFromTitle : (diagNumMatch ? parseFloat(diagNumMatch[1]) : 0);

    if (!nameRaw || !widthPx || !diagonal) return null;

    // === FILTR TV ===
    // Powyżej MAX_DIAGONAL (57") = niemal na pewno TV
    if (diagonal > MAX_DIAGONAL) {
      // Wyjątek: Samsung Odyssey, Samsung ViewFinity, duże monitory Samsung
      const bigMonitorPatterns = /Odyssey|ViewFinity|S49F950U|S57CG950N|S65R950|S8[0-9]"/i;
      if (!bigMonitorPatterns.test(nameRaw)) return null;
    }

    // Poniżej MIN_DIAGONAL = tablety, małe LCD
    if (diagonal < MIN_DIAGONAL) return null;

    // TV pattern w numerze modelu (dla wszystkich rozmiarów)
    if (isLikelyTV(nameRaw, diagonal)) return null;

    // Panel, refresh rate, etc.
    const panelType = await getTableValue("Panel Type") || await getTableValue("Panel Technology") || undefined;
    // Refresh rate: wecrą wszystkie liczby z pola i wybierz największą (lub pierwszą sensowną)
    // "100-120 Hz" → [100, 120] → 120; "144 Hz" → [144] → 144; "100120" → [100, 120] → 120
    const rrText = await getTableValue("Refresh Rate");
    const rrNums = (rrText.match(/\d+/g) || []).map(n => parseInt(n, 10)).filter(n => n >= 30 && n <= 600);
    const refreshRate = rrNums.length > 0 ? Math.max(...rrNums) : undefined;
    const rtText = await getTableValue("Response Time");
    const rtNums = (rtText.match(/[\d.]+/g) || []).map(n => parseFloat(n)).filter(n => n >= 0.1 && n <= 50);
    const responseTime = rtNums.length > 0 ? Math.min(...rtNums) : undefined;
    const brightText = await getTableValue("Brightness");
    const brightNums = (brightText.match(/\d+/g) || []).map(n => parseInt(n, 10)).filter(n => n >= 100 && n <= 2000);
    const brightness = brightNums.length > 0 ? Math.max(...brightNums) : undefined;
    const contrast = await getTableValue("Contrast") || undefined;
    const curvText = await getTableValue("Curvature") || await getTableValue("Curvature Radius");
    const curved = !!curvText && !curvText.includes("Flat") && curvText.length > 0;
    const curvatureRadius = curved ? parseInt(curvText.replace(/[^\d]/g, ""), 10) || undefined : undefined;

    // Ports
    const ports: string[] = [];
    try {
      const rows = await page.$$("table tr");
      for (const row of rows) {
        const cells = await row.$$("td");
        if (cells.length < 2) continue;
        const label = (await cells[0].textContent())?.trim() ?? "";
        if (/^(HDMI|DisplayPort|USB-C|Thunderbolt|VGA|DVI)/i.test(label)) {
          const value = (await cells[1].textContent())?.trim() ?? "";
          ports.push(value ? `${label}: ${value}` : label);
        }
      }
    } catch { /* no ports */ }

    return {
      id,
      name: nameRaw,
      brand,
      diagonal,
      widthPx,
      heightPx,
      panelType: panelType || undefined,
      refreshRate,
      responseTime,
      brightness,
      contrast: contrast || undefined,
      ports: ports.length > 0 ? ports : undefined,
      curved: curved || undefined,
      curvatureRadius,
      curvatureType: curved ? "concave" : undefined,
      source: `https://www.displayspecifications.com${modelPath}`,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  } finally {
    await page.close();
  }
}

async function main() {
  console.log("🎬 Uruchamianie Playwright...");
  browser = await chromium.launch({ headless: true });

  let existing: MonitorRaw[] = [];
  if (fs.existsSync(OUTPUT_PATH)) {
    existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf-8"));
    console.log(`📂 Wczytano ${existing.length} istniejących monitorów\n`);
  }
  const existingIds = new Set(existing.map(m => m.id));

  // === KROK 1: Odkryj modele z brand pages ===
  console.log("🔍 Odkrywanie modeli z brand pages...\n");
  let allModelLinks: { href: string; text: string }[] = [];

  for (const brandPath of BRAND_PATHS) {
    const links = await getAllModelLinks(brandPath);
    allModelLinks.push(...links);
    await randomDelay();
  }

  // Deduplikuj
  const uniqueLinks = Array.from(
    new Map(allModelLinks.map(l => [l.href, l])).values()
  );
  console.log(`\n🔗 Razem unikalnych modeli: ${uniqueLinks.length}`);

  // Sortuj losowo (żeby TV i monitory były równo rozłożone)
  uniqueLinks.sort(() => Math.random() - 0.5);

  // === KROK 2: Scrapuj ===
  console.log("\n📥 Scrapowanie specyfikacji...\n");

  const newMonitors: MonitorRaw[] = [];
  let processed = 0;
  let skipped = 0;
  const SKIP_LOG_EVERY = 50;

  for (const { href } of uniqueLinks) {
    processed++;
    const slug = href.split("/").pop() ?? "";
    if (existingIds.has(slug)) { skipped++; continue; }

    const monitor = await scrapeMonitor(href);
    if (monitor) {
      existingIds.add(monitor.id);
      newMonitors.push(monitor);
      console.log(`  ✓ [${processed}/${uniqueLinks.length}] ${monitor.brand} ${monitor.name} (${monitor.diagonal}")`);
    } else {
      skipped++;
      if (skipped % SKIP_LOG_EVERY === 0) {
        console.log(`  ... ${skipped} odrzuconych (TV/poza zakresem)`);
      }
    }

    await randomDelay();
  }

  // === KROK 3: Zapisz ===
  const result = [...existing, ...newMonitors];
  result.sort((a, b) => a.diagonal - b.diagonal || a.brand.localeCompare(b.brand));

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), "utf-8");

  console.log(`\n✅ Zapisano ${result.length} monitorów → ${OUTPUT_PATH}`);
  console.log(`   Nowe: ${newMonitors.length} | Istniejące: ${existing.length} | Odrzucone: ${skipped}`);

  await browser.close();
  process.exit(0);
}

main().catch(async (err: Error) => {
  console.error("Fatal error:", err);
  if (browser) await browser.close();
  process.exit(1);
});
