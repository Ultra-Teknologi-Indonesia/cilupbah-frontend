import {
  Home,
  Package2,
  Tag,
  FolderTree,
  BarChart2,
  RefreshCw,
  Eye,
  PackageCheck,
  ShoppingBag,
  Store,
  Users,
  LinkIcon,
  ClipboardList,
  Truck,
  Inbox,
  Send,
  Archive,
  HandCoins,
  TrendingUp,
  PackageOpen,
  Factory,
  Settings,
  Layers,
  Warehouse,
  BarChart3,
  AlertTriangle,
  HelpCircle,
  FileSearch,
} from "lucide-react";
import type React from "react";
import type { Route } from "./nav-main";
import type { PermissionRequirement } from "@/lib/auth/permissions";

export type NavZone = "top" | "ops" | "fin";

export type NavGroup = {
  id: string;
  title: string;
  icon: React.ElementType;
  zone: NavZone;
  items: Route[];
};

export const dashboardGroups: NavGroup[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: Home,
    zone: "top",
    items: [
      { id: "dashboard", title: "Dashboard", icon: Home, link: "/dashboard" },
    ],
  },
  {
    id: "katalog",
    title: "Katalog",
    icon: Tag,
    zone: "ops",
    items: [
      {
        id: "produk",
        title: "Produk",
        icon: Package2,
        link: "/dashboard/produk",
      },

      {
        id: "kategori-merek",
        title: "Kategori",
        icon: FolderTree,
        link: "/dashboard/kategori-merek/kategori",
      },
    ],
  },
  {
    id: "persediaan",
    title: "Persediaan",
    icon: Layers,
    zone: "ops",
    items: [
      {
        id: "posisi-stok",
        title: "Posisi Stok",
        icon: BarChart2,
        link: "/dashboard/posisi-stok",
      },
      {
        id: "transaksi-stok",
        title: "Transaksi Stok",
        icon: RefreshCw,
        link: "/dashboard/transaksi-stok",
      },
      {
        id: "monitor-stok",
        title: "Monitor Stok",
        icon: Eye,
        link: "/dashboard/monitor-stok",
      },
    ],
  },
  {
    id: "penjualan",
    title: "Penjualan",
    icon: ShoppingBag,
    zone: "ops",
    items: [
      {
        id: "pesanan",
        title: "Pesanan",
        icon: ShoppingBag,
        link: "/dashboard/pesanan",
      },
      {
        id: "toko-internal",
        title: "Toko Internal",
        icon: Store,
        link: "/dashboard/toko-internal",
      },
      {
        id: "kontak-pelanggan",
        title: "Kontak Pelanggan",
        icon: Users,
        link: "/dashboard/kontak-pelanggan",
      },

      {
        id: "integrasi-channel",
        title: "Integrasi Channel",
        icon: LinkIcon,
        link: "/dashboard/integrasi-channel",
      },
    ],
  },
  {
    id: "pembelian",
    title: "Pembelian",
    icon: ClipboardList,
    zone: "ops",
    items: [
      {
        id: "transaksi-pembelian",
        title: "Transaksi Pembelian",
        icon: ClipboardList,
        link: "/dashboard/transaksi-pembelian",
        match: ["/dashboard/transaksi-pembelian"],
      },
      {
        id: "kontak-pemasok",
        title: "Kontak Pemasok",
        icon: Truck,
        link: "/dashboard/kontak-pemasok",
      },
    ],
  },
  {
    id: "gudang",
    title: "Gudang",
    icon: Warehouse,
    zone: "ops",
    items: [
      {
        id: "barang-masuk",
        title: "Barang Masuk (Inbound)",
        icon: Inbox,
        link: "/dashboard/barang-masuk",
      },
      {
        id: "barang-keluar",
        title: "Barang Keluar (Outbound)",
        icon: Send,
        link: "/dashboard/barang-keluar",
      },
      {
        id: "proses-pesanan",
        title: "Proses Pesanan",
        icon: PackageCheck,
        link: "/dashboard/proses-pesanan",
      },
      {
        id: "audit-pesanan",
        title: "Audit Pesanan",
        icon: FileSearch,
        link: "/dashboard/proses-pesanan/audit",
      },
      {
        id: "manajemen-rak",
        title: "Manajemen Rak & Lokasi",
        icon: Archive,
        link: "/dashboard/lokasi",
      },
      {
        id: "permintaan-restock",
        title: "Permintaan Pengisian Stok",
        icon: HandCoins,
        link: "/dashboard/permintaan-restock",
      },
    ],
  },

  {
    id: "laporan",
    title: "Laporan",
    icon: BarChart3,
    zone: "fin",
    items: [
      {
        id: "laporan-penjualan",
        title: "Laporan Penjualan",
        icon: TrendingUp,
        link: "/dashboard/laporan/penjualan",
      },
      {
        id: "laporan-persediaan",
        title: "Laporan Persediaan",
        icon: PackageOpen,
        link: "/dashboard/laporan/persediaan",
      },
      {
        id: "laporan-gudang",
        title: "Laporan Gudang",
        icon: Factory,
        link: "/dashboard/laporan/gudang",
      },
      {
        id: "laporan-settlement",
        title: "Laporan Settlement",
        icon: HandCoins,
        link: "/dashboard/laporan/settlement",
      },
      {
        id: "laporan-stok-minus",
        title: "Riwayat Stok Minus",
        icon: AlertTriangle,
        link: "/dashboard/laporan/stok-minus",
      },
    ],
  },
];

