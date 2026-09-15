#!/usr/bin/env node
/**
 * Auto-screenshot pages untuk panduan Bantuan.
 *
 * Prasyarat sekali:
 *   pnpm add -D puppeteer
 *
 * Cara pakai:
 *   BASE_URL=http://localhost:3000 \
 *   LOGIN_EMAIL=admin@cilupbah.test LOGIN_PASSWORD=secret \
 *   node scripts/bantuan-screenshot.mjs
 *
 * Baca target dari scripts/bantuan-targets.json — tiap target punya slug
 * (mengikuti slug panduan) + daftar shots. Setiap shot menghasilkan
 *   public/bantuan/media/<slug>/<name>.png
 * plus manifest gabungan public/bantuan/media/manifest.json.
 *
 * Untuk shot yang butuh interaksi: sebutkan `steps` (array click/type/wait).
 * Selector CSS standar; tambahkan `data-testid` di komponen kalau butuh stabil.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const TARGETS_FILE = join(__dirname, "bantuan-targets.json");
const MEDIA_ROOT = join(ROOT, "public", "bantuan", "media");
const MANIFEST_FILE = join(MEDIA_ROOT, "manifest.json");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const LOGIN_EMAIL = process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;
const VIEWPORT_W = Number(process.env.VIEWPORT_W || 1440);
const VIEWPORT_H = Number(process.env.VIEWPORT_H || 900);

if (!LOGIN_EMAIL || !LOGIN_PASSWORD) {
  console.error(
    "[bantuan-screenshot] LOGIN_EMAIL & LOGIN_PASSWORD wajib di env.",
  );
  process.exit(1);
}

let puppeteer;
try {
  puppeteer = (await import("puppeteer")).default;
} catch {
  console.error(
    "[bantuan-screenshot] puppeteer belum diinstal. Jalankan: pnpm add -D puppeteer",
  );
  process.exit(1);
}

async function loadTargets() {
  if (!existsSync(TARGETS_FILE)) {
    console.error(
      `[bantuan-screenshot] targets file tidak ada: ${TARGETS_FILE}`,
    );
    process.exit(1);
  }
  const raw = await readFile(TARGETS_FILE, "utf8");
  return JSON.parse(raw);
}

async function login(page) {
  console.log(`[bantuan-screenshot] login sebagai ${LOGIN_EMAIL}`);
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
  await page.waitForSelector('input[type="email"], input[name="email"]', {
    timeout: 10_000,
  });
  await page.type('input[type="email"], input[name="email"]', LOGIN_EMAIL);
  await page.type(
    'input[type="password"], input[name="password"]',
    LOGIN_PASSWORD,
  );
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 15_000 }),
    page.click('button[type="submit"]'),
  ]);
  const url = page.url();
  if (url.includes("/login")) {
    throw new Error("Login gagal — masih di /login setelah submit.");
  }
  console.log(`[bantuan-screenshot] login OK → ${url}`);
}

async function clickByText(page, text, tag = "*") {
  const handle = await page.evaluateHandle(
    (t, tg) => {
      const nodes = Array.from(document.querySelectorAll(tg));
      const target = t.trim().toLowerCase();
      return (
        nodes.find((n) => {
          if (!(n instanceof HTMLElement) || n.offsetParent === null)
            return false;
          const own = (n.textContent ?? "").trim().toLowerCase();
          return (
            own === target || own.startsWith(target) || own.endsWith(target)
          );
        }) ?? null
      );
    },
    text,
    tag,
  );
  const el = handle.asElement();
  if (!el) throw new Error(`Element dengan text "${text}" tidak ketemu`);
  await el.click();
}

async function runStep(page, step) {
  const { type, selector, text, delay = 250, waitFor, tag } = step;
  switch (type) {
    case "click":
      await page.waitForSelector(selector, { timeout: 5_000 });
      await page.click(selector);
      break;
    case "clickText":
      await clickByText(page, text ?? "", tag ?? "button, a, [role='tab']");
      break;
    case "type":
      await page.waitForSelector(selector, { timeout: 5_000 });
      await page.type(selector, text ?? "");
      break;
    case "waitFor":
      await page.waitForSelector(waitFor ?? selector, { timeout: 5_000 });
      break;
    case "waitTime":
      await new Promise((r) => setTimeout(r, Number(text ?? 500)));
      break;
    default:
      console.warn(`  · unknown step type: ${type}`);
  }
  if (delay) await new Promise((r) => setTimeout(r, delay));
}

/**
 * Inject numbered callout overlays before screenshot.
 * annotations: [{ selector, label, position? }]
 *   position: "tl" | "tr" | "bl" | "br" (default "tl")
 * Returns nothing — overlays remain until page navigation.
 */
