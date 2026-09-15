const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const srcDir = path.join(__dirname, "..", "src");

function findFiles(dir, filter, fileList = []) {
  for (const file of fs.readdirSync(dir)) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, filter, fileList);
    } else if (filter.test(filePath)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// Komentar yang WAJIB dipertahankan — punya makna fungsional untuk
// TypeScript / ESLint / bundler, bukan sekadar dokumentasi.
function isDirective(text) {
  const t = text.trim();
  return (
    /^\/\/\/?\s*<reference\b/.test(t) ||
    /eslint-disable|eslint-enable/.test(t) ||
    /@ts-(expect-error|ignore|nocheck|check)\b/.test(t) ||
    /biome-ignore/.test(t) ||
    /prettier-ignore/.test(t) ||
    /@jsxImportSource|@jsxRuntime|@jsxFrag|@jsx\b/.test(t) ||
    /webpack(ChunkName|Prefetch|Preload|Ignore)|@vite-ignore/.test(t) ||
    /@__PURE__|@__NO_SIDE_EFFECTS__/.test(t)
  );
}

function mergeRanges(ranges) {
  ranges.sort((a, b) => a.pos - b.pos);
  const merged = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.pos <= last.end) last.end = Math.max(last.end, r.end);
    else merged.push({ ...r });
  }
  return merged;
}

// Kumpulkan rentang komentar lewat parser (aman: regex/template/JSX ter-reScan
// dengan benar, tak ada `//` di dalam regex yang salah dikira komentar).
function collectRanges(code, filename) {
  const jsx = /\.(tsx|jsx)$/.test(filename);
  const sf = ts.createSourceFile(
    filename,
    code,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ true,
    jsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const byPos = new Map();
  const extra = [];
  const addComment = (r) => {
    if (!isDirective(code.slice(r.pos, r.end))) {
      byPos.set(r.pos, { pos: r.pos, end: r.end });
    }
  };
  const walk = (node) => {
    // JSX comment `{/* ... */}` — buang berikut kurungnya (khusus JSX, tidak
    // menyentuh blok JS seperti `catch { /* ... */ }`).
    if (jsx && ts.isJsxExpression(node) && !node.expression) {
      const s = node.getStart(sf);
      const e = node.getEnd();
      const raw = code.slice(s, e);
      // Pertahankan directive yang dibungkus JSX, mis. `{/* eslint-disable-next-line ... */}`.
      if (/\/[*/]/.test(raw) && !isDirective(raw.replace(/^\{|\}$/g, ""))) {
        extra.push({ pos: s, end: e });
        return;
      }
    }
    const lead = ts.getLeadingCommentRanges(code, node.getFullStart());
    if (lead) lead.forEach(addComment);
    const trail = ts.getTrailingCommentRanges(code, node.getEnd());
    if (trail) trail.forEach(addComment);
    // Turun sampai token daun (termasuk `{`/`}`) supaya komentar di blok kosong
    // ikut terangkat tanpa merusak kurungnya.
    for (const child of node.getChildren(sf)) walk(child);
  };
  walk(sf);
  return mergeRanges([...byPos.values(), ...extra]);
}

function stripComments(code, filename) {
  const ranges = collectRanges(code, filename);
  let out = code;
  for (let i = ranges.length - 1; i >= 0; i--) {
    out = out.slice(0, ranges[i].pos) + out.slice(ranges[i].end);
  }
  out = out.replace(/^[ \t]+$/gm, "");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

const isDryRun = process.argv.includes("--dry");
const files = findFiles(srcDir, /\.(ts|tsx|js|jsx)$/);

let totalFiles = 0;
let totalLinesRemoved = 0;

for (const file of files) {
  const original = fs.readFileSync(file, "utf-8");
  let stripped;
  try {
    stripped = stripComments(original, file);
  } catch (e) {
    console.error(
      `  ! SKIP ${path.relative(process.cwd(), file)} — ${e.message}`,
    );
    continue;
  }

  if (original !== stripped) {
    const removed = Math.max(
      0,
      (original.match(/\n/g) || []).length -
        (stripped.match(/\n/g) || []).length,
    );
    const rel = path.relative(process.cwd(), file);
    if (isDryRun) {
      console.log(`  [DRY] ${rel} (-${removed} lines)`);
    } else {
      fs.writeFileSync(file, stripped);
      console.log(`  ✓ ${rel} (-${removed} lines)`);
    }
    totalFiles++;
    totalLinesRemoved += removed;
  }
}

console.log(
  `\n${isDryRun ? "[DRY-RUN] " : ""}${totalFiles} files modified, ~${totalLinesRemoved} lines of comments removed.`,
);