export const settingsRoutes: Route[] = [
  {
    id: "pengaturan",
    title: "Pengaturan",
    icon: Settings,
    link: "/dashboard/pengaturan",
    subs: [
      { title: "Daftar Pengguna", link: "/dashboard/pengaturan/pengguna" },
      { title: "Peran & Hak Akses", link: "/dashboard/pengaturan/peran" },
      {
        title: "Sinkronisasi Stok & Harga",
        link: "/dashboard/pengaturan/persediaan",
      },
      {
        title: "Aktivitas Import dan Export",
        link: "/dashboard/aktivitas-impex",
      },
    ],
  },
  {
    id: "bantuan",
    title: "Bantuan",
    icon: HelpCircle,
    link: "/dashboard/bantuan",
  },
];

export const NAV_PERMISSION: Record<string, string | string[]> = {
  dashboard: "view-dashboard",
  produk: "view-produk",
  "kategori-merek": "view-kategori",
  "posisi-stok": "view-posisi-stok",
  "transaksi-stok": [
    "view-penyesuaian-stok",
    "view-pindah-bin",
    "view-stok-opname",
  ],
  "monitor-stok": "view-monitor-stok",
  pesanan: "view-pesanan",
  "toko-internal": "view-toko-internal",
  "kontak-pelanggan": "view-kontak-pelanggan",
  "integrasi-channel": "view-integrasi-channel",
  "transaksi-pembelian": "view-transaksi-pembelian",
  "kontak-pemasok": "view-kontak-pemasok",
  "barang-masuk": ["view-barang-masuk", "view-penempatan"],
  "barang-keluar": "view-barang-keluar",
  "proses-pesanan": ["view-picking", "view-packing", "view-pengiriman"],
  "audit-pesanan": "view-pesanan",
  "manajemen-rak": "view-manajemen-rak",
  "permintaan-restock": "view-permintaan-restock",
  "laporan-penjualan": "view-laporan-penjualan",
  "laporan-persediaan": "view-laporan-persediaan",
  "laporan-gudang": "view-laporan-gudang",
  "laporan-settlement": "view-pembayaran-penjualan",
  "laporan-stok-minus": "view-laporan-stok-minus",
};

const SETTINGS_SUB_PERMISSION: Record<string, string | string[]> = {
  "/dashboard/pengaturan/pengguna": "view-user",
  "/dashboard/pengaturan/peran": ["view-role", "view-permission"],
  "/dashboard/pengaturan/alokasi-stok": "view-posisi-stok",
  "/dashboard/pengaturan/persediaan": "view-pengaturan-persediaan",
  "/dashboard/aktivitas-impex": "view-impex",
};

