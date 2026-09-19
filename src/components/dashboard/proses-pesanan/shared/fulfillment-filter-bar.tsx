"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { FilterIcon, SearchIcon, XIcon } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-picker";
import { useConnectedStores } from "@/hooks/channel/use-connected-stores";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import {
  useCouriers,
  useStageCourierOptions,
} from "@/hooks/proses-pesanan/use-fulfillment";

export type FulfillmentFilterField =
  | "courier"
  | "location"
  | "channel"
  | "store"
  | "awb"
  | "label_printed"
  | "date"
  | "zone"
  | "payment"
  | "courier_type"
  | "shipment_type"
  | "status";

export interface FulfillmentFilterValue {
  shipping_provider?: string;
  courier_code?: string;
  location_id?: string;
  source?: string;
  channel_shop_id?: string;
  awb?: string;
  label_printed?: string;
  date_from?: string;
  date_to?: string;
  zone_id?: string;
  payment?: string;
  courier_type?: string;
  shipment_type?: string;
  status?: string;
  channel_status?: string;
}

interface Props {
  value: FulfillmentFilterValue;
  onChange: (v: FulfillmentFilterValue) => void;
  fields: FulfillmentFilterField[];
  statusOptions?: { value: string; label: string }[];
  channelStatusOptions?: { value: string; label: string }[];
  courierMode?: "shipping_provider" | "courier_code";
  courierStage?: string;
  excludeTransit?: boolean;
  search?: string;
  onSearchChange?: (v: string) => void;
  onSearch?: (value?: string) => void;
  searchPlaceholder?: string;
  className?: string;
}

const CHANNEL_OPTIONS = [
  { value: "shopee", label: "Shopee" },
  { value: "tiktok", label: "TikTok" },
  { value: "lazada", label: "Lazada" },
  { value: "tokopedia", label: "Tokopedia" },
];

const LABEL_PRINTED_OPTIONS = [
  { value: "yes", label: "Sudah cetak" },
  { value: "no", label: "Belum cetak" },
];

const AWB_OPTIONS = [
  { value: "yes", label: "Sudah ada" },
  { value: "no", label: "Belum ada" },
];

const PAYMENT_OPTIONS = [
  { value: "cod", label: "COD" },
  { value: "noncod", label: "Non-COD" },
];

const COURIER_TYPE_OPTIONS = [
  { value: "regular", label: "Regular" },
  { value: "instant", label: "Instan" },
];

const SHIPMENT_TYPE_OPTIONS = [
  { value: "REGULAR", label: "Reguler" },
  { value: "INSTANT", label: "Instant" },
];

