"use client";

import { useState, useMemo, useCallback, Fragment } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  PackageIcon,
  MapPinIcon,
  BoxIcon,
  ExternalLinkIcon,
  ShoppingCartIcon,
  CalendarIcon,
} from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SimplePagination,
  TABLE_PAGE_SIZES,
} from "@/components/ui/simple-pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { PageTitle } from "@/components/dashboard/page-title";
import { FilterToolbar } from "@/components/dashboard/shared/filter-toolbar";
import {
  useStockItem,
  useStockMovements,
  useItemStock,
  useMovementFilters,
} from "@/hooks/persediaan/use-stock-position";
import { useOrders } from "@/hooks/pesanan/use-orders";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import { useUrlTab } from "@/hooks/use-url-tab";
import type {
  StockMovement,
  BinInventory,
  MovementView,
} from "@/types/persediaan/stock";
import { CHANNEL_MAP, STATUS_LABELS } from "@/types/pesanan/order";
import type { Order } from "@/types/pesanan/order";
import {
  formatCurrency,
  formatDateTimeWib,
  formatTime,
  formatDateTime,
} from "@/lib/format";

type MovementUrlKey =
  | "view"
  | "source"
  | "drill"
  | "direction"
  | "location_id"
  | "store_id"
  | "page"
  | "per_page";

const MOVEMENT_RESET_KEYS = [
  "source",
  "drill",
  "direction",
  "location_id",
  "store_id",
  "page",
] as const;

const MOVEMENT_VIEW_VALUES: readonly MovementView[] = [
  "all",
  "clean",
  "attention",
];

const DIRECTION_VALUES = ["in", "out"] as const;
type Direction = (typeof DIRECTION_VALUES)[number] | "";

const DRILL_VALUES = ["transit", "allocation", "order_active"] as const;
type Drill = (typeof DRILL_VALUES)[number] | "";

function parseMovementView(raw: string | null): MovementView {
  return raw && (MOVEMENT_VIEW_VALUES as readonly string[]).includes(raw)
    ? (raw as MovementView)
    : "all";
}

function parseDrill(raw: string | null): Drill {
  return raw && (DRILL_VALUES as readonly string[]).includes(raw)
    ? (raw as Drill)
    : "";
}

function parseDirection(raw: string | null): Direction {
  return raw && (DIRECTION_VALUES as readonly string[]).includes(raw)
    ? (raw as Direction)
    : "";
}

