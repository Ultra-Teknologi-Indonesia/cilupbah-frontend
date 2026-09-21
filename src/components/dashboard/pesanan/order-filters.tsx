"use client";

import type React from "react";
import { useMemo } from "react";
import { format, parse } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/date-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterToolbar } from "@/components/dashboard/master-produk/filter-toolbar";
import { cn } from "@/lib/utils";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import { useConnectedStores } from "@/hooks/channel/use-connected-stores";
import { useOrderShippingProviders } from "@/hooks/pesanan/use-orders";
import { OrderSortControl } from "./order-sort-control";
import {
  CHANNEL_MAP,
  STATUS_FILTER_OPTIONS,
  type OrderTab,
} from "@/types/pesanan/order";

const CONTENT_OPTIONS = [
  { value: "", label: "Semua Isi" },
  { value: "combo", label: "SKU Kombinasi" },
  { value: "single_1qty", label: "1 SKU, 1 Qty" },
  { value: "single_nqty", label: "1 SKU, > 1 Qty" },
];

const CHANNEL_OPTIONS = [
  { value: "", label: "Semua Channel" },
  ...Object.entries(CHANNEL_MAP).map(([k, v]) => ({
    value: k,
    label: v.label,
  })),
];

const PAYMENT_OPTIONS = [
  { value: "cod", label: "COD" },
  { value: "noncod", label: "Non-COD" },
];

const LABEL_PRINTED_OPTIONS = [
  { value: "yes", label: "Sudah cetak" },
  { value: "no", label: "Belum cetak" },
];

const CONTACT_STATUS_OPTIONS = [
  { value: "not_contacted", label: "Belum dihubungi" },
  { value: "contacted", label: "Sudah dihubungi" },
];

const DECISION_OPTIONS = [
  { value: "waiting", label: "Menunggu" },
  { value: "cancel", label: "Batal" },
  { value: "replace", label: "Ganti Barang" },
];

export interface FilterState {
  channel: string;
  store_id: string;
  location_id: string;
  content_type: string;
  date_from: string;
  date_to: string;
  shipping_provider: string[];
  payment: string;
  label_printed: string;
  contact_status: string;
  decision: string;
  status: string[];
}

const EMPTY: FilterState = {
  channel: "",
  store_id: "",
  location_id: "",
  content_type: "",
  date_from: "",
  date_to: "",
  shipping_provider: [],
  payment: "",
  label_printed: "",
  contact_status: "",
  decision: "",
  status: [],
};

function toDate(s: string): Date | undefined {
  if (!s) return undefined;
  return parse(s, "yyyy-MM-dd", new Date());
}

function toStr(d: Date | undefined): string {
  return d ? format(d, "yyyy-MM-dd") : "";
}

