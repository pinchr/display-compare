// scripts/fetch-monitors.ts
// Uruchomienie: npx tsx scripts/fetch-monitors.ts
// Wymaga: npm i -D tsx node-fetch cheerio

import * as fs from "fs";
import * as path from "path";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

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
  price?: number;
  source?: string;
  updatedAt: string;
}

const OUTPUT_PATH = path.join(process.cwd(), "public", "monitors.json");
const BASE_URL = "https://www.displayspecifications.com";
const DELAY_MS = 800; // grzeczny scraper — nie bombarduj serwera

// Lista URL-i do scrape'owania — dodawaj ręcznie lub generuj ze strony kategorii
const MONITOR_URLS: string[] = [
  "/en/model/abc123",  // zastąp prawdziwymi
  // ...
];

// ----- lub: pobierz automatycznie z kategorii -----
async function fetchCategoryUrls(categoryPath: string): Promise<string[]> {
  const res = await fetch(`${BASE_URL}${categoryPath}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const urls: string[] = [];
  $("a[href*='/en/model/']").each((_, el) => {
    const href = $(el).attr("href");
    if (href && !urls.includes(href)) urls.push(href);
  });
  return urls;
}

async function scrapeMonitor(urlPath: string): Promise<MonitorRaw | null> {
  try {
    const res = await fetch(`${BASE_URL}${urlPath}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const name = $("h1.model-name").text().trim();
    const brand = $(".brand-name").text().trim();

    const getSpec = (label: string): string => {
      return $(`td:contains("${label}")`).next("td").first().text().trim();
    };

    // Rozdzielczość np. "3840 x 2160"
    const resText = getSpec("Resolution");
    const [widthPx, heightPx] = resText.split("x").map(s => parseInt(s.trim(), 10));

    // Przekątna np. "27.0 inches"
    const diagText = getSpec("Diagonal");
    const diagonal = parseFloat(diagText);

    // Typ panelu
    const panelType = getSpec("Panel Type") || getSpec("Panel Technology");

    // Odświeżanie np. "144 Hz"
    const rrText = getSpec("Refresh Rate");
    const refreshRate = parseInt(rrText, 10) || undefined;

    // Czas reakcji np. "1 ms"
    const rtText = getSpec("Response Time");
    const responseTime = parseFloat(rtText) || undefined;

    // Jasność
    const brightText = getSpec("Brightness");
    const brightness = parseInt(brightText, 10) || undefined;

    // Kontrast
    const contrast = getSpec("Contrast Ratio") || undefined;

    // Zakrzywienie
    const curvText = getSpec("Curvature") || getSpec("Curvature Radius");
    const curved = curvText.length > 0 && curvText !== "Flat";
    const curvatureRadius = curved ? parseInt(curvText, 10) || undefined : undefined;

    // Porty
    const ports: string[] = [];
    $("td:contains('HDMI'), td:contains('DisplayPort'), td:contains('USB-C')").each((_, el) => {
      const text = $(el).text().trim();
      if (text) ports.push(text);
    });

    // Slug jako ID
    const slug = urlPath.replace("/en/model/", "");
    const id = `${brand.toLowerCase().replace(/\s+/g, "-")}-${slug}`.substring(0, 64);

    if (!name || !widthPx || !diagonal) return null;

    return {
      id,
      name,
      brand,
      diagonal,
      widthPx: widthPx || 1920,
      heightPx: heightPx || 1080,
      panelType,
      refreshRate,
      responseTime,
      brightness,
      contrast,
      ports,
      curved,
      curvatureRadius,
      curvatureType: curved ? "concave" : undefined,
      source: `${BASE_URL}${urlPath}`,
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`Błąd przy ${urlPath}:`, err);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // 1. Wczytaj istniejącą bazę (merge, nie nadpisuj)
  let existing: MonitorRaw[] = [];
  if (fs.existsSync(OUTPUT_PATH)) {
    existing = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf-8"));
    console.log(`Wczytano ${existing.length} istniejących monitorów`);
  }
  const existingIds = new Set(existing.map(m => m.id));

  // 2. Zbierz URL-e kategorii (opcjonalne — możesz też użyć stałej listy)
  const categoryUrls = await fetchCategoryUrls("/en/monitors");
  const allUrls = [...new Set([...MONITOR_URLS, ...categoryUrls])];
  console.log(`Do scrape'owania: ${allUrls.length} URL-i`);

  // 3. Scrape każdego monitora
  const newMonitors: MonitorRaw[] = [];
  for (const url of allUrls) {
    const monitor = await scrapeMonitor(url);
    if (monitor && !existingIds.has(monitor.id)) {
      newMonitors.push(monitor);
      console.log(`  ✓ ${monitor.brand} ${monitor.name}`);
    } else if (monitor) {
      // Aktualizuj istniejący wpis (merge by id)
      const idx = existing.findIndex(m => m.id === monitor.id);
      if (idx >= 0) existing[idx] = { ...existing[idx], ...monitor };
    }
    await sleep(DELAY_MS);
  }

  // 4. Połącz i zapisz
  const result = [...existing, ...newMonitors];
  result.sort((a, b) => a.diagonal - b.diagonal || a.brand.localeCompare(b.brand));

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), "utf-8");
  console.log(`\n✅ Zapisano ${result.length} monitorów → ${OUTPUT_PATH}`);
  console.log(`   Nowe: ${newMonitors.length} | Istniejące: ${existing.length}`);
}

main().catch(console.error);