function parseIntParam(raw: string | null, fallback: number): number {
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const CATEGORY_COLOR: Record<string, string> = {
  TAGIHAN:
    "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20",
  PENYESUAIAN:
    "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20",
  RETUR_PEMBELIAN:
    "text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20",
  RETUR_PENJUALAN:
    "text-teal-600 bg-teal-50 border-teal-200 dark:text-teal-400 dark:bg-teal-500/10 dark:border-teal-500/20",
  FAKTUR:
    "text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-500/10 dark:border-orange-500/20",
  PESANAN:
    "text-sky-600 bg-sky-50 border-sky-200 dark:text-sky-400 dark:bg-sky-500/10 dark:border-sky-500/20",
  TRANSFER:
    "text-purple-600 bg-purple-50 border-purple-200 dark:text-purple-400 dark:bg-purple-500/10 dark:border-purple-500/20",
  PESANAN_BATAL:
    "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20",
  CADANGAN:
    "text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-500/10 dark:border-slate-500/20",
  // Legacy aliases
  PURCHASE:
    "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20",
  CONSIGNMENT:
    "text-lime-600 bg-lime-50 border-lime-200 dark:text-lime-400 dark:bg-lime-500/10 dark:border-lime-500/20",
  ADJUSTMENT:
    "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20",
  PICKING:
    "text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20",
  ALOKASI:
    "text-indigo-600 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-500/10 dark:border-indigo-500/20",
  INVOICE:
    "text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-500/10 dark:border-orange-500/20",
  REVALUATION:
    "text-violet-600 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-500/10 dark:border-violet-500/20",
};

const VIEW_TABS: {
  value: MovementView;
  label: string;
  description: string;
}[] = [
  {
    value: "all",
    label: "Semua",
    description:
      "Semua sumber, termasuk pesanan dan cadangan yang sedang aktif.",
  },
  {
    value: "clean",
    label: "Kronologi Bersih",
    description:
      "Menampilkan aktivitas fisik: penempatan, picking, retur, transfer, dan picking historis. Pesanan dan DEFAULT tidak ditampilkan.",
  },
  {
    value: "attention",
    label: "Perlu Perhatian",
    description:
      "Entri Faktur lama (pra-refactor) — indikasi stok nyangkut yang perlu ditelusuri. Wajar kosong untuk data baru.",
  },
];

const ALL_VALUE = "__all__";

function resolveTransactionHref(source: string, trxNo: string): string | null {
  const enc = encodeURIComponent(trxNo);
  switch (source) {
    case "PURCHASE":
    case "BILL":
    case "CONSIGNMENT":
      // namespace="penerimaan" → search key = penerimaan_search
      return `/dashboard/barang-masuk/penerimaan?penerimaan_search=${enc}`;
    case "ADJUSTMENT":
    case "STOCK_OPNAME":
      // namespace="adj" → search key = adj_search
      return `/dashboard/transaksi-stok/penyesuaian?adj_search=${enc}`;
    case "REVALUATION":
      // namespace="rev" → search key = rev_search
      return `/dashboard/transaksi-stok/revaluasi?rev_search=${enc}`;
    case "PURCHASE_RETURN":
      // tidak ada halaman retur-pembelian tersendiri, arahkan ke barang-keluar
      return `/dashboard/barang-keluar`;
    case "SALES_RETURN":
      // route yang benar: /dashboard/barang-masuk/retur
      return `/dashboard/barang-masuk/retur`;
    case "INVOICE":
    case "ORDER_SHIP":
    case "ORDER_PICK":
    case "ORDER_RESTORE":
    case "ORDER":
    case "ORDER_RESERVE":
    case "ORDER_RELEASE":
    case "ORDER_CANCELLED":
      // pesanan tidak pakai namespace → search key = search
      return `/dashboard/pesanan?search=${enc}`;
    case "TRANSFER_IN":
    case "TRANSIT_IN":
    case "TRANSIT_OUT":
    case "TRANSFER_REJECT_RETURN":
      // namespace="penerimaan", tab param = tab (no namespace prefix)
      return `/dashboard/barang-masuk/penerimaan?tab=transfer&penerimaan_search=${enc}`;
    case "TRANSFER_OUT":
    case "TRANSFER_REVERT":
      // route yang benar: /dashboard/barang-keluar, namespace="transfer_out"
      return `/dashboard/barang-keluar?transfer_out_search=${enc}`;
    case "BIN_TRANSFER_IN":
    case "BIN_TRANSFER_OUT":
    case "BIN_TRANSFER_REVERSAL":
    case "BIN_TRANSFER_REVERT_OUT":
      // route yang benar: /dashboard/transaksi-stok/pindah-bin, namespace="pbin_draft"
      return `/dashboard/transaksi-stok/pindah-bin?pbin_draft_search=${enc}`;
    case "PUTAWAY_IN":
    case "PUTAWAY_OUT":
    case "PUTAWAY_REVERSAL":
      return `/dashboard/barang-masuk/penempatan?search=${enc}`;
    default:
      return null;
  }
}

function resolveTransactionDisplay(m: StockMovement) {
  const isPick = m.source === "PICKING" || m.source === "PICKING_REVERSAL";

  if (isPick && m.order_no) {
    return {
      label: m.order_no,
      href: `/dashboard/pesanan?search=${encodeURIComponent(m.order_no)}`,
      hint: m.transaction_number,
      extraOrders: Math.max(0, (m.order_count ?? 1) - 1),
    };
  }

  return {
    label: m.transaction_number,
    href: resolveTransactionHref(m.source, m.transaction_number),
    hint: undefined,
    extraOrders: 0,
  };
}

function SourceBadge({
  category,
  label,
  isVariance,
}: {
  category: string;
  label: string;
  isVariance?: boolean;
}) {
  const color =
    CATEGORY_COLOR[category] ?? "text-muted-foreground bg-muted border-border";
  const title = isVariance
    ? "Faktur — kemungkinan stok nyangkut akibat kesalahan scan lokasi. Perlu ditelusuri."
    : undefined;
  return (
    <Badge
      variant="outline"
      className={cn("text-2xs font-medium", color)}
      title={title}
    >
      {label}
    </Badge>
  );
}

function QtyCell({
  qty,
  effect,
}: {
  qty: number;
  effect?: StockMovement["stock_effect"];
}) {
  const isPositive = qty > 0;
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span
        className={cn(
          "font-mono text-sm font-semibold tabular-nums",
          isPositive ? "text-success" : "text-destructive",
        )}
        aria-label={`Perubahan qty ${isPositive ? `plus ${qty}` : qty}`}
      >
        {isPositive ? `+${qty}` : qty}
      </span>
      {effect && (
        <span className="text-2xs font-medium text-muted-foreground">
          {effect.quantity_label}
        </span>
      )}
    </span>
  );
}

function MovementEffectNote({
  effect,
}: {
  effect: NonNullable<StockMovement["stock_effect"]>;
}) {
  return (
    <div
      className="max-w-[24rem] rounded-lg border border-primary/15 bg-primary/[0.04] px-2.5 py-2"
      title={effect.description}
    >
      <p className="font-medium leading-relaxed text-foreground">
        {effect.label}
      </p>
      <p className="mt-1 leading-relaxed text-muted-foreground">
        {effect.description}
      </p>
    </div>
  );
}

type WebhookNoteEntry = {
  channel: string;
  status: string;
  receivedAt: string;
};

function parseWebhookNote(note: string): WebhookNoteEntry[] {
  return note
    .split(/(?=Webhook channel=)/i)
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const channel = part.match(/Webhook channel=([^|]+)/i)?.[1]?.trim();
      const status = part.match(/\|\s*status=([^|]+)/i)?.[1]?.trim();
      const receivedAt = part
        .match(/\|\s*diterima=(.*?)(?=\s*\|\s*Webhook event_key=|$)/i)?.[1]
        ?.trim();

      if (!channel || !status || !receivedAt) return [];

      return [
        {
          channel: channel.toUpperCase(),
          status,
          receivedAt,
        },
      ];
    });
}

function formatChannelName(channel: string): string {
  return channel.charAt(0).toUpperCase() + channel.slice(1).toLowerCase();
}

