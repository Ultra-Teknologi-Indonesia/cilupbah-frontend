import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  ...nextVitals,
  ...nextTs,
  // Ditaruh SETELAH nextVitals/nextTs agar override menang. React Compiler
  // sengaja melewati (skip) komponen yang memakai API react-hook-form
  // (`watch()`) & TanStack Table (`useReactTable()`) — keduanya mengembalikan
  // fungsi yang tak bisa dimemo. Informasional & tak bisa diperbaiki tanpa
  // membuang lib-nya, jadi dimatikan.
  {
    rules: {
      "react-hooks/incompatible-library": "off",
    },
  },
  // Komponen tidak boleh memanggil service langsung — akses data lewat layer
  // hooks (react-query) agar caching/invalidations konsisten. Masih "warn"
  // karena ada pelanggar lama (lihat AUDIT-FE.md §2); jangan tambah baru.
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/services/*"],
              message:
                "Komponen jangan impor service langsung — bungkus di hook @/hooks/* (react-query).",
            },
          ],
        },
      ],
    },
  },
  // Script Node (CommonJS) di luar bundel Next — `require()` memang idiomatik
  // di sini, jadi larangan no-require-imports (khusus TS) tidak berlaku.
  {
    files: ["scripts/**/*.{js,cjs}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // PDF.js worker disalin dari pdfjs-dist; bukan source kita.
    "public/pdf.worker.min.mjs",
  ]),
]);

export default eslintConfig;