const ROUTE_PERMISSION_RULES: Array<{
  link: string;
  permission: PermissionRequirement;
}> = [
  { link: "/dashboard/laporan/hpp", permission: "view-laporan-hpp" },
  { link: "/dashboard/laporan/retur", permission: "view-laporan-retur" },
  {
    link: "/dashboard/laporan/penjualan",
    permission: "view-laporan-penjualan",
  },
  {
    link: "/dashboard/laporan/persediaan",
    permission: "view-laporan-persediaan",
  },
  { link: "/dashboard/laporan/gudang", permission: "view-laporan-gudang" },
  {
    link: "/dashboard/laporan/settlement",
    permission: "view-pembayaran-penjualan",
  },
  {
    link: "/dashboard/laporan/stok-minus",
    permission: "view-laporan-stok-minus",
  },
  {
    link: "/dashboard/pengaturan",
    permission: [
      "view-pengaturan-sistem",
      "view-user",
      "view-role",
      "view-permission",
      "view-posisi-stok",
      "view-pengaturan-persediaan",
      "view-impex",
    ],
  },
  {
    link: "/dashboard/pengaturan/alokasi-stok",
    permission: "view-posisi-stok",
  },
  { link: "/dashboard/pengaturan/pengguna", permission: "view-user" },
  { link: "/dashboard/pengaturan/pengguna/buat", permission: "create-user" },
  { link: "/dashboard/pengaturan/pengguna/[id]/edit", permission: "edit-user" },
  {
    link: "/dashboard/pengaturan/peran",
    permission: ["view-role", "view-permission"],
  },
  {
    link: "/dashboard/pengaturan/persediaan",
    permission: "view-pengaturan-persediaan",
  },
  { link: "/dashboard/aktivitas-impex", permission: "view-impex" },
  { link: "/dashboard/produk/buat-bundle", permission: "create-bundle" },
  { link: "/dashboard/produk/buat", permission: "create-produk" },
  { link: "/dashboard/produk/import", permission: "import-produk" },
  { link: "/dashboard/produk/upload", permission: "create-produk-naik" },
  { link: "/dashboard/produk/naikkan", permission: "view-produk-naik" },
  { link: "/dashboard/produk/arsip", permission: "view-produk" },
  { link: "/dashboard/produk/download", permission: "view-produk" },
  {
    link: "/dashboard/produk/[id]/upload-to-channel",
    permission: "create-produk-naik",
  },
  { link: "/dashboard/produk/[id]/edit", permission: "edit-produk" },
  { link: "/dashboard/produk/[id]", permission: "view-produk" },
  {
    link: "/dashboard/kontak-pelanggan/tambah",
    permission: "create-kontak-pelanggan",
  },
  {
    link: "/dashboard/kontak-pelanggan/[id]/edit",
    permission: "edit-kontak-pelanggan",
  },
  { link: "/dashboard/kontak-pelanggan", permission: "view-kontak-pelanggan" },
  {
    link: "/dashboard/kontak-pemasok/tambah",
    permission: "create-kontak-pemasok",
  },
  {
    link: "/dashboard/kontak-pemasok/[id]/edit",
    permission: "edit-kontak-pemasok",
  },
  { link: "/dashboard/kontak-pemasok", permission: "view-kontak-pemasok" },
  { link: "/dashboard/lokasi/buat", permission: "create-manajemen-rak" },
  { link: "/dashboard/lokasi/[id]", permission: "view-manajemen-rak" },
  { link: "/dashboard/lokasi/[id]/edit", permission: "edit-manajemen-rak" },
  { link: "/dashboard/lokasi", permission: "view-manajemen-rak" },
  {
    link: "/dashboard/barang-masuk/retur/buat",
    permission: "create-retur-penjualan",
  },
  { link: "/dashboard/barang-masuk/retur", permission: "view-retur-penjualan" },
  { link: "/dashboard/barang-masuk/penempatan", permission: "view-penempatan" },
  { link: "/dashboard/barang-masuk/putaway", permission: "view-penempatan" },
  {
    link: "/dashboard/barang-masuk/penerimaan",
    permission: "view-barang-masuk",
  },
  {
    link: "/dashboard/barang-keluar/transfer/tambah",
    permission: "create-barang-keluar",
  },
  {
    link: "/dashboard/barang-keluar/transfer/[id]/edit",
    permission: "edit-barang-keluar",
  },
  { link: "/dashboard/barang-keluar", permission: "view-barang-keluar" },
  {
    link: "/dashboard/proses-pesanan/picking",
    permission: { all: ["view-pesanan", "view-picking"] },
  },
  {
    link: "/dashboard/proses-pesanan/packing",
    permission: { all: ["view-pesanan", "view-packing"] },
  },
  {
    link: "/dashboard/proses-pesanan/shipping",
    permission: { all: ["view-pesanan", "view-pengiriman"] },
  },
  { link: "/dashboard/proses-pesanan/pantauan", permission: "view-pesanan" },
  { link: "/dashboard/proses-pesanan/audit", permission: "view-pesanan" },
  {
    link: "/dashboard/proses-pesanan/delivered",
    permission: "view-pengiriman",
  },
  {
    link: "/dashboard/proses-pesanan/done",
    permission: { all: ["view-pesanan", "view-pengiriman"] },
  },
  {
    link: "/dashboard/proses-pesanan",
    permission: ["view-picking", "view-packing", "view-pengiriman"],
  },
  {
    link: "/dashboard/transaksi-stok/penyesuaian",
    permission: "view-penyesuaian-stok",
  },
  {
    link: "/dashboard/transaksi-stok/pindah-bin",
    permission: "view-pindah-bin",
  },
  { link: "/dashboard/transaksi-stok/opname", permission: "view-stok-opname" },
  {
    link: "/dashboard/transaksi-stok/revaluasi",
    permission: "view-revaluasi-stok",
  },
  {
    link: "/dashboard/transaksi-stok/penerimaan-transfer",
    permission: "view-pindah-bin",
  },
  { link: "/dashboard/transaksi-stok/cadang", permission: "view-posisi-stok" },
  {
    link: "/dashboard/transaksi-stok",
    permission: [
      "view-penyesuaian-stok",
      "view-pindah-bin",
      "view-stok-opname",
    ],
  },
  {
    link: "/dashboard/transaksi-pembelian/pesanan/tambah",
    permission: "create-transaksi-pembelian",
  },
  {
    link: "/dashboard/transaksi-pembelian/pesanan/[id]/edit",
    permission: "edit-transaksi-pembelian",
  },
  {
    link: "/dashboard/transaksi-pembelian",
    permission: "view-transaksi-pembelian",
  },
  {
    link: "/dashboard/toko-internal/tambah",
    permission: "create-toko-internal",
  },
  { link: "/dashboard/toko-internal", permission: "view-toko-internal" },
  {
    link: "/dashboard/permintaan-restock",
    permission: "view-permintaan-restock",
  },
  {
    link: "/dashboard/integrasi-channel",
    permission: "view-integrasi-channel",
  },
  { link: "/dashboard/pesanan/tambah", permission: "create-pesanan" },
  { link: "/dashboard/pesanan/import", permission: "import-pesanan" },
  { link: "/dashboard/pesanan/konfirmasi-pembeli", permission: "view-pesanan" },
  { link: "/dashboard/pesanan/[id]", permission: "view-pesanan" },
  { link: "/dashboard/pesanan", permission: "view-pesanan" },
  {
    link: "/dashboard/document-preview/picklist",
    permission: "export-picking",
  },
  {
    link: "/dashboard/document-preview/picklist-by-orders",
    permission: "view-picking",
  },
  {
    link: "/dashboard/document-preview/inbound-receipt",
    permission: "export-barang-masuk",
  },
  {
    link: "/dashboard/document-preview/shipping-label",
    permission: [
      "view-pengiriman",
      "view-pesanan",
      "view-packing",
      "view-picking",
    ],
  },
  {
    link: "/dashboard/document-preview/shipping-label-bulk-async",
    permission: [
      "view-pengiriman",
      "view-pesanan",
      "view-packing",
      "view-picking",
    ],
  },
  { link: "/dashboard/document-preview", permission: "view-pesanan" },
  { link: "/dashboard/profil-saya", permission: "view-akun" },
  { link: "/dashboard/notifikasi", permission: "view-dashboard" },
  { link: "/dashboard/bantuan", permission: "view-dashboard" },
];

