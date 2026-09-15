#!/usr/bin/env node
/**
 * Baca manifest.json + bantuan-entries.json.
 * Untuk setiap entry yang route-nya punya shot sukses, inject
 *   ![title](/bantuan/media/<slug>/01-halaman.png "caption")
 * setelah baris ## H1 pertama di export const <exportName>.
 *
 * Idempotent — skip kalau shot path sudah muncul di string content.
 *
 * Jalankan:
 *   node scripts/bantuan-inject.mjs
 */

import { readFile, writeFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const MANIFEST_FILE = join(ROOT, "public", "bantuan", "media", "manifest.json");
const ENTRIES_FILE = join(__dirname, "bantuan-entries.json");
const CONTENT_DIR = join(ROOT, "src", "content", "manual");

function sanitizeRoute(route) {
  return route
    .replace(/^\/+/, "")
    .replace(/\?.*$/, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function loadContentFiles() {
  const files = await readdir(CONTENT_DIR);
  const map = new Map(); // exportName → { file, src }
  for (const f of files) {
    if (!f.endsWith(".ts")) continue;
    const path = join(CONTENT_DIR, f);
    const src = await readFile(path, "utf8");
    const re = /export\s+const\s+(\w+)\s*=/g;
    let m;
    while ((m = re.exec(src))) {
      map.set(m[1], { file: path, src });
    }
  }
  return map;
}

function injectImage(src, exportName, imgMd) {
  if (src.includes(imgMd))
    return { src, changed: false, reason: "already present" };
  const re = new RegExp(
    `(export\\s+const\\s+${exportName}\\s*=\\s*\`)(##[^\\n]*\\n)`,
  );
  const match = re.exec(src);
  if (!match)
    return { src, changed: false, reason: "H1 anchor tidak ditemukan" };
  const before = src.slice(0, match.index);
  const [full, prefix, h1line] = match;
  const after = src.slice(match.index + full.length);
  const nextSrc = `${before}${prefix}${h1line}\n${imgMd}\n${after}`;
  return { src: nextSrc, changed: true };
}

async function main() {
  const manifest = JSON.parse(await readFile(MANIFEST_FILE, "utf8"));
  const entries = JSON.parse(await readFile(ENTRIES_FILE, "utf8"));

  const shotBySlug = new Map();
  for (const shot of manifest.shots ?? []) {
    if (!shot.slug.startsWith("routes/")) continue;
    const existing = shotBySlug.get(shot.slug);
    if (!existing || shot.name < existing.name) shotBySlug.set(shot.slug, shot);
  }

  const contentFiles = await loadContentFiles();
  console.log(
    `[bantuan-inject] ${contentFiles.size} export const ditemukan di content/manual`,
  );
  console.log(`[bantuan-inject] ${shotBySlug.size} shot sukses di manifest`);

  const changes = new Map(); // file path → new src
  const stats = { injected: 0, skipped: 0, missingShot: 0, missingExport: 0 };

  for (const entry of entries) {
    if (!entry.route || !entry.exportName) {
      stats.skipped++;
      continue;
    }
    const slug = `routes/${sanitizeRoute(entry.route)}`;
    const shot = shotBySlug.get(slug);
    if (!shot) {
      stats.missingShot++;
      continue;
    }
    const cf = contentFiles.get(entry.exportName);
    if (!cf) {
      stats.missingExport++;
      console.warn(
        `  · export tidak ketemu: ${entry.exportName} (slug ${entry.slug})`,
      );
      continue;
    }
    const currentSrc = changes.get(cf.file) ?? cf.src;
    const alt = entry.title;
    const caption = entry.title;
    const imgMd = `![${alt}](${shot.path} "${caption}")`;
    const {
      src: nextSrc,
      changed,
      reason,
    } = injectImage(currentSrc, entry.exportName, imgMd);
    if (changed) {
      changes.set(cf.file, nextSrc);
      stats.injected++;
    } else {
      stats.skipped++;
      if (reason && reason !== "already present") {
        console.warn(`  · ${entry.exportName}: ${reason}`);
      }
    }
  }

  for (const [path, src] of changes) {
    await writeFile(path, src);
    console.log(`  ✓ ${path.replace(ROOT + "/", "")}`);
  }

  console.log(`[bantuan-inject] selesai.`);
  console.log(
    `  injected: ${stats.injected}, skipped: ${stats.skipped}, missingShot: ${stats.missingShot}, missingExport: ${stats.missingExport}`,
  );
  console.log(`  files edited: ${changes.size}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
