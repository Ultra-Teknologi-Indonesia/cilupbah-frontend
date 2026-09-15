# Session Handoff — Manajemen Gudang (Lokasi)

> Untuk melanjutkan di sesi baru. Tanggal: 2026-06-17.
> Plan detail: `cilupbah-fe/docs/PLAN-pengaturan-lokasi.md`.

## Repo

Monorepo `cilupbah-superapp/`: **`cilupbah-be`** (Laravel modular, `Modules/*`), **`cilupbah-fe`** (Next.js 16 App Router, React 19, react-hook-form + zod, @tanstack/react-query, axios `fetchClient`, zustand, shadcn-style UI, maplibre-gl). Ada knowledge graph graphify di tiap repo (`graphify-out/`); aturan: `graphify query` dulu sebelum grep/baca, dan `graphify update .` setelah ubah kode.

- ⚠️ FE: Next.js 16 ada breaking changes — baca `node_modules/next/dist/docs/` sebelum nulis kode (lihat `cilupbah-fe/AGENTS.md`).
- ⚠️ BE: test pakai `php artisan test`. JANGAN `migrate:fresh --env=testing` (menghapus DB dev `cilupbah`).
- Proxy FE: `fetchClient` baseURL `/api/app` → `src/app/api/app/[...path]/route.ts` rewrite `/api/app/*` → `/api/v1/*`. Jadi URL service TANPA `/v1` (mis. `/locations`).

## Yang sudah selesai

### A. BE — Transit & transfer (sesi sebelumnya, sudah merged ke working tree)

- "Transit" = **lokasi sistem nyata** (ala sistem lama), bukan sekadar status. `locations.is_system` (tak bisa hapus, selalu aktif) & `is_locked` (tak bisa edit). Seeder buat **Gudang Pusat** (`is_system`) & **Transit** (`is_system`+`is_locked`). Guard di `LocationService::delete/update`.
- Transfer stok lewat lokasi Transit: `transferOut` source→Transit, `transferIn` Transit→tujuan. Penomoran `TRFO-`/`TRFI-` (+kolom `inventory_transfers.receive_number`). Double-count diperbaiki: inbound `TRANSIT_IN` dibuat langsung `RECEIVED` (non-receivable). `transfer()` lama (dead code) dihapus.

### B. BE — Lokasi (Milestone 1) ✅

- Migration `locations`: `+phone, +email, +coordinate`; `location_type` → nullable.
- `LocationResource` expose `is_system, is_locked, phone, email, coordinate, default_warehouse_user`.
- `StoreLocationRequest`: `phone` required, `email` required|email, `coordinate` nullable, `location_type` tak lagi required. `UpdateLocationRequest`: +ketiga field nullable.
- Setting global **`use_warehouse_layout`** (mirror `SalesReturnSetting`): model `WarehouseSetting`, migration `warehouse_settings`, repo/service/request/resource/controller, route `GET/POST /api/v1/systemsetting/warehouse-layout`.
- Reuse tanpa kerja baru: search list by nama (`allowedSearch`), `GET /api/v1/users` (Auth) untuk Default Staff.
- Test: full suite **841 passed, 11 failed**; ke-11 pre-existing & TIDAK terkait (FCM/Horizon queue config + mismatch validasi `ids`/variant). 0 regresi.

### C. FE — Lokasi (Milestone 2–5) ✅ (typecheck 0, eslint clean; BELUM diverifikasi runtime)