const ROUTE_PERMISSION_MATCHERS = ROUTE_PERMISSION_RULES.map((rule) => ({
  ...rule,
  matcher: new RegExp(
    `^${rule.link
      .split(/(\[[^/]+\])/g)
      .map((part) =>
        /^\[[^/]+\]$/.test(part)
          ? "[^/]+"
          : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      )
      .join("")}(?:/|$)`,
  ),
}));

type PermCheck = (perm?: PermissionRequirement) => boolean;

export function filterNavGroups(
  groups: NavGroup[],
  has: PermCheck,
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => has(NAV_PERMISSION[item.id])),
    }))
    .filter((group) => group.items.length > 0);
}

export function filterSettingsRoutes(routes: Route[], has: PermCheck): Route[] {
  return routes
    .map((route) =>
      route.subs
        ? {
            ...route,
            subs: route.subs
              .filter((sub) => has(SETTINGS_SUB_PERMISSION[sub.link]))
              .map((sub) => ({
                ...sub,
                permission: SETTINGS_SUB_PERMISSION[sub.link],
              })),
          }
        : route,
    )
    .filter((route) => !route.subs || route.subs.length > 0);
}

export function permissionForPath(
  pathname: string,
): PermissionRequirement | undefined {
  let best: PermissionRequirement | undefined;
  let bestLen = -1;

  const consider = (link: string, perm: PermissionRequirement | undefined) => {
    const matches =
      link === "/dashboard"
        ? pathname === link
        : pathname === link || pathname.startsWith(link + "/");
    if (matches && link.length > bestLen) {
      bestLen = link.length;
      best = perm;
    }
  };

  for (const group of dashboardGroups) {
    for (const item of group.items) {
      const perm = NAV_PERMISSION[item.id];
      consider(item.link, perm);
      item.match?.forEach((m) => consider(m, perm));
      item.subs?.forEach((s) => {
        consider(s.link, perm);
        s.subs?.forEach((n) => consider(n.link, perm));
      });
    }
  }
  for (const route of settingsRoutes) {
    route.subs?.forEach((s) =>
      consider(s.link, SETTINGS_SUB_PERMISSION[s.link]),
    );
  }

  for (const rule of ROUTE_PERMISSION_MATCHERS) {
    if (rule.matcher.test(pathname) && rule.link.length > bestLen) {
      bestLen = rule.link.length;
      best = rule.permission;
    }
  }

  return best;
}

