#!/usr/bin/env node
/**
 * Baca src/lib/bantuan/manual.registry.ts → emit scripts/bantuan-targets.json.
 *
 * Setiap unique `route` yang muncul di MANUAL_ENTRIES jadi satu target.
 * Path shot: public/bantuan/media/routes/<sanitized-route>/01-halaman.png
 * Beberapa entry yang share route akan share shot yang sama.
 *
 * Jalankan:
 *   node scripts/bantuan-plan.mjs
 *
 * Setelah itu:
 *   node scripts/bantuan-screenshot.mjs
 *   node scripts/bantuan-inject.mjs
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const REGISTRY = join(ROOT, "src", "lib", "bantuan", "manual.registry.ts");
const TARGETS_OUT = join(__dirname, "bantuan-targets.json");
const ENTRIES_OUT = join(__dirname, "bantuan-entries.json");
const EXTRAS_FILE = join(__dirname, "bantuan-targets-extras.json");

function sanitizeRoute(route) {
  return route
    .replace(/^\/+/, "")
    .replace(/\?.*$/, "")
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseEntries(src) {
  const start = src.indexOf("MANUAL_ENTRIES");
  if (start < 0) throw new Error("MANUAL_ENTRIES tidak ketemu");
  const arrStart = src.indexOf("[", start);
  const arrEnd = src.indexOf("];", arrStart);
  const block = src.slice(arrStart + 1, arrEnd);

  const entries = [];
  const objRe = /\{([^{}]*)\}/g;
  let m;
  while ((m = objRe.exec(block))) {
    const body = m[1];
    const slug = /slug:\s*"([^"]+)"/.exec(body)?.[1];
    if (!slug) continue;
    const route = /route:\s*"([^"]+)"/.exec(body)?.[1] ?? null;
    const moduleGroup = /moduleGroup:\s*"([^"]+)"/.exec(body)?.[1] ?? "";
    const title = /title:\s*"([^"]+)"/.exec(body)?.[1] ?? "";
    const exportName = /content:\s*g\((\w+)\)/.exec(body)?.[1] ?? null;
    entries.push({ slug, route, moduleGroup, title, exportName });
  }
  return entries;
}

function buildTargets(entries) {
  const byRoute = new Map();
  for (const e of entries) {
    if (!e.route) continue;
    const key = e.route;
    if (!byRoute.has(key)) byRoute.set(key, []);
    byRoute.get(key).push(e);
  }
  const targets = [];
  for (const [route, group] of byRoute) {
    const slug = `routes/${sanitizeRoute(route)}`;
    const titles = group
      .map((g) => g.title)
      .slice(0, 3)
      .join(" · ");
    targets.push({
      slug,
      shots: [
        {
          name: "01-halaman",
          url: route,
          waitFor: "main, [data-slot='page-title'], [data-slot='card']",
          settleMs: 1500,
          caption: titles,
        },
      ],
    });
  }
  return targets;
}

async function main() {
  const src = await readFile(REGISTRY, "utf8");
  const entries = parseEntries(src);
  const withRoute = entries.filter((e) => e.route);
  const withoutRoute = entries.filter((e) => !e.route);

  const targets = buildTargets(entries);

  // Merge extras: shot manual (sub-tab, dialog, annotated). Extras yang punya
  // slug sama dengan auto akan MERGE shots (append), bukan replace.
  let extras = [];
  if (existsSync(EXTRAS_FILE)) {
    extras = JSON.parse(await readFile(EXTRAS_FILE, "utf8"));
    const bySlug = new Map(targets.map((t) => [t.slug, t]));
    for (const ex of extras) {
      if (bySlug.has(ex.slug)) {
        bySlug.get(ex.slug).shots.push(...ex.shots);
      } else {
        targets.push(ex);
      }
    }
  }

  await writeFile(TARGETS_OUT, JSON.stringify(targets, null, 2) + "\n");
  await writeFile(ENTRIES_OUT, JSON.stringify(entries, null, 2) + "\n");

  console.log(`[bantuan-plan] ${entries.length} entries dibaca`);
  console.log(
    `  · ${withRoute.length} punya route → ${targets.length} unique target`,
  );
  console.log(`  · ${withoutRoute.length} tanpa route (SOP/konseptual, skip)`);
  if (extras.length) {
    const extraShots = extras.reduce((sum, e) => sum + e.shots.length, 0);
    console.log(
      `  · ${extras.length} extras merged (${extraShots} shot tambahan)`,
    );
  }
  console.log(`  → ${TARGETS_OUT}`);
  console.log(`  → ${ENTRIES_OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