function formatWebhookMessage(entry: WebhookNoteEntry): string {
  const normalized = entry.status.trim().toUpperCase();
  const channel = formatChannelName(entry.channel);

  const messages: Record<string, string> = {
    UNPAID: `Pesanan ${channel} belum dibayar.`,
    READY_TO_SHIP: `Pesanan ${channel} siap dikirim.`,
    PROCESSED: `Pesanan ${channel} sudah diproses.`,
    LOGISTICS_NOT_START: `Pengiriman pesanan ${channel} belum dimulai.`,
    LOGISTICS_READY: `Pengiriman pesanan ${channel} sudah siap.`,
    LOGISTICS_REQUEST_CREATED: `Permintaan pengiriman ${channel} berhasil dibuat.`,
  };

  if (normalized === "-") return `Status pesanan ${channel} diperbarui.`;
  if (messages[normalized]) return messages[normalized];

  const readableStatus = normalized
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .join(" ");

  return `Status pesanan ${channel} berubah menjadi ${readableStatus}.`;
}

function formatWebhookReceivedAt(value: string): string {
  const match = value.match(
    /^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})(?::\d{2})?\s*(\w+)?$/,
  );
  if (!match) return value;

  const [, day, month, year, hour, minute, timezone] = match;
  const monthLabel = [
    "jan",
    "feb",
    "mar",
    "apr",
    "mei",
    "jun",
    "jul",
    "agu",
    "sep",
    "okt",
    "nov",
    "des",
  ][Number(month) - 1];

  if (!monthLabel) return value;
  return `${day} ${monthLabel} ${year}, ${hour}.${minute}${timezone ? ` ${timezone}` : ""}`;
}

function MovementNote({ note }: { note: string }) {
  const [expanded, setExpanded] = useState(false);
  const webhookEntries = useMemo(() => parseWebhookNote(note), [note]);

  if (webhookEntries.length === 0) {
    const canExpand = note.length > 180;
    return (
      <div className="max-w-[24rem]">
        <p
          className={cn(
            "whitespace-pre-wrap break-words leading-relaxed",
            canExpand && !expanded && "line-clamp-3",
          )}
        >
          {note}
        </p>
        {canExpand && (
          <button
            type="button"
            className="mt-1 font-medium text-primary hover:underline"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Tampilkan ringkas" : "Lihat selengkapnya"}
          </button>
        )}
      </div>
    );
  }

  const latestEntry = webhookEntries.at(-1)!;

  return (
    <div className="max-w-[24rem] rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2">
      <p className="font-medium leading-relaxed text-foreground">
        {formatWebhookMessage(latestEntry)}
      </p>
      <p className="mt-1 leading-relaxed text-muted-foreground">
        Diperbarui {formatWebhookReceivedAt(latestEntry.receivedAt)}.
      </p>
    </div>
  );
}