export const sampleNotifications = [
  {
    id: "1",
    avatar: "/avatars/01.png",
    fallback: "OM",
    text: "New order received.",
    time: "10m ago",
  },
];

function linkMatchLen(pathname: string, link: string): number {
  return pathname === link || pathname.startsWith(link + "/")
    ? link.length
    : -1;
}

function routeMatchLen(pathname: string, route: Route): number {
  let best = linkMatchLen(pathname, route.link);
  route.match?.forEach((m) => {
    best = Math.max(best, linkMatchLen(pathname, m));
  });
  route.subs?.forEach((s) => {
    best = Math.max(best, linkMatchLen(pathname, s.link));
    s.subs?.forEach((n) => {
      best = Math.max(best, linkMatchLen(pathname, n.link));
    });
  });
  return best;
}

export function findGroupIdForPath(
  pathname: string,
  groups: NavGroup[],
): string {
  let bestId = groups[0].id;
  let bestLen = -1;
  for (const group of groups) {
    for (const item of group.items) {
      const len = routeMatchLen(pathname, item);
      if (len > bestLen) {
        bestLen = len;
        bestId = group.id;
      }
    }
  }
  return bestId;
}

export function findActiveNavLink(pathname: string): string | null {
  let best: string | null = null;
  let bestLen = -1;

  const consider = (link: string) => {
    const len = linkMatchLen(pathname, link);
    if (len > bestLen) {
      bestLen = len;
      best = link;
    }
  };

  for (const group of dashboardGroups) {
    for (const item of group.items) {
      consider(item.link);
      item.match?.forEach(consider);
      item.subs?.forEach((s) => {
        consider(s.link);
        s.subs?.forEach((n) => consider(n.link));
      });
    }
  }
  for (const route of settingsRoutes) {
    consider(route.link);
    route.subs?.forEach((s) => consider(s.link));
  }

  return best;
}

export function isLeafGroup(group: NavGroup): boolean {
  return group.items.length === 1 && !group.items[0].subs?.length;
}
