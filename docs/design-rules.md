# Aturan Bahasa Visual — cilupbah-fe (anti AI-slop)

> Konstitusi desain. Berlaku untuk SEMUA kode UI baru & sapuan konsistensi.
> Wajib dibaca sebelum menulis UI. Standar koding FE lengkap ada di `../AGENTS.md`.

Prinsip: ini **product UI ERP gudang padat data**, bukan landing page. Slop = keputusan visual acak per-file. Selalu pakai token/komponen shared, jangan meracik sendiri.

## Warna

- **Status apa pun → `StatusBadge` + registrasi di `lib/status.ts`.** Dilarang bikin pill `rounded-full bg-*-100` manual untuk status. (Pengecualian: `channel-badge`, `sub-status-pills`, `pill-tabs`.)
- Makna semantik → token: sukses `text-success`/`bg-success`, peringatan `warning`, bahaya `destructive`, netral `muted-foreground`. Dilarang `emerald/amber/red/green-*` baru untuk makna semantik.
- Palette mentah hanya sah untuk: brand color channel (`channel-logo.tsx`) dan chart via `--chart-*`.
- Semua `bg-white`/`bg-gray-*`/`bg-*-50/100` wajib punya padanan `dark:` atau ganti token (`bg-background`, `bg-muted`).
- Satu aksen (`--primary`). Tanpa aksen kedua, tanpa gradient dekoratif, tanpa glow.

## Shape (radius) — dua tier + satu pengecualian

- Interaktif (button/input/badge/pill/combobox) → `rounded-full`.
- Permukaan (card/dialog/popover/glass) → `rounded-4xl` (ikut primitive, jangan set manual).
- Tile/thumbnail/chip di dalam kartu → `rounded-xl` (satu-satunya nilai tier-tengah).
- Dilarang di view baru: `rounded-md`, `rounded-lg`, `rounded-2xl`, `rounded-3xl`, `rounded-[arbitrary]`.

## Tipografi

- Page title: `text-2xl font-bold tracking-tight` — hanya via `PageTitle`, jangan bikin h1 sendiri.
- Section/Card title: `text-base font-semibold` (`CardTitle` sudah semibold).
- Sub-section: `text-sm font-semibold`. Body: `text-sm`. Metadata: `text-xs text-muted-foreground`.
- Micro (badge count / label mono): `text-2xs` (token 11px). Ganti `text-[10px]`/`text-[11px]`.
- `font-medium` = emphasis inline (nilai penting), bukan judul.

## Spacing

- Kartu standar `p-4`, konten dalam kartu `gap-4`/`space-y-4`.
- Baris/cell/chip compact (dalam tabel rapat) → `p-3`.
- Dialog & wrapper besar → `p-6 gap-6`.
- Antar section halaman → `space-y-6`.

## Ikon

- `lucide-react` saja. Tanpa SVG ikon hand-rolled baru.
- Ukuran: selalu `size-*` (bukan `h-* w-*`). `size-3.5` inline, `size-4` default, `size-5` emphasis, `size-6+` empty-state/ilustrasi.
- `strokeWidth` default (2); empty-state besar boleh `1.5`.

## State

- Data kosong → `EmptyState` ("Belum ada …"). Hasil search kosong → "Tidak ditemukan …". Dilarang `<p>Belum ada…</p>` telanjang.
- Initial load halaman/tabel → `PageSkeleton`/`Skeleton`. Aksi tombol → `Loader2` di dalam button. Dilarang `animate-spin` di div/border manual.

## Motion & glass

- Motion fungsional saja (sidebar, dialog/sheet enter, feedback tombol). Semua lewat `useReducedMotion`. Tanpa animasi infinite dekoratif.
- Glass hanya lewat `LiquidGlass`/`liquid-glass-subtle`/`.bg-card`. Jangan racik `backdrop-blur` ad-hoc.

## Copy UI

- `—` hanya sah sebagai placeholder nilai kosong di cell tabel. Dilarang di kalimat/judul/label/toast (pakai koma/titik).
- Separator `·` maksimal 1 per baris. Tanpa emoji.
- Toast: "Berhasil <aksi>" / "Gagal <aksi>".