function StockSummaryCards({
  onHand,
  actual,
  pickedNotPacked,
  onOrder,
  transit,
  available,
  avgCost,
}: {
  onHand: number;
  actual: number;
  pickedNotPacked: number;
  onOrder: number;
  transit: number;
  available: number;
  avgCost: number;
}) {
  const cards = [
    { label: "On Hand", value: onHand, color: "" },
    { label: "Stok Aktual", value: actual, color: "" },
    {
      label: "Di Meja Packing",
      value: pickedNotPacked,
      color: pickedNotPacked > 0 ? "text-warning" : "text-muted-foreground",
    },
    { label: "On Order", value: onOrder, color: "" },
    {
      label: "Transit",
      value: transit,
      color:
        transit > 0
          ? "text-blue-600 dark:text-blue-400"
          : "text-muted-foreground",
    },
    {
      label: "Available",
      value: available,
      color: available < 0 ? "text-destructive" : "text-success",
    },
    {
      label: "Harga Pokok",
      value: formatCurrency(avgCost),
      color: "text-muted-foreground",
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {cards.map((c) => (
        <LiquidGlass
          key={c.label}
          radius={14}
          intensity="subtle"
          className="bg-white/30 px-4 py-3 dark:bg-white/[0.04]"
        >
          <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
          <p className={cn("mt-1 text-xl font-bold tabular-nums", c.color)}>
            {c.isText ? c.value : c.value}
          </p>
        </LiquidGlass>
      ))}
    </div>
  );
}

type MovementDayGroup = {
  key: string;
  label: string;
  items: StockMovement[];
  netQty: number;
};

function groupMovementsByDay(movements: StockMovement[]): MovementDayGroup[] {
  const groups: MovementDayGroup[] = [];
  let current: MovementDayGroup | null = null;
  for (const m of movements) {
    const label = formatDateTimeWib(m.transaction_date);
    if (!current || current.label !== label) {
      current = { key: m.id, label, items: [], netQty: 0 };
      groups.push(current);
    }
    current.items.push(m);
    current.netQty += m.qty;
  }
  return groups;
}

function DayNetBadge({ net }: { net: number }) {
  const cls =
    net > 0
      ? "text-success"
      : net < 0
        ? "text-destructive"
        : "text-muted-foreground";
  return (
    <span className={cn("font-mono text-xs font-semibold tabular-nums", cls)}>
      {net > 0 ? "+" : net < 0 ? "" : "±"}
      {net} bersih
    </span>
  );
}

function MovementsSection({ itemId }: { itemId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const view = parseMovementView(searchParams.get("view"));
  const source = searchParams.get("source") ?? "";
  const drill = parseDrill(searchParams.get("drill"));
  const direction = parseDirection(searchParams.get("direction"));
  const locationId = searchParams.get("location_id") ?? "";
  const storeId = searchParams.get("store_id") ?? "";
  const page = parseIntParam(searchParams.get("page"), 1);
  const perPage = parseIntParam(searchParams.get("per_page"), 20);

  const updateUrl = useCallback(
    (patch: Partial<Record<MovementUrlKey, string>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(patch)) {
        if (val === undefined || val === "") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const setView = useCallback(
    (v: MovementView) => updateUrl({ view: v === "all" ? "" : v, page: "" }),
    [updateUrl],
  );
  const setSource = useCallback(
    (v: string) => updateUrl({ source: v, page: "" }),
    [updateUrl],
  );
  const setDirection = useCallback(
    (v: Direction) => updateUrl({ direction: v, page: "" }),
    [updateUrl],
  );
  const setLocationId = useCallback(
    (v: string) => updateUrl({ location_id: v, page: "" }),
    [updateUrl],
  );
  const setStoreId = useCallback(
    (v: string) => updateUrl({ store_id: v, page: "" }),
    [updateUrl],
  );
  const setPage = useCallback(
    (n: number) => updateUrl({ page: n === 1 ? "" : String(n) }),
    [updateUrl],
  );
  const setPerPage = useCallback(
    (n: number) => updateUrl({ per_page: n === 20 ? "" : String(n), page: "" }),
    [updateUrl],
  );
  const resetFilters = useCallback(() => {
    const patch: Partial<Record<string, string>> = {};
    for (const k of MOVEMENT_RESET_KEYS) patch[k] = "";
    updateUrl(patch);
  }, [updateUrl]);

  const { data: filterOptions } = useMovementFilters();
  const sourceOptions = filterOptions?.data?.sources ?? [];
  const directionOptions = filterOptions?.data?.directions ?? [];
  const locationOptions = filterOptions?.data?.locations ?? [];
  const storeOptions = filterOptions?.data?.stores ?? [];

  const params = useMemo(
    () => ({
      "filter[item_id]": itemId,
      "filter[source]": source || undefined,
      "filter[drill]": drill || undefined,
      "filter[direction]": direction || undefined,
      "filter[location_id]": locationId || undefined,
      "filter[store_id]": storeId || undefined,
      view,
      page,
      per_page: perPage,
      sort: "-workflow",
    }),
    [
      itemId,
      source,
      drill,
      direction,
      locationId,
      storeId,
      view,
      page,
      perPage,
    ],
  );

  const { data, isLoading } = useStockMovements(params);
  const movements = useMemo(() => data?.data ?? [], [data]);
  const dayGroups = useMemo(() => groupMovementsByDay(movements), [movements]);
  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: perPage,
    total: 0,
  };

  const activeCount = [source, drill, direction, locationId, storeId].filter(
    Boolean,
  ).length;
  const hasActiveFilter = activeCount > 0;
  const selectedLocationName = locationId
    ? locationOptions.find((option) => option.value === locationId)?.label
    : null;
  const currentStockTitle = selectedLocationName
    ? `Total stok di ${selectedLocationName}`
    : "Total stok seluruh lokasi";
  const currentStockDescription = selectedLocationName
    ? "Gabungan stok dari seluruh rak di lokasi ini."
    : "Gabungan stok dari seluruh rak di semua lokasi.";
  const currentSnapshot = movements.length > 0
    ? {
        balance: movements[0].current_balance ?? 0,
        available: movements[0].current_available_balance ?? 0,
      }
    : null;

  const viewBar = (
    <div className="flex flex-wrap items-center gap-2">
      {VIEW_TABS.map((t) => {
        const isActive = view === t.value;
        return (
          <button
            key={t.value}
            type="button"
            title={t.description}
            onClick={() => setView(t.value)}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              isActive
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );

  const filterBar = (
    <FilterToolbar
      align="end"
      hasFilter={hasActiveFilter}
      activeCount={activeCount}
      onReset={hasActiveFilter ? resetFilters : undefined}
      gridCols={2}
    >
      <Select
        value={source || ALL_VALUE}
        onValueChange={(v) => setSource(v === ALL_VALUE ? "" : v)}
      >
        <SelectTrigger className="h-9 w-full rounded-full border-border bg-background">
          <SelectValue placeholder="Pilih sumber" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Semua Sumber</SelectItem>
          {sourceOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={direction || ALL_VALUE}
        onValueChange={(v) =>
          setDirection((v === ALL_VALUE ? "" : v) as Direction)
        }
      >
        <SelectTrigger className="h-9 w-full rounded-full border-border bg-background">
          <SelectValue placeholder="Pilih mutasi" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Semua Mutasi</SelectItem>
          {directionOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={locationId || ALL_VALUE}
        onValueChange={(v) => setLocationId(v === ALL_VALUE ? "" : v)}
      >
        <SelectTrigger className="h-9 w-full rounded-full border-border bg-background">
          <SelectValue placeholder="Pilih lokasi" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Semua Lokasi</SelectItem>
          {locationOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={storeId || ALL_VALUE}
        onValueChange={(v) => setStoreId(v === ALL_VALUE ? "" : v)}
      >
        <SelectTrigger className="h-9 w-full rounded-full border-border bg-background">
          <SelectValue placeholder="Pilih toko" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Semua Toko</SelectItem>
          {storeOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterToolbar>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {viewBar}
        {filterBar}
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {viewBar}
        {filterBar}
        <EmptyState
          icon={PackageIcon}
          className="py-16"
          title={
            view === "attention"
              ? "Tidak ada entri Faktur di rentang ini — stok bersih."
              : "Belum ada kronologi stok"
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {viewBar}
      {filterBar}
      {currentSnapshot && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-foreground">{currentStockTitle}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {currentStockDescription}
            </p>
          </div>
          <div className="flex items-baseline gap-4 font-mono tabular-nums">
            <span className="text-lg font-bold text-foreground">
              {currentSnapshot.balance}
            </span>
            <span className="text-xs text-muted-foreground">
              tersedia {currentSnapshot.available}
            </span>
          </div>
        </div>
      )}
      <div
        role="note"
        className="rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground"
      >
        <span className="font-semibold text-foreground">Cara membaca:</span>{" "}
        pembatalan sebelum pengambilan dapat menambah stok tersedia karena
        cadangan dilepas, tanpa menambah stok fisik.
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/60 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <TableHead className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
              Waktu
            </TableHead>
            <TableHead className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
              Terakhir Diubah
            </TableHead>
            <TableHead className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
              Lokasi
            </TableHead>
            <TableHead className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
              Kode Rak
            </TableHead>
            <TableHead className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
              No. Transaksi
            </TableHead>
            <TableHead className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
              No. Ref
            </TableHead>
            <TableHead className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
              Sumber
            </TableHead>
            <TableHead className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-muted-foreground">
              Qty
            </TableHead>
            <TableHead
              className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-muted-foreground"
              title="Total stok fisik SKU setelah aktivitas. Pelepasan cadangan tidak mengubah saldo ini."
            >
              Saldo stok setelah aktivitas
            </TableHead>
            <TableHead className="w-[24rem] min-w-[18rem] px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
              Keterangan
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dayGroups.map((g) => (
            <Fragment key={g.key}>
              <TableRow className="border-y border-border/60 bg-muted/40 hover:bg-muted/40">
                <TableCell
                  colSpan={7}
                  className="px-3 py-1.5 text-xs font-semibold text-foreground"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarIcon className="size-3 text-muted-foreground" />
                    {g.label}
                    <span className="font-normal text-muted-foreground">
                      · {g.items.length} mutasi
                    </span>
                  </span>
                </TableCell>
                <TableCell colSpan={3} className="px-3 py-1.5 text-right">
                  <DayNetBadge net={g.netQty} />
                </TableCell>
              </TableRow>
              {g.items.map((m: StockMovement) => (
                <TableRow
                  key={m.id}
                  className="border-b border-border/30 transition-colors hover:bg-muted/30"
                >
                  <TableCell className="px-3 py-2.5 font-mono text-xs text-muted-foreground tabular-nums">
                    {formatTime(m.transaction_date)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-xs text-muted-foreground">
                    {formatDateTime(m.updated_at)}
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1">
                      <MapPinIcon className="size-3 text-muted-foreground" />
                      {m.location_name}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    {m.bin_code ? (
                      <code className="rounded bg-muted/60 px-1.5 py-0.5 text-xs font-medium">
                        {m.bin_code}
                      </code>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    {(() => {
                      const { label, href, hint, extraOrders } =
                        resolveTransactionDisplay(m);
                      return (
                        <span
                          className="inline-flex items-baseline gap-1"
                          title={hint}
                        >
                          {href ? (
                            <Link
                              href={href}
                              className="font-mono text-xs text-primary hover:underline"
                            >
                              {label}
                            </Link>
                          ) : (
                            <span className="font-mono text-xs">{label}</span>
                          )}
                          {extraOrders > 0 && (
                            <span className="text-xs text-muted-foreground">
                              +{extraOrders}
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    {m.reference_number ? (
                      <span className="font-mono text-xs text-muted-foreground">
                        {m.reference_number}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2.5">
                    <SourceBadge
                      category={m.source_category}
                      label={m.source_label}
                      isVariance={m.is_variance}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-right">
                    <QtyCell qty={m.qty} effect={m.stock_effect} />
                  </TableCell>
                  <TableCell className="px-3 py-2.5 text-right font-mono text-sm font-semibold tabular-nums">
                    {m.placed_balance ?? m.balance}
                  </TableCell>
                  <TableCell className="w-[24rem] min-w-[18rem] px-3 py-2.5 align-top text-xs text-muted-foreground">
                    {m.note ? (
                      <MovementNote note={m.note} />
                    ) : m.stock_effect ? (
                      <MovementEffectNote effect={m.stock_effect} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>

      <div className="px-3">
        <SimplePagination
          page={meta.current_page}
          lastPage={meta.last_page}
          onPageChange={setPage}
          perPage={meta.per_page}
          onPerPageChange={setPerPage}
          pageSizeOptions={TABLE_PAGE_SIZES}
          total={meta.total}
          label="mutasi"
        />
      </div>
    </div>
  );
}

function BinSection({ itemId }: { itemId: string }) {
  const { data, isLoading } = useItemStock(itemId);
  const bins: BinInventory[] = useMemo(() => data?.data ?? [], [data]);

  const { data: locData } = useLocations({ perPage: 100 });
  const searchParams = useSearchParams();

  const [locationId, setLocationId] = useState(
    () => searchParams.get("location_id") ?? "",
  );
  const [zoneId, setZoneId] = useState("");
  const [floor, setFloor] = useState("");
  const [row, setRow] = useState("");
  const [col, setCol] = useState("");

  const locationOptions = useMemo(
    () =>
      (locData?.items ?? []).map((l) => ({
        value: l.id,
        label: l.locationName,
      })),
    [locData],
  );

  const zoneOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bins) {
      if (locationId && b.location_id !== locationId) continue;
      if (b.zone_id && b.zone_name) map.set(b.zone_id, b.zone_name);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ value: id, label: name }));
  }, [bins, locationId]);

  const floorOptions = useMemo(() => {
    const set = new Set<string>();
    for (const b of bins) {
      if (locationId && b.location_id !== locationId) continue;
      if (zoneId && b.zone_id !== zoneId) continue;
      if (b.floor_code) set.add(b.floor_code);
    }
    return Array.from(set)
      .sort()
      .map((v) => ({ value: v, label: v }));
  }, [bins, locationId, zoneId]);

  const rowOptions = useMemo(() => {
    const set = new Set<string>();
    for (const b of bins) {
      if (locationId && b.location_id !== locationId) continue;
      if (zoneId && b.zone_id !== zoneId) continue;
      if (floor && b.floor_code !== floor) continue;
      if (b.row_code) set.add(b.row_code);
    }
    return Array.from(set)
      .sort()
      .map((v) => ({ value: v, label: v }));
  }, [bins, locationId, zoneId, floor]);

  const colOptions = useMemo(() => {
    const set = new Set<string>();
    for (const b of bins) {
      if (locationId && b.location_id !== locationId) continue;
      if (zoneId && b.zone_id !== zoneId) continue;
      if (floor && b.floor_code !== floor) continue;
      if (row && b.row_code !== row) continue;
      if (b.column_code) set.add(b.column_code);
    }
    return Array.from(set)
      .sort()
      .map((v) => ({ value: v, label: v }));
  }, [bins, locationId, zoneId, floor, row]);

  const filtered = useMemo(
    () =>
      bins.filter((b) => {
        if (locationId && b.location_id !== locationId) return false;
        if (zoneId && b.zone_id !== zoneId) return false;
        if (floor && b.floor_code !== floor) return false;
        if (row && b.row_code !== row) return false;
        if (col && b.column_code !== col) return false;
        return true;
      }),
    [bins, locationId, zoneId, floor, row, col],
  );

  const activeCount = [locationId, zoneId, floor, row, col].filter(
    Boolean,
  ).length;
  const hasFilter = activeCount > 0;

  const filterBar = (
    <FilterToolbar
      align="end"
      hasFilter={hasFilter}
      activeCount={activeCount}
      onReset={
        hasFilter
          ? () => {
              setLocationId("");
              setZoneId("");
              setFloor("");
              setRow("");
              setCol("");
            }
          : undefined
      }
      gridCols={2}
    >
      <Select
        value={locationId || ALL_VALUE}
        onValueChange={(v) => {
          setLocationId(v === ALL_VALUE ? "" : v);
          setZoneId("");
          setFloor("");
          setRow("");
          setCol("");
        }}
      >
        <SelectTrigger className="h-9 w-full rounded-full border-border bg-background">
          <SelectValue placeholder="Pilih lokasi" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Semua Lokasi</SelectItem>
          {locationOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Combobox
        options={[{ value: "", label: "Semua Zona" }, ...zoneOptions]}
        value={zoneId}
        onChange={(v) => {
          setZoneId(v ?? "");
          setFloor("");
          setRow("");
          setCol("");
        }}
        placeholder="Pilih zona"
        searchPlaceholder="Cari zona"
        className="h-9 bg-background"
      />
      <Combobox
        options={[{ value: "", label: "Semua Lantai" }, ...floorOptions]}
        value={floor}
        onChange={(v) => {
          setFloor(v ?? "");
          setRow("");
          setCol("");
        }}
        placeholder="Pilih lantai"
        searchPlaceholder="Cari lantai"
        className="h-9 bg-background"
      />
      <Combobox
        options={[{ value: "", label: "Semua Baris" }, ...rowOptions]}
        value={row}
        onChange={(v) => {
          setRow(v ?? "");
          setCol("");
        }}
        placeholder="Pilih baris"
        searchPlaceholder="Cari baris"
        className="h-9 bg-background"
      />
      <Combobox
        options={[{ value: "", label: "Semua Kolom" }, ...colOptions]}
        value={col}
        onChange={(v) => setCol(v ?? "")}
        placeholder="Pilih kolom"
        searchPlaceholder="Cari kolom"
        className="h-9 bg-background"
      />
    </FilterToolbar>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {filterBar}
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (bins.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {filterBar}
        <EmptyState
          icon={BoxIcon}
          className="py-16"
          title="Belum ada data persediaan di rak"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {filterBar}
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/60 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <TableHead className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
              Lokasi
            </TableHead>
            <TableHead className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
              Zona
            </TableHead>
            <TableHead className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
              Kode Rak
            </TableHead>
            <TableHead className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-muted-foreground">
              On Hand
            </TableHead>
            <TableHead className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-muted-foreground">
              Stok Aktual
            </TableHead>
            <TableHead className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-muted-foreground">
              Di Meja Packing
            </TableHead>
            <TableHead className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-muted-foreground">
              On Order
            </TableHead>
            <TableHead className="px-3 py-2.5 text-right text-xs uppercase tracking-wider text-muted-foreground">
              Available
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((b: BinInventory) => (
            <TableRow
              key={b.id}
              className="border-b border-border/30 transition-colors hover:bg-muted/30"
            >
              <TableCell className="px-3 py-2.5">
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="size-3 text-muted-foreground" />
                  {b.location_name}
                </span>
              </TableCell>
              <TableCell className="px-3 py-2.5 text-sm">
                {b.zone_name ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="px-3 py-2.5">
                {b.bin_code ? (
                  <code className="rounded bg-muted/60 px-1.5 py-0.5 text-xs font-medium">
                    {b.bin_code}
                  </code>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="px-3 py-2.5 text-right font-semibold tabular-nums">
                {b.on_hand}
              </TableCell>
              <TableCell className="px-3 py-2.5 text-right font-semibold tabular-nums">
                {b.actual ?? b.on_hand}
              </TableCell>
              <TableCell
                className={cn(
                  "px-3 py-2.5 text-right tabular-nums",
                  (b.picked_not_packed ?? 0) > 0
                    ? "text-warning"
                    : "text-muted-foreground",
                )}
              >
                {b.picked_not_packed ?? 0}
              </TableCell>
              <TableCell className="px-3 py-2.5 text-right tabular-nums text-warning">
                {b.on_order}
              </TableCell>
              <TableCell
                className={cn(
                  "px-3 py-2.5 text-right font-semibold tabular-nums",
                  b.available < 0 ? "text-destructive" : "text-success",
                )}
              >
                {b.available}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function PesananSection({ itemId }: { itemId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const locationId = searchParams.get("location_id") ?? "";
  const page = parseIntParam(searchParams.get("page"), 1);
  const perPage = parseIntParam(searchParams.get("per_page"), 20);

  const updateUrl = useCallback(
    (patch: Partial<Record<string, string>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(patch)) {
        if (val === undefined || val === "") params.delete(key);
        else params.set(key, val);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const setLocationId = useCallback(
    (v: string) => updateUrl({ location_id: v, page: "" }),
    [updateUrl],
  );
  const setPage = useCallback(
    (n: number) => updateUrl({ page: n === 1 ? "" : String(n) }),
    [updateUrl],
  );
  const setPerPage = useCallback(
    (n: number) => updateUrl({ per_page: n === 20 ? "" : String(n), page: "" }),
    [updateUrl],
  );

  const { data: locData } = useLocations({ perPage: 100 });
  const locationOptions = useMemo(
    () =>
      (locData?.items ?? []).map((l) => ({
        value: l.id,
        label: l.locationName,
      })),
    [locData],
  );

  const { data, isLoading } = useOrders({
    item_id: itemId,
    location_id: locationId || undefined,
    status: ["open"],
    page,
    per_page: perPage,
    sort_by: "transaction_date",
    sort_dir: "desc",
  });

  const orders = data?.data ?? [];
  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: perPage,
    total: 0,
  };

  const hasFilter = Boolean(locationId);

  const filterBar = (
    <FilterToolbar
      align="end"
      hasFilter={hasFilter}
      activeCount={hasFilter ? 1 : 0}
      onReset={hasFilter ? () => setLocationId("") : undefined}
      gridCols={1}
    >
      <Select
        value={locationId || ALL_VALUE}
        onValueChange={(v) => setLocationId(v === ALL_VALUE ? "" : v)}
      >
        <SelectTrigger className="h-9 w-full rounded-full border-border bg-background">
          <SelectValue placeholder="Pilih lokasi" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Semua Lokasi</SelectItem>
          {locationOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FilterToolbar>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {filterBar}
        <div className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {filterBar}
        <EmptyState
          icon={ShoppingCartIcon}
          className="py-16"
          title="Tidak ada pesanan pelanggan aktif untuk SKU ini di lokasi tersebut."
        />
      </div>
    );
  }

  const itemQty = (o: Order) =>
    o.items.reduce(
      (sum, it) =>
        it.item_id === itemId ? sum + Number(it.qty_in_base || 0) : sum,
      0,
    ) || o.total_qty;

  return (
    <div className="flex flex-col gap-3">
      {filterBar}
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/60 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <TableHead className="px-3 py-2.5">No. SO</TableHead>
            <TableHead className="px-3 py-2.5">Channel</TableHead>
            <TableHead className="px-3 py-2.5">Tanggal</TableHead>
            <TableHead className="px-3 py-2.5 text-right">Qty</TableHead>
            <TableHead className="px-3 py-2.5">Lokasi</TableHead>
            <TableHead className="px-3 py-2.5">Status</TableHead>
            <TableHead className="px-3 py-2.5 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((o: Order) => {
            const channelMeta = o.source
              ? CHANNEL_MAP[o.source.toLowerCase()]
              : undefined;
            const statusMeta = STATUS_LABELS[o.status];
            return (
              <TableRow
                key={o.id}
                className="border-b border-border/30 transition-colors hover:bg-muted/30"
              >
                <TableCell className="px-3 py-2.5">
                  <Link
                    href={`/dashboard/pesanan/${o.id}`}
                    className="font-mono text-xs text-primary hover:underline"
                  >
                    {o.salesorder_no}
                  </Link>
                </TableCell>
                <TableCell className="px-3 py-2.5">
                  {channelMeta ? (
                    <Badge
                      variant="outline"
                      className="text-2xs font-medium"
                      style={{
                        color: channelMeta.color,
                        borderColor: channelMeta.color,
                      }}
                    >
                      {channelMeta.label}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">
                      {o.source ?? "—"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-2.5 text-muted-foreground">
                  {o.transaction_date ? formatDateTimeWib(o.transaction_date) : "—"}
                </TableCell>
                <TableCell className="px-3 py-2.5 text-right font-mono text-sm font-semibold tabular-nums">
                  {itemQty(o)}
                </TableCell>
                <TableCell className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon className="size-3 text-muted-foreground" />
                    {o.location_name ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2.5">
                  {statusMeta ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-2xs font-medium",
                        statusMeta.className,
                      )}
                    >
                      {statusMeta.label}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">{o.status}</span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-2.5 text-right">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 rounded-full"
                  >
                    <Link href={`/dashboard/pesanan/${o.id}`}>
                      <ExternalLinkIcon className="size-3" />
                      Buka
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="px-3">
        <SimplePagination
          page={meta.current_page}
          lastPage={meta.last_page}
          onPageChange={setPage}
          perPage={meta.per_page}
          onPerPageChange={setPerPage}
          pageSizeOptions={TABLE_PAGE_SIZES}
          total={meta.total}
          label="pesanan"
        />
      </div>
    </div>
  );
}

type DetailTab = "kronologi" | "rak" | "pesanan";

export function StockPositionDetailView({ itemId }: { itemId: string }) {
  const [activeTab, setActiveTab] = useUrlTab<DetailTab>("tab", "kronologi", {
    validValues: ["kronologi", "rak", "pesanan"] as const,
  });

  const { data, isLoading } = useStockItem(itemId);
  const item = data?.data ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={isLoading ? "Memuat..." : (item?.item_code ?? "Detail Stok")}
        description={isLoading ? "" : (item?.item_name ?? "")}
        backHref="/dashboard/posisi-stok"
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Persediaan" },
          { label: "Posisi Stok", href: "/dashboard/posisi-stok" },
          { label: item?.item_code ?? "Detail" },
        ]}
      />

      {isLoading ? (
        <LiquidGlass
          radius={20}
          intensity="subtle"
          className="bg-white/30 p-5 dark:bg-white/[0.04]"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </LiquidGlass>
      ) : item ? (
        <>
          <LiquidGlass
            radius={20}
            intensity="subtle"
            className="bg-white/30 p-5 dark:bg-white/[0.04]"
          >
            <div className="flex items-center gap-4">
              {item.thumbnail ? (
                <Image
                  src={item.thumbnail}
                  alt={item.item_name ?? item.item_code}
                  width={64}
                  height={64}
                  className="h-16 w-16 shrink-0 rounded-xl border border-border/60 object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                  <PackageIcon className="h-8 w-8 text-muted-foreground/60" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold leading-tight">
                  {item.item_name || item.item_code}
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {item.item_code}
                </p>
                {item.variation_values.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.variation_values.map((v) => (
                      <Badge
                        key={`${v.label}-${v.value}`}
                        variant="secondary"
                        className="text-xs"
                      >
                        {v.value}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </LiquidGlass>

          <StockSummaryCards
            onHand={item.total_stocks.on_hand}
            actual={item.total_stocks.actual ?? item.total_stocks.on_hand}
            pickedNotPacked={item.total_stocks.picked_not_packed ?? 0}
            onOrder={item.total_stocks.on_order}
            transit={item.total_stocks.transit ?? 0}
            available={item.total_stocks.available}
            avgCost={Number(item.average_cost)}
          />
        </>
      ) : (
        <LiquidGlass
          radius={20}
          intensity="subtle"
          className="bg-white/30 p-8 dark:bg-white/[0.04]"
        >
          <EmptyState icon={PackageIcon} title="Produk tidak ditemukan" />
        </LiquidGlass>
      )}

      {item?.is_bundle ? (
        <LiquidGlass
          radius={20}
          intensity="subtle"
          className="bg-white/30 p-5 dark:bg-white/[0.04]"
        >
          <div className="flex items-start gap-3">
            <BoxIcon className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-sm font-semibold">Stok bundle dihitung dari komponen</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Angka di atas adalah kapasitas bundle yang bisa dirakit pada lokasi yang sama.
                Kronologi, rak, dan pesanan tetap tercatat pada masing-masing SKU komponen.
              </p>
            </div>
          </div>
        </LiquidGlass>
      ) : item ? (
        <LiquidGlass
          radius={20}
          intensity="subtle"
          className="bg-white/30 dark:bg-white/[0.04]"
        >
          <div className="border-b border-border/60">
            <div className="flex gap-0 px-5">
              {(
                [
                  { key: "kronologi", label: "Kronologi Stok" },
                  { key: "rak", label: "Persediaan di Rak" },
                  { key: "pesanan", label: "Pesanan Pelanggan" },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setActiveTab(t.key)}
                  className={cn(
                    "relative px-4 py-3 text-sm font-medium transition-colors",
                    activeTab === t.key
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  {activeTab === t.key && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {activeTab === "kronologi" ? (
              <MovementsSection itemId={item.item_id} />
            ) : activeTab === "pesanan" ? (
              <PesananSection itemId={item.item_id} />
            ) : (
              <BinSection itemId={item.item_id} />
            )}
          </div>
        </LiquidGlass>
      ) : null}
    </div>
  );
}