- **Plumbing** (`src/types/pengaturan/location.ts`, `src/lib/pengaturan/{location-schema,bin-preview}.ts`, `src/services/pengaturan/*.service.ts`, `src/hooks/pengaturan/use-*.ts`): CRUD lokasi, region cascade, users, setting layout, generate bins.
- **List page** + komponen di `src/components/dashboard/pengaturan/lokasi/`: `location-list-view`, `location-table` (state gembok system/locked, hapus disembunyikan utk system, switch aktif disabled), `delete-location-dialog`.
- **Tambah/Edit**: `location-form-page` (sub-nav Informasi/Layout, RHF+zod, submit create→generate bins), `informasi-tab` (cascade wilayah + map + default staff), `layout-gudang-tab` (builder Lantai/Baris/Kolom/Rak, cap 2000), `location-map-picker` (`@/components/ui/map.tsx`, MapLibre, koordinat `"(lat,lng)"`).
- **IA berubah (oleh user)**: Lokasi pindah dari "Pengaturan" ke **Gudang › Manajemen Rak & Lokasi › Lokasi Gudang**.
  - Routes: `src/app/dashboard/manajemen-rak/lokasi/{page,buat,[id]/edit}/page.tsx` + index redirect `src/app/dashboard/manajemen-rak/page.tsx` → `/lokasi`.
  - nav-data.ts sudah punya grup "gudang" → "manajemen-rak" → children "Lokasi Gudang" (`/dashboard/manajemen-rak/lokasi`) & "Denah Rak" (`/dashboard/manajemen-rak/denah`).

## Catatan penting / follow-up untuk sesi baru

1. **Nama folder internal masih `pengaturan`** (`components|hooks|services|types|lib/pengaturan/...`) walau URL sudah `manajemen-rak`. URL tidak terpengaruh, tapi kalau mau rapi → rename folder + update import (churn besar; opsional).
2. **Belum diverifikasi runtime** — belum `next build` / jalankan app. MapLibre client-only (mestinya SSR-safe). Saran: build + login + cek List/Tambah/Edit/Map.
3. **Denah Rak**: item nav sudah **dihapus** (di luar scope; rak dikelola via tab Layout Gudang). Bangun hanya jika butuh denah visual gudang (milestone tersendiri).
4. **Ditunda**: filter "Pilih tipe" & Import di list; tab Transfer Otomatis & Mapping Multi Warehouse; Grup Lokasi.
5. **Map picker** belum diuji interaktif (klik/drag → coordinate). Format koordinat `"(lat,lng)"`.
6. Layout create flow = **simpan lokasi → generate bins** (2 langkah); preview rak dihitung lokal (`bin-preview.ts`).

## Cara lanjut

- Build: `cd cilupbah-fe && npm run build` (atau jalankan app utk verifikasi visual).
- BE jalan (`php artisan serve`) + login agar proxy `/api/app` dapat token; seeder `WarehouseDatabaseSeeder` utk Pusat/Transit.
- Setelah ubah kode: `graphify update .` di repo terkait.

## Update 2026-06-17 (lanjutan) — hardening

- **Folder internal di-rename** `*/pengaturan` → `*/manajemen-rak` (components/hooks/services/types/lib). Import sudah disesuaikan. Route stub `app/dashboard/pengaturan/page.tsx` **tetap** (masih dipakai menu Pengaturan top-level).
- **Default Staff**: BE endpoint bergaya sistem lama `GET /api/v1/systemsetting/users?pageSize=&page=&q=` (auth saja, tanpa permission `view-user`) → response `{ data: [{user_id, email, last_login, is_owner}], totalCount }` (`UserService::getUserLookup`, `UserController::lookup`). FE `warehouse-user.service` map ke `WarehouseUser{id,email,isOwner,lastLogin}`; combobox label = email. Test: `systemsetting users lookup ...` ✅ (auth tanpa view-user 200; filter `q`).
- **Region prefill (edit)**: `LocationResource.village` kini dibentuk eksplisit nested (`village→district→city→province`, hanya id+nama). Lebih robust untuk cascade saat edit.
- **Pagination list**: `per_page=10` + pager Prev/Next ("Halaman X dari Y"), reset ke 1 saat search berubah.
- **Map picker**: diverifikasi sesuai mapcn docs (`Map center/zoom`, `MapMarker draggable`+`onDragEnd`, `MarkerContent`). OK.
- **Feedback validasi**: submit invalid → auto pindah ke tab Informasi + toast.
- **Grup Lokasi**: dipastikan tidak ada di form (dibuang).
- **Denah Rak**: item nav dihapus.
- Status cek: FE typecheck 0 / eslint clean; BE Warehouse+Auth tests **117 passed**.
- **Masih belum**: `next build` & verifikasi visual runtime (List/Tambah/Edit/Map). Itu langkah berikutnya untuk 100%.