function FilterRadioGroup({
  name,
  value,
  onValueChange,
  options,
  allLabel = "Semua",
}: {
  name: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  const items = [{ value: "__all", label: allLabel }, ...options];
  return (
    <RadioGroup
      value={value || "__all"}
      onValueChange={(v) => onValueChange(v === "__all" ? "" : v)}
      className="flex flex-wrap items-center gap-x-4 gap-y-1.5"
    >
      {items.map((opt) => {
        const id = `${name}-${opt.value}`;
        return (
          <label
            key={opt.value}
            htmlFor={id}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-full border border-transparent px-2 py-1 text-sm transition-colors",
              (value || "__all") === opt.value
                ? "border-primary/30 bg-primary/5 text-primary"
                : "text-foreground hover:bg-muted/50",
            )}
          >
            <RadioGroupItem id={id} value={opt.value} />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

export function OrderFilters({
  query,
  onQueryChange,
  onQuerySubmit,
  filters,
  onChange,
  leading,
  trailing,
  onRefresh,
  isRefreshing,
  tab,
  sortDir,
  onSortDirChange,
  sortBy,
  onSortByChange,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  onQuerySubmit?: (value?: string) => void;
  filters: FilterState;
  onChange: (f: FilterState) => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  tab?: OrderTab;
  sortDir?: "asc" | "desc";
  onSortDirChange?: (dir: "asc" | "desc") => void;
  sortBy?: string;
  onSortByChange?: (by: string) => void;
}) {
  const { data: locData } = useLocations();
  const { data: storeData } = useConnectedStores();
  const { data: dynamicProvidersData } = useOrderShippingProviders({
    tab,
    channel: filters.channel || undefined,
    store_id: filters.store_id || undefined,
    location_id: filters.location_id || undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
  });

  const locations = (locData?.items ?? []).map((l) => ({
    value: l.id,
    label: l.locationName,
  }));

  const stores = (storeData ?? [])
    .filter((s) => {
      if (!filters.channel) return true;
      if (filters.channel === "tokopedia") {
        return s.channel?.code === "tokopedia" || s.channel?.code === "tiktok";
      }
      return s.channel?.code === filters.channel;
    })
    .map((s) => ({
      value: s.shop_id,
      label: `${s.channel?.name ?? "Channel tidak diketahui"} · ${s.shop_name}`,
    }));

  const courierOptions = useMemo(() => {
    const list = (dynamicProvidersData?.data ?? []).map((p) => ({
      value: p.name,
      label: `${p.name} (${p.count})`,
    }));

    // If user has selected or typed a value not in the active list, keep it visible
    for (const val of filters.shipping_provider) {
      if (
        val &&
        !list.some((o) => o.value.toLowerCase() === val.toLowerCase())
      ) {
        list.push({ value: val, label: val });
      }
    }

    return list;
  }, [dynamicProvidersData, filters.shipping_provider]);

  const hasActive =
    Object.entries(filters).some(([k, v]) =>
      k === "status" || k === "shipping_provider"
        ? (v as string[]).length > 0
        : Boolean(v),
    ) || Boolean(query);
  const activeCount =
    [
      filters.channel,
      filters.store_id,
      filters.location_id,
      filters.content_type,
      filters.date_from || filters.date_to,
      filters.payment,
      filters.label_printed,
      filters.contact_status,
      filters.decision,
    ].filter(Boolean).length +
    (filters.status.length > 0 ? 1 : 0) +
    (filters.shipping_provider.length > 0 ? 1 : 0);

  const dateRange = useMemo<DateRange | undefined>(() => {
    const from = toDate(filters.date_from);
    const to = toDate(filters.date_to);
    if (!from && !to) return undefined;
    return { from, to };
  }, [filters.date_from, filters.date_to]);

  return (
    <FilterToolbar
      search={query}
      onSearchChange={onQueryChange}
      onSearch={onQuerySubmit}
      searchPlaceholder="Cari no. pesanan, resi, nama, SKU…"
      onReset={
        hasActive
          ? () => {
              onChange(EMPTY);
              onQueryChange?.("");
            }
          : undefined
      }
      hasFilter={hasActive}
      activeCount={activeCount}
      align="end"
      leading={leading}
      trailing={trailing}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
      gridCols={4}
      sortControl={
        sortDir && onSortDirChange ? (
          <OrderSortControl
            sortDir={sortDir}
            onSortDirChange={onSortDirChange}
            sortBy={sortBy}
            onSortByChange={onSortByChange}
          />
        ) : undefined
      }
    >
      {tab === "all" && (
        <Combobox
          multiple
          options={STATUS_FILTER_OPTIONS}
          value={filters.status}
          onChange={(v) => onChange({ ...filters, status: v })}
          placeholder="Status"
          searchPlaceholder="Cari status"
          className="h-9 bg-background sm:col-span-2"
        />
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Lokasi
        </label>
        <Select
          value={filters.location_id || "all"}
          onValueChange={(v) =>
            onChange({ ...filters, location_id: v === "all" ? "" : v })
          }
        >
          <SelectTrigger className="h-9 w-full bg-background">
            <SelectValue placeholder="Semua Lokasi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Lokasi</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.value} value={location.value}>
                {location.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Combobox
        options={CHANNEL_OPTIONS}
        value={filters.channel}
        onChange={(v) =>
          onChange({ ...filters, channel: v ?? "", store_id: "" })
        }
        placeholder="Channel"
        searchPlaceholder="Cari channel"
        className="h-9 bg-background"
      />

      <Combobox
        options={[{ value: "", label: "Semua Toko" }, ...stores]}
        value={filters.store_id}
        onChange={(v) => onChange({ ...filters, store_id: v ?? "" })}
        placeholder="Toko"
        searchPlaceholder="Cari toko"
        className="h-9 bg-background"
      />

      <Combobox
        multiple
        options={courierOptions}
        value={filters.shipping_provider}
        onChange={(v) => onChange({ ...filters, shipping_provider: v })}
        onCreateOption={(newVal) => {
          if (!filters.shipping_provider.includes(newVal)) {
            onChange({
              ...filters,
              shipping_provider: [...filters.shipping_provider, newVal],
            });
          }
        }}
        placeholder="Semua Kurir"
        searchPlaceholder="Cari atau ketik nama kurir…"
        emptyText="Ketik nama kurir untuk menambahkan filter."
        className="h-9 bg-background sm:col-span-2"
      />

      <Combobox
        options={CONTENT_OPTIONS}
        value={filters.content_type}
        onChange={(v) => onChange({ ...filters, content_type: v ?? "" })}
        placeholder="Isi Pesanan"
        searchPlaceholder="Cari tipe"
        className="h-9 bg-background"
      />

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground">
          Pembayaran
        </label>
        <FilterRadioGroup
          name="payment"
          value={filters.payment}
          onValueChange={(v) => onChange({ ...filters, payment: v })}
          options={PAYMENT_OPTIONS}
        />
      </div>

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground">
          Cetak Label
        </label>
        <FilterRadioGroup
          name="label_printed"
          value={filters.label_printed}
          onValueChange={(v) => onChange({ ...filters, label_printed: v })}
          options={LABEL_PRINTED_OPTIONS}
        />
      </div>

      {tab === "empty-stock" && (
        <>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">
              Status Kontak
            </label>
            <FilterRadioGroup
              name="contact_status"
              value={filters.contact_status}
              onValueChange={(v) => onChange({ ...filters, contact_status: v })}
              options={CONTACT_STATUS_OPTIONS}
            />
          </div>

          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">
              Keputusan Pembeli
            </label>
            <FilterRadioGroup
              name="decision"
              value={filters.decision}
              onValueChange={(v) => onChange({ ...filters, decision: v })}
              options={DECISION_OPTIONS}
            />
          </div>
        </>
      )}

      <div className="sm:col-span-2 lg:col-span-4">
        <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Rentang tanggal transaksi
          </div>
          <DateRangePicker
            value={dateRange}
            onChange={(range) =>
              onChange({
                ...filters,
                date_from: toStr(range?.from),
                date_to: toStr(range?.to),
              })
            }
            placeholder="Pilih tanggal mulai dan selesai"
            className="h-9 w-full bg-background sm:max-w-md"
          />
        </div>
      </div>
    </FilterToolbar>
  );
}

export { EMPTY as EMPTY_FILTERS };
