<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Coding Standards (cilupbah-fe)

Dokumen ini adalah panduan standar penulisan kode untuk proyek Next.js (`cilupbah-fe`). Semua AI Agent dan _developer_ **WAJIB** mematuhi aturan ini ketika membuat atau memodifikasi fitur baru. Ini adalah **product UI ERP gudang padat data**, bukan landing page — utamakan konsistensi lewat token/komponen shared, bukan keputusan visual per-file.

> Standar backend ada di `../cilupbah-be/agents.md`. FE dan BE mengikuti pola yang sama: pakai primitive/kontrak bersama, jangan meracik sendiri.

## 0. Orientasi Kode (graphify)

- Proyek punya knowledge graph di `graphify-out/`. Untuk pertanyaan tentang struktur/relasi kode, jalankan `graphify query "<pertanyaan>"` lebih dulu, bukan langsung `grep`/baca file mentah.
- Setelah mengubah kode, jalankan `graphify update .` agar graph tetap sinkron (AST-only, tanpa biaya API).

## 1. Stack & Struktur

- **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4.** UI berbasis **shadcn/ui** (`components.json`, style `radix-luma`, base color `neutral`, ikon `lucide`).
- **Data fetching**: **TanStack React Query v5**. **State klien**: **Zustand v5** (`store/use-auth-store.ts`, `store/use-ui-store.ts`). **TIDAK ADA Redux** — jangan menambah Redux/RTK-Query.
- **Validasi**: **Zod v4** (`schemas/`). **Form**: **react-hook-form v7**. **Toast**: **sonner**. **Tema**: **next-themes**. **Tabel**: **@tanstack/react-table**.
- **Alias impor** (dari `components.json`): `@/components`, `@/components/ui` (ui = `@ui`), `@/lib`, `@/hooks`. Pakai alias ini, bukan path relatif panjang.
- **Direktori `src/`**:
  - `app/` — App Router (route, `layout.tsx`, `actions/` server actions, `api/` route handlers). Default **Server Component**; tambahkan `"use client"` hanya saat butuh interaktivitas/hook.
  - `components/` — `ui/` (shadcn primitives), plus `auth/`, `dashboard/`, `providers/`.
  - `services/<domain>/` — modul pemanggil API (axios) yang mengembalikan `ApiResponse<T>`.
  - `hooks/<domain>/` — hook React Query per domain.
  - `store/` — Zustand. `schemas/` — Zod. `types/` — tipe TS. `lib/` — util & helper.

## 2. Lapisan Data (Service → Hook → Component)

Alur data WAJIB berlapis, jangan panggil API langsung dari komponen:

1. **Service** (`services/<domain>/*.service.ts`): panggil `fetchClient<ApiResponse<T>>(endpoint, { method, data })` dari `@/lib/api-client`. `fetchClient` sudah menangani baseURL `/api/app`, dan interceptor 401 → redirect `/login`.
2. **Hook** (`hooks/<domain>/`): bungkus service dengan React Query. Gunakan factory bersama di `hooks/create-crud-hooks.ts` (`createResourceKeys`, `createListHook`, mutation hooks) agar query key & invalidation konsisten — jangan bikin `useQuery` ad-hoc dengan key acak.
3. **Component**: konsumsi hook. Jangan taruh `axios`/`fetch` di dalam komponen.

- **Kontrak respons**: backend mengembalikan `ApiResponse<T>` (`{ data, meta }`, trait `ApiResponse` di BE). Konsumsi bentuk itu, jangan asumsikan model mentah.
- **Pencarian & list**: kirim `?search=`, `filter[...]`, `sort=`, `per_page` ke backend (Spatie Query Builder). **Pencarian & filter dilakukan di backend, BUKAN di sisi FE.** Default pagination backend 10/halaman — hormati & teruskan `per_page`.

## 3. Bahasa Visual (Konstitusi Desain — WAJIB)

Sebelum menulis/menyunting UI, baca `docs/design-rules.md`. Ringkasan aturan yang tidak boleh dilanggar:

- **Status apa pun → `StatusBadge` + registrasi di `lib/status.ts`.** Dilarang meracik pill `rounded-full bg-*-100` manual.
- **Warna semantik → token**: `success` / `warning` / `destructive` / `muted-foreground`. Dilarang `emerald/amber/red/green-*` baru untuk makna semantik. Satu aksen saja (`--primary`), tanpa gradient/glow dekoratif. Setiap `bg-white`/`bg-gray-*` wajib punya padanan `dark:` atau ganti token (`bg-background`/`bg-muted`).
- **Radius dua tier**: interaktif (button/input/badge/combobox) → `rounded-full`; permukaan (card/dialog/popover) → `rounded-4xl` (ikut primitive); tile/chip di dalam kartu → `rounded-xl`. Dilarang `rounded-md/lg/2xl/3xl/[arbitrary]` di view baru.
- **Ikon**: `lucide-react` saja, ukuran pakai `size-*` (bukan `h-* w-*`).
- **Empty state** → `EmptyState`; **loading** → `PageSkeleton`/`Skeleton` (halaman) atau `Loader2` (dalam tombol). Dilarang `animate-spin` di div/border manual.
- **Copy UI**: toast `"Berhasil <aksi>"` / `"Gagal <aksi>"`; `—` hanya untuk placeholder nilai kosong di cell tabel.

Jangan meracik warna/shape/glass sendiri. Detail lengkap + pengecualian ada di `docs/design-rules.md`.

## 4. Komponen Shared (jangan bikin ad-hoc)

- **Tabel** → bangun dari primitive `@ui/table` atau `@ui/data-table` (@tanstack/react-table), **bukan** `<table>` mentah.
- **Judul halaman** → `PageTitle`, jangan bikin `h1` sendiri. Aksi form (Simpan/Batal) → letakkan di kartu `FormFooter`, **bukan** di header `PageTitle`.
- **Scan gudang** (picking/packing/putaway) → komponen bersama `ScanAutoflowBar` (scan + combobox manual + auto-advance). Jangan bikin input scan ad-hoc.
- **Field pelaku** (`*_by` / `assigned_to`) → `UserSelect` (search API + role + "Saya sendiri"), bukan input teks bebas.
- **Field telepon/fax** → `PhoneInput` + `lib/phone.ts` (standar E.164, country codes dari `lib/country-codes.json`).

## 5. Form & Interaksi

- **Halaman untuk form data-heavy**, dialog hanya untuk konfirmasi ringan. Jangan taruh form kompleks di dialog.
- **Edit** memakai modal dialog, **bukan** inline editing.
- **Validasi form** pakai Zod (`schemas/`) + react-hook-form; jangan validasi manual tersebar.
- **Pencarian di picker/list** memanggil API backend (`?search=`), **bukan** filter sisi-FE.

## 6. Gaya & Batasan

- **Jangan mengubah kode mobile** — hanya FE (dan koordinasi BE) kecuali diminta eksplisit.
- Ikuti pola yang sudah ada di sekitar file yang disunting (naming, idiom, kepadatan komentar) sebelum memperkenalkan pola baru. Proyek punya script `strip-comments` — tulis kode yang jelas tanpa mengandalkan komentar.
- Lint dengan `eslint` (script `lint`). Utamakan Server Component; batasi `"use client"` seperlunya.