async function injectAnnotations(page, annotations) {
  if (!annotations?.length) return;
  await page.evaluate((anns) => {
    document
      .querySelectorAll("[data-bantuan-annot]")
      .forEach((n) => n.remove());
    const style = document.createElement("style");
    style.setAttribute("data-bantuan-annot", "style");
    style.textContent = `
      .bantuan-annot {
        position: absolute; z-index: 99999;
        display: inline-flex; align-items: center; gap: 6px;
        padding: 4px 10px 4px 4px;
        background: #0f766e; color: #fff;
        border-radius: 999px;
        font: 600 12px/1.2 -apple-system,BlinkMacSystemFont,sans-serif;
        box-shadow: 0 4px 14px rgb(15 118 110 / 40%), 0 0 0 3px rgb(255 255 255 / 90%);
        pointer-events: none;
        white-space: nowrap;
        max-width: 260px;
      }
      .bantuan-annot::before {
        content: attr(data-num);
        display: inline-flex; align-items: center; justify-content: center;
        width: 20px; height: 20px; border-radius: 50%;
        background: #fff; color: #0f766e; font-size: 11px; font-weight: 700;
      }
      .bantuan-annot-ring {
        position: absolute; z-index: 99998;
        border: 2px solid #0f766e;
        border-radius: 12px;
        pointer-events: none;
        box-shadow: 0 0 0 4px rgb(15 118 110 / 15%);
      }
    `;
    document.head.appendChild(style);

    function resolveEl(sel) {
      if (sel.startsWith("text=")) {
        const target = sel.slice(5).trim().toLowerCase();
        const nodes = Array.from(
          document.querySelectorAll(
            "button, a, [role='tab'], h1, h2, h3, label, [data-slot]",
          ),
        );
        return nodes.find((n) => {
          if (!(n instanceof HTMLElement) || n.offsetParent === null)
            return false;
          const own = (n.textContent ?? "").trim().toLowerCase();
          return (
            own === target || own.startsWith(target) || own.includes(target)
          );
        });
      }
      return document.querySelector(sel);
    }

    anns.forEach((a, idx) => {
      const el = resolveEl(a.selector);
      if (!(el instanceof HTMLElement)) return;
      const r = el.getBoundingClientRect();
      const scrollX = window.scrollX,
        scrollY = window.scrollY;

      const ring = document.createElement("div");
      ring.className = "bantuan-annot-ring";
      ring.setAttribute("data-bantuan-annot", "ring");
      Object.assign(ring.style, {
        top: `${r.top + scrollY - 4}px`,
        left: `${r.left + scrollX - 4}px`,
        width: `${r.width + 8}px`,
        height: `${r.height + 8}px`,
      });
      document.body.appendChild(ring);

      const badge = document.createElement("div");
      badge.className = "bantuan-annot";
      badge.setAttribute("data-bantuan-annot", "badge");
      badge.setAttribute("data-num", String(idx + 1));
      badge.textContent = a.label ?? "";
      const pos = a.position ?? "tl";
      const w = 200,
        h = 26;
      let top = r.top + scrollY,
        left = r.left + scrollX;
      if (pos === "tr") left = r.right + scrollX - w + 8;
      if (pos === "bl") top = r.bottom + scrollY + 6;
      if (pos === "br") {
        top = r.bottom + scrollY + 6;
        left = r.right + scrollX - w + 8;
      }
      if (pos === "tl") {
        top = top - h - 4;
      }
      Object.assign(badge.style, {
        top: `${top}px`,
        left: `${Math.max(4, left)}px`,
      });
      document.body.appendChild(badge);
    });
  }, annotations);
  await new Promise((r) => setTimeout(r, 120));
}

