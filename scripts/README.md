# scripts/

Utilitas pengembangan yang berjalan sekali-sekali, di luar Next.js runtime.

## bantuan-screenshot.mjs

Auto-screenshot halaman untuk panduan Bantuan. Gambar tersimpan di
`public/bantuan/media/<slug>/*.png`, siap direfer dari markdown panduan:

```md
![Daftar penerimaan menunggu putaway](/bantuan/media/barang-masuk/penerimaan/01-daftar-inbound.png)
```

### Sekali setup

```bash
pnpm add -D puppeteer
```

### Jalankan

```bash
BASE_URL=http://localhost:3000 \
LOGIN_EMAIL=your@email LOGIN_PASSWORD=secret \
node scripts/bantuan-screenshot.mjs
```

- Untuk staging: `BASE_URL=https://staging.ultra-fit.id`
- Untuk lihat browser jalan: tambah `HEADFUL=1`
- Viewport custom: `VIEWPORT_W=1600 VIEWPORT_H=1000`

### Tambah shot baru

Edit `scripts/bantuan-targets.json`. Setiap target = 1 slug panduan, tiap
target berisi array `shots`:

```json
{
  "slug": "proses-pesanan/picking",
  "shots": [
    {
      "name": "05-scan-input-aktif",
      "url": "/dashboard/proses-pesanan/picking/PICK-123",
      "waitFor": "input[data-slot='scan-input']",
      "steps": [
        { "type": "click", "selector": "button[aria-label='Mulai']" },
        { "type": "waitFor", "selector": "input:focus" }
      ],
      "clipSelector": "[data-slot='scan-autoflow']",
      "caption": "Input scan otomatis fokus saat sesi picking dibuka"
    }
  ]
}
```

**Field yang tersedia per shot:**

| Field          | Wajib | Deskripsi                                                  |
| -------------- | ----- | ---------------------------------------------------------- |
| `name`         | ✓     | Nama file (tanpa ekstensi). Awali dengan angka urut.       |
| `url`          | ✓     | Relatif ke `BASE_URL`.                                     |
| `waitFor`      |       | CSS selector yang harus muncul sebelum shot diambil.       |
| `steps`        |       | Array interaksi: `click`, `type`, `waitFor`, `waitTime`.   |
| `settleMs`     |       | Delay ms sebelum shot (default 400).                       |
| `clipSelector` |       | Crop shot ke elemen ini (bukan full-page).                 |
| `fullPage`     |       | `true` untuk shot seluruh halaman scroll.                  |
| `caption`      |       | Muncul di manifest.json + jadi caption default di panduan. |

Setelah shots ter-generate, referensi di panduan lewat `content/manual/*.ts`
(atau di mana pun MANUAL_ENTRIES dirakit).