function FieldWrapper({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-[180px] flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function FilterRadioGroup({
  name,
  value,
  onValueChange,
  options,
  allLabel = "Semua",
}: {
  name: string;
  value: string | undefined;
  onValueChange: (v: string | undefined) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
}) {
  const items = [{ value: "__all", label: allLabel }, ...options];
  const current = value ?? "__all";
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className="inline-flex w-fit flex-wrap items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1"
    >
      {items.map((opt) => {
        const selected = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() =>
              onValueChange(opt.value === "__all" ? undefined : opt.value)
            }
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function parseISODate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = parse(s, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

function toISODate(d: Date | undefined): string | undefined {
  if (!d) return undefined;
  return format(d, "yyyy-MM-dd");
}

export function FulfillmentFilterBar({
  value,
  onChange,
  fields,
  statusOptions,
  channelStatusOptions,
  courierMode = "shipping_provider",
  courierStage,
  excludeTransit,
  search,
  onSearchChange,
  onSearch,
  searchPlaceholder = "Cari…",
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);

  const includes = React.useCallback(
    (f: FulfillmentFilterField) => fields.includes(f),
    [fields],
  );

  const useStageCouriers = includes("courier") && !!courierStage;
  const couriers = useCouriers(includes("courier") && !useStageCouriers);
  const stageCouriers = useStageCourierOptions(courierStage, useStageCouriers);
  const locations = useLocations(includes("location") ? { perPage: 200 } : {});
  const stores = useConnectedStores();

  const courierOptions = React.useMemo(() => {
    if (useStageCouriers) {
      return (stageCouriers.data ?? []).map((name) => ({
        value: name,
        label: name,
      }));
    }
    const list = couriers.data ?? [];
    return list.map((c) => ({
      value: courierMode === "courier_code" ? (c.code ?? c.id) : c.name,
      label: c.name,
    }));
  }, [useStageCouriers, stageCouriers.data, couriers.data, courierMode]);

  const locationOptions = React.useMemo(() => {
    const list = locations.data?.items ?? [];
    const filtered = excludeTransit ? list : list;
    return filtered.map((l) => ({ value: l.id, label: l.locationName }));
  }, [locations.data, excludeTransit]);

  const storeOptions = React.useMemo(() => {
    const list = stores.data ?? [];
    return list.map((s) => ({ value: s.shop_id, label: s.shop_name }));
  }, [stores.data]);

  const activeCount = React.useMemo(() => {
    let n = 0;
    if (value.shipping_provider) n++;
    if (value.courier_code) n++;
    if (value.location_id) n++;
    if (value.source) n++;
    if (value.channel_shop_id) n++;
    if (value.awb) n++;
    if (value.label_printed) n++;
    if (value.date_from || value.date_to) n++;
    if (value.zone_id) n++;
    if (value.payment) n++;
    if (value.courier_type) n++;
    if (value.shipment_type) n++;
    if (value.status) n++;
    if (value.channel_status) n++;
    return n;
  }, [value]);

  const hasFilter = activeCount > 0;
  const hasChildren = fields.some((f) => f !== "zone");

  function patch(next: Partial<FulfillmentFilterValue>) {
    onChange({ ...value, ...next });
  }

  function reset() {
    onChange({});
    setOpen(false);
  }

  function courierChange(values: string[]) {
    const serialized = values.join(",");
    if (courierMode === "courier_code") {
      patch({ courier_code: serialized || undefined });
    } else {
      patch({ shipping_provider: serialized || undefined });
    }
  }

  const courierValue = React.useMemo(() => {
    const raw =
      courierMode === "courier_code"
        ? value.courier_code
        : value.shipping_provider;

    return raw
      ? raw
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  }, [courierMode, value.courier_code, value.shipping_provider]);

  const useChannelStatus = Boolean(channelStatusOptions?.length);
  const statusList = useChannelStatus
    ? channelStatusOptions!
    : (statusOptions ?? []);
  const statusValue = useChannelStatus
    ? (value.channel_status ?? null)
    : (value.status ?? null);

  function statusChange(v: string | null) {
    if (useChannelStatus) patch({ channel_status: v ?? undefined });
    else patch({ status: v ?? undefined });
  }

  const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(
    null,
  );

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ambil target portal dari DOM saat mount
    setPortalTarget(document.getElementById("proses-pesanan-filter-portal"));
  }, []);

  const topBar = (
    <React.Fragment>
      {hasFilter && (
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1 text-sm font-medium text-destructive transition-colors hover:text-destructive/80"
        >
          <XIcon className="size-3.5" />
          Reset
        </button>
      )}

      <div
        className={cn(
          "flex flex-wrap items-center gap-2",
          !portalTarget && "ml-auto",
        )}
      >
        {onSearchChange != null && (
          <div className="relative w-full sm:w-auto sm:min-w-[220px]">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && onSearch) {
                  e.preventDefault();
                  onSearch();
                }
              }}
              placeholder={searchPlaceholder}
              className="h-9 rounded-full bg-background pl-9 pr-8"
            />
            {(search?.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange("");
                  onSearch?.("");
                }}
                aria-label="Bersihkan pencarian"
                className="absolute right-2.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {onSearch && (
          <Button
            type="button"
            size="sm"
            onClick={() => onSearch()}
            className="h-9 gap-1.5 rounded-full"
          >
            <SearchIcon className="size-4" />
            Cari
          </Button>
        )}

        {hasChildren && (
          <Button
            variant={open ? "secondary" : "outline"}
            size="sm"
            className={cn(
              "h-9 gap-2 rounded-full transition-colors",
              open && "bg-primary/10 text-primary hover:bg-primary/15",
              !open && activeCount > 0 && "border-primary/40 text-primary",
            )}
            onClick={() => setOpen(!open)}
          >
            <FilterIcon className="size-4" />
            Filter
            {activeCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-2xs font-semibold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        )}
      </div>
    </React.Fragment>
  );

  return (
    <div
      className={cn(!portalTarget && "border-b border-border/40", className)}
    >
      {portalTarget ? (
        createPortal(topBar, portalTarget)
      ) : (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 sm:px-5">
          {topBar}
        </div>
      )}

      {hasChildren && (
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <div className="flex flex-wrap gap-3 px-4 pb-4 pt-1 sm:px-5">
              {includes("courier") && (
                <FieldWrapper label="Kurir">
                  <Combobox
                    multiple
                    options={courierOptions}
                    value={courierValue}
                    onChange={courierChange}
                    placeholder="Semua kurir"
                    searchPlaceholder="Cari kurir"
                  />
                </FieldWrapper>
              )}
              {includes("location") && (
                <FieldWrapper label="Gudang">
                  <Combobox
                    options={locationOptions}
                    value={value.location_id ?? null}
                    onChange={(v) => patch({ location_id: v ?? undefined })}
                    placeholder="Semua gudang"
                    searchPlaceholder="Cari gudang"
                  />
                </FieldWrapper>
              )}
              {includes("channel") && (
                <FieldWrapper label="Channel">
                  <Combobox
                    options={CHANNEL_OPTIONS}
                    value={value.source ?? null}
                    onChange={(v) => patch({ source: v ?? undefined })}
                    placeholder="Semua channel"
                    searchPlaceholder="Cari channel"
                  />
                </FieldWrapper>
              )}
              {includes("store") && (
                <FieldWrapper label="Toko">
                  <Combobox
                    options={storeOptions}
                    value={value.channel_shop_id ?? null}
                    onChange={(v) => patch({ channel_shop_id: v ?? undefined })}
                    placeholder="Semua toko"
                    searchPlaceholder="Cari toko"
                  />
                </FieldWrapper>
              )}
              {includes("awb") && (
                <FieldWrapper label="No. Resi">
                  <FilterRadioGroup
                    name="awb"
                    value={value.awb}
                    onValueChange={(v) => patch({ awb: v })}
                    options={AWB_OPTIONS}
                  />
                </FieldWrapper>
              )}
              {includes("label_printed") && (
                <FieldWrapper label="Cetak Label">
                  <FilterRadioGroup
                    name="label_printed"
                    value={value.label_printed}
                    onValueChange={(v) => patch({ label_printed: v })}
                    options={LABEL_PRINTED_OPTIONS}
                  />
                </FieldWrapper>
              )}
              {includes("payment") && (
                <FieldWrapper label="Pembayaran">
                  <FilterRadioGroup
                    name="payment"
                    value={value.payment}
                    onValueChange={(v) => patch({ payment: v })}
                    options={PAYMENT_OPTIONS}
                  />
                </FieldWrapper>
              )}
              {includes("courier_type") && (
                <FieldWrapper label="Jenis Kurir">
                  <FilterRadioGroup
                    name="courier_type"
                    value={value.courier_type}
                    onValueChange={(v) => patch({ courier_type: v })}
                    options={COURIER_TYPE_OPTIONS}
                  />
                </FieldWrapper>
              )}
              {includes("shipment_type") && (
                <FieldWrapper label="Tipe Pengiriman">
                  <FilterRadioGroup
                    name="shipment_type"
                    value={value.shipment_type}
                    onValueChange={(v) => patch({ shipment_type: v })}
                    options={SHIPMENT_TYPE_OPTIONS}
                  />
                </FieldWrapper>
              )}
              {includes("status") && statusList.length > 0 && (
                <FieldWrapper label="Status">
                  {statusList.length <= 3 ? (
                    <FilterRadioGroup
                      name="status"
                      value={statusValue ?? undefined}
                      onValueChange={(v) => statusChange(v ?? null)}
                      options={statusList}
                    />
                  ) : (
                    <Combobox
                      options={statusList}
                      value={statusValue}
                      onChange={statusChange}
                      placeholder="Semua status"
                      searchPlaceholder="Cari status"
                    />
                  )}
                </FieldWrapper>
              )}
              {includes("date") && (
                <FieldWrapper label="Tanggal">
                  <DateRangePicker
                    value={
                      {
                        from: parseISODate(value.date_from),
                        to: parseISODate(value.date_to),
                      } as DateRange
                    }
                    onChange={(range) =>
                      patch({
                        date_from: toISODate(range?.from),
                        date_to: toISODate(range?.to),
                      })
                    }
                    placeholder="Pilih rentang tanggal"
                    className="h-9 rounded-full"
                  />
                </FieldWrapper>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