async function detectPageIssue(page, expectedPath) {
  const url = page.url();
  const path = new URL(url).pathname;
  if (path.startsWith("/login")) return "redirect-to-login";
  if (path.startsWith("/_error") || path.includes("/404")) return "next-error";
  const bodyText = await page.evaluate(() => document.body?.innerText ?? "");
  const first500 = bodyText.slice(0, 500).toLowerCase();
  if (
    /404|this page could not be found|not[- ]found|tidak ditemukan/.test(
      first500,
    )
  ) {
    return "page-not-found";
  }
  const expected = expectedPath.split("?")[0].replace(/\/+$/, "");
  const actual = path.replace(/\/+$/, "");
  if (expected && actual !== expected && !actual.startsWith(expected)) {
    return `redirected-to-${actual}`;
  }
  return null;
}

async function shoot(page, target, shot, manifestEntries, failed) {
  const outDir = join(MEDIA_ROOT, target.slug);
  const outPath = join(outDir, `${shot.name}.png`);
  const relPath = `/bantuan/media/${target.slug}/${shot.name}.png`;

  const fullUrl = new URL(shot.url, BASE_URL).toString();
  const expectedPath = new URL(fullUrl).pathname;
  console.log(`  · shoot ${target.slug}/${shot.name} → ${fullUrl}`);
  await page.goto(fullUrl, { waitUntil: "networkidle2", timeout: 20_000 });

  const issue = await detectPageIssue(page, expectedPath);
  if (issue) {
    console.warn(`    ✗ SKIP: ${issue}`);
    failed.push({
      slug: target.slug,
      name: shot.name,
      url: fullUrl,
      reason: issue,
    });
    return;
  }

  if (shot.waitFor) {
    try {
      await page.waitForSelector(shot.waitFor, { timeout: 8_000 });
    } catch {
      console.warn(`    ! waitFor "${shot.waitFor}" timeout — lanjut anyway.`);
    }
  }
  for (const step of shot.steps ?? []) {
    try {
      await runStep(page, step);
    } catch (err) {
      console.warn(`    ! step ${step.type} gagal: ${err.message}`);
    }
  }
  await new Promise((r) => setTimeout(r, shot.settleMs ?? 400));

  await injectAnnotations(page, shot.annotations);

  const clip = shot.clipSelector
    ? await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }, shot.clipSelector)
    : null;

  await mkdir(outDir, { recursive: true });
  await page.screenshot({
    path: outPath,
    clip: clip ?? undefined,
    fullPage: !clip && (shot.fullPage ?? false),
  });

  manifestEntries.push({
    slug: target.slug,
    name: shot.name,
    path: relPath,
    url: fullUrl,
    caption: shot.caption ?? "",
    capturedAt: new Date().toISOString(),
  });
}

async function main() {
  const targets = await loadTargets();
  console.log(
    `[bantuan-screenshot] ${targets.length} target, base=${BASE_URL}`,
  );

  const browser = await puppeteer.launch({
    headless: process.env.HEADFUL ? false : "new",
    defaultViewport: { width: VIEWPORT_W, height: VIEWPORT_H },
  });

  try {
    const page = await browser.newPage();
    await login(page);
    await mkdir(MEDIA_ROOT, { recursive: true });

    const manifestEntries = [];
    const failed = [];
    for (const target of targets) {
      console.log(`[${target.slug}]`);
      for (const shot of target.shots) {
        try {
          await shoot(page, target, shot, manifestEntries, failed);
        } catch (err) {
          console.error(`    ✗ ${shot.name}: ${err.message}`);
          failed.push({
            slug: target.slug,
            name: shot.name,
            reason: `error: ${err.message}`,
          });
        }
      }
    }

    await writeFile(
      MANIFEST_FILE,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          shots: manifestEntries,
          failed,
        },
        null,
        2,
      ),
    );
    console.log(`[bantuan-screenshot] selesai. Manifest: ${MANIFEST_FILE}`);
    console.log(
      `  ${manifestEntries.length} shot tersimpan, ${failed.length} gagal (lihat manifest.failed).`,
    );
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[bantuan-screenshot] fatal:", err);
  process.exit(1);
});
