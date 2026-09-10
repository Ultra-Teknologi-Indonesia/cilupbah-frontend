"use client";

import * as React from "react";
import { PackageCheckIcon, RefreshCwIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  SimplePagination,
  TABLE_PAGE_SIZES,
} from "@/components/ui/simple-pagination";
import {
  FulfillmentFilterBar,
  type FulfillmentFilterField,
  type FulfillmentFilterValue,
} from "@/components/dashboard/proses-pesanan/shared/fulfillment-filter-bar";
import {
  OrderTable,
  type OrderTableExtraColumn,
  type RowSelectability,
} from "@/components/dashboard/proses-pesanan/shared/order-table";
import { FulfillmentBulkActionBar } from "@/components/dashboard/proses-pesanan/shared/fulfillment-bulk-action-bar";
import { AmbilNoResiDialog } from "@/components/dashboard/proses-pesanan/shared/ambil-no-resi-dialog";
import { BuatPengirimanDialog } from "@/components/dashboard/proses-pesanan/shipping/buat-pengiriman-dialog";
import { DocActions } from "@/hooks/proses-pesanan/use-doc-actions";
import type { Order, OrderTab } from "@/types/pesanan/order";
import type { FulfillmentListParams } from "@/types/proses-pesanan/fulfillment";
import { useOrdersByStage } from "@/hooks/proses-pesanan/use-fulfillment";
import { useListState } from "@/hooks/use-list-state";
import { fulfillmentToOrder } from "@/lib/proses-pesanan/order-card-mapper";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/auth/use-permissions";

function shippingLabelSelectability(order: Order): RowSelectability {
  if (!order.shipping_label_supported) {
    return {
      selectable: false,
      reason: order.source
        ? "Kanal ini belum mendukung cetak resi otomatis"
        : "Pesanan manual tanpa kanal",
    };
  }
  return { selectable: true };
}

function shipmentSelectability(order: Order): RowSelectability {
  if (order.is_canceled) {
    return { selectable: false, reason: "Pesanan sudah dibatalkan" };
  }
  if (order.cancel_requested_at) {
    return { selectable: false, reason: "Pesanan sedang meminta pembatalan" };
  }
  return { selectable: true };
}

function isInternalManualOrder(order: Order): boolean {
  const hasChannelIdentity = Boolean(
    order.channel_order_no || order.channel_shop_id || order.commerce_platform,
  );

  return order.is_manual === true && !hasChannelIdentity;
}

function shipmentProviderKey(
  provider: string | null | undefined,
  source: string | null | undefined,
  isInstant: boolean,
): string {
  const normalized = (provider ?? "").trim().toLowerCase();

  if (!isInstant || !source?.toLowerCase().includes("shopee")) {
    return normalized;
  }

  return normalized
    .replace(/same[\s_-]?day|instant|instan/g, "")
    .replace(/shopee[\s_-]*(express|xpress)/g, "spx")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type CardFilterState = {
  shipping_provider: string;
  courier_code: string;
  location_id: string;
  source: string;
  channel_shop_id: string;
  awb: string;
  label_printed: string;
  date_from: string;
  date_to: string;
  payment: string;
  courier_type: string;
  shipment_type: string;
  status: string;
  channel_status: string;
};

const EMPTY_CARD_FILTERS: CardFilterState = {
  shipping_provider: "",
  courier_code: "",
  location_id: "",
  source: "",
  channel_shop_id: "",
  awb: "",
  label_printed: "",
  date_from: "",
  date_to: "",
  payment: "",
  courier_type: "",
  shipment_type: "",
  status: "",
  channel_status: "",
};

export function FulfillmentCardList({
  stage,
  tab = "all",
  emptyTitle = "Belum ada pesanan",
  emptyDescription = "Pesanan akan muncul di sini.",
  filterFields,
  statusOptions,
  channelStatusOptions,
  courierMode,
  excludeTransit,
  extraColumns,
  searchPlaceholder = "Cari no. pesanan…",
  baseParams,
  allowShipmentCreation = false,
}: {
  stage: string;
  tab?: OrderTab;
  emptyTitle?: string;
  emptyDescription?: string;
  filterFields?: FulfillmentFilterField[];
  statusOptions?: { value: string; label: string }[];
  channelStatusOptions?: { value: string; label: string }[];
  courierMode?: "shipping_provider" | "courier_code";
  excludeTransit?: boolean;
  extraColumns?: OrderTableExtraColumn[];
  searchPlaceholder?: string;
  baseParams?: Partial<FulfillmentListParams>;
  allowShipmentCreation?: boolean;
}) {
  const { can } = usePermissions();
  const list = useListState<CardFilterState>(EMPTY_CARD_FILTERS, {
    perPage: 20,
    debounceMs: 350,
    namespace: stage.replace(/[^a-z0-9]+/gi, "_"),
  });

  const params = React.useMemo(
    () => ({
      q: list.debouncedSearch || undefined,
      page: list.page,
      per_page: list.perPage,
      shipping_provider: list.filters.shipping_provider || undefined,
      courier_code: list.filters.courier_code || undefined,
      location_id: list.filters.location_id || undefined,
      source: list.filters.source || undefined,
      channel_shop_id: list.filters.channel_shop_id || undefined,
      awb: (list.filters.awb as "yes" | "no" | "") || undefined,
      label_printed:
        (list.filters.label_printed as "yes" | "no" | "") || undefined,
      date_from: list.filters.date_from || undefined,
      date_to: list.filters.date_to || undefined,
      payment: (list.filters.payment as "cod" | "noncod" | "") || undefined,
      courier_type:
        (list.filters.courier_type as "instant" | "regular" | "") || undefined,
      shipment_type: list.filters.shipment_type || undefined,
      status: list.filters.status || undefined,
      channel_status: list.filters.channel_status || undefined,
      sort_by: list.sorting[0]?.id || undefined,
      sort_dir: list.sorting[0]
        ? list.sorting[0].desc
          ? "desc"
          : "asc"
        : undefined,
      exclude_transit: excludeTransit ? ("1" as const) : undefined,
      ...baseParams,
    }),
    [
      list.debouncedSearch,
      list.page,
      list.perPage,
      list.filters,
      list.sorting,
      excludeTransit,
      baseParams,
    ],
  );

  const { data, isLoading, isFetching, refetch } = useOrdersByStage(
    stage,
    params,
  );
  const orders = React.useMemo(() => data?.items ?? [], [data]);
  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: list.perPage,
    total: 0,
  };

  const mappedOrders = React.useMemo(
    () => orders.map((o) => ({ raw: o, ui: fulfillmentToOrder(o) })),
    [orders],
  );

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [ambilResiOpen, setAmbilResiOpen] = React.useState(false);
  const [resiOrderIds, setResiOrderIds] = React.useState<string[]>([]);
  const [pengirimanOpen, setPengirimanOpen] = React.useState(false);

  const shipmentCreationEnabled =
    allowShipmentCreation &&
    stage === "finish-pack" &&
    can("create-pengiriman");

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset seleksi saat stage/tab berganti
    setSelectedIds(new Set());
  }, [stage, tab]);

  const rowSelectability = shipmentCreationEnabled
    ? shipmentSelectability
    : shippingLabelSelectability;

  const eligibleIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const m of mappedOrders) {
      if (rowSelectability(m.ui).selectable) ids.add(m.ui.id);
    }
    return ids;
  }, [mappedOrders, rowSelectability]);

  const selectedOrders = React.useMemo(
    () => mappedOrders.filter((m) => selectedIds.has(m.ui.id)),
    [mappedOrders, selectedIds],
  );

  const selectedOrderIds = React.useMemo(
    () => selectedOrders.map((m) => m.raw.id),
    [selectedOrders],
  );

  const selectedLabelOrderIds = React.useMemo(
    () =>
      selectedOrders
        .filter((m) => shippingLabelSelectability(m.ui).selectable)
        .map((m) => m.raw.id),
    [selectedOrders],
  );

  const shipmentLocationIds = React.useMemo(
    () =>
      new Set(
        selectedOrders
          .map((m) => m.raw.locationId)
          .filter((id): id is string => !!id),
      ),
    [selectedOrders],
  );

  const hasMissingShipmentLocation = React.useMemo(
    () => selectedOrders.some((m) => !m.raw.locationId),
    [selectedOrders],
  );

  const shipmentProviderKeys = React.useMemo(
    () =>
      new Set(
        selectedOrders.map((m) =>
          shipmentProviderKey(
            m.raw.shippingProvider,
            m.raw.source,
            Boolean(m.ui.is_instant),
          ),
        ),
      ),
    [selectedOrders],
  );

  const selectedShipmentProvider = React.useMemo(
    () =>
      selectedOrders.find((m) => m.raw.shippingProvider?.trim())?.raw
        .shippingProvider ?? null,
    [selectedOrders],
  );

  const hasMixedShipmentTypes = React.useMemo(() => {
    const types = new Set(selectedOrders.map((m) => m.ui.is_instant));
    return types.size > 1;
  }, [selectedOrders]);

  const createShipmentDisabled = React.useMemo(() => {
    if (!shipmentCreationEnabled || selectedOrders.length === 0)
      return undefined;
    const internalCount = selectedOrders.filter((m) =>
      isInternalManualOrder(m.ui),
    ).length;
    if (internalCount > 0 && internalCount < selectedOrders.length) {
      return "Pisahkan pesanan marketplace instant dan internal/manual";
    }
    const marketplaceOrders = selectedOrders.filter(
      (m) => !isInternalManualOrder(m.ui),
    );
    if (
      marketplaceOrders.length > 0 &&
      marketplaceOrders.some((m) => !m.raw.shippingProvider?.trim())
    ) {
      return "Kurir instant belum tersedia pada pesanan";
    }
    if (hasMissingShipmentLocation) {
      return "Lokasi pesanan belum tersedia";
    }
    if (shipmentLocationIds.size > 1) {
      return "Pilih pesanan dari satu lokasi saja";
    }
    if (hasMixedShipmentTypes) {
      return "Pisahkan pesanan Instant dan reguler";
    }
    if (shipmentProviderKeys.size > 1) {
      return "Pilih pesanan dengan kurir yang sama";
    }
    const marketplaceSources = new Set(
      marketplaceOrders.map((m) => (m.raw.source ?? "").trim().toLowerCase()),
    );
    if (marketplaceSources.size > 1) {
      return "Pilih pesanan dari channel yang sama";
    }
    return undefined;
  }, [
    hasMissingShipmentLocation,
    hasMixedShipmentTypes,
    selectedOrders,
    shipmentCreationEnabled,
    shipmentLocationIds.size,
    shipmentProviderKeys.size,
  ]);

  const readyToShipDisabled = React.useMemo(() => {
    if (!shipmentCreationEnabled || selectedOrders.length === 0)
      return undefined;
    return selectedOrders.every((m) => {
      return Boolean(m.ui.shipping_label_supported);
    })
      ? undefined
      : "Siap Kirim hanya tersedia untuk order marketplace";
  }, [selectedOrders, shipmentCreationEnabled]);

  const toggleId = React.useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const allSelected =
    eligibleIds.size > 0 && [...eligibleIds].every((id) => selectedIds.has(id));
  const someSelected =
    !allSelected && [...eligibleIds].some((id) => selectedIds.has(id));

  const toggleAll = React.useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allOn = [...eligibleIds].every((id) => next.has(id));
      if (allOn) {
        for (const id of eligibleIds) next.delete(id);
      } else {
        for (const id of eligibleIds) next.add(id);
      }
      return next;
    });
  }, [eligibleIds]);

  const handleReadyToShip = React.useCallback(() => {
    const ids = mappedOrders
      .filter((m) => selectedIds.has(m.ui.id))
      .map((m) => m.ui.id);
    if (ids.length === 0) return;
    setResiOrderIds(ids);
    setAmbilResiOpen(true);
  }, [mappedOrders, selectedIds]);

  const handlePrintLabel = React.useCallback(() => {
    const ids = selectedLabelOrderIds;
    if (ids.length === 0) return;
    setResiOrderIds(ids);
    setAmbilResiOpen(true);
  }, [selectedLabelOrderIds]);

  const handleCreateShipment = React.useCallback(() => {
    if (selectedOrderIds.length === 0 || createShipmentDisabled) return;
    setPengirimanOpen(true);
  }, [createShipmentDisabled, selectedOrderIds.length]);

  const handlePrintInvoice = React.useCallback(() => {
    const ids = mappedOrders
      .filter((m) => selectedIds.has(m.ui.id))
      .map((m) => m.ui.id);
    if (ids.length === 0) return;
    DocActions.invoice(ids);
  }, [mappedOrders, selectedIds]);

  return (
    <div>
      <FulfillmentFilterBar
        value={list.filters as FulfillmentFilterValue}
        onChange={(v) =>
          list.setFilters({ ...EMPTY_CARD_FILTERS, ...v } as CardFilterState)
        }
        fields={filterFields ?? []}
        statusOptions={statusOptions}
        channelStatusOptions={channelStatusOptions}
        courierMode={courierMode}
        excludeTransit={excludeTransit}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder={searchPlaceholder}
      />
      <div className="flex items-center justify-end gap-3 border-b border-border/40 px-4 py-2 text-sm text-muted-foreground sm:px-5">
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-full p-1.5 transition-colors hover:bg-muted"
          aria-label="Muat ulang"
        >
          <RefreshCwIcon
            className={cn("size-4", isFetching && "animate-spin")}
          />
        </button>
        <span className="flex items-center gap-1.5">
          Total <Badge>{meta.total}</Badge>
        </span>
      </div>

      <div className="px-4 pb-4 sm:px-5">
        {isLoading ? (
          <div className="flex flex-col gap-3 py-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-xl border border-border/60 bg-muted/30"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted/60">
              <PackageCheckIcon className="size-8 text-muted-foreground/70" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">{emptyTitle}</p>
              <p className="text-xs text-muted-foreground">
                {emptyDescription}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-2">
            <div className="mb-2">
              <FulfillmentBulkActionBar
                selectedCount={selectedIds.size}
                onReset={() => setSelectedIds(new Set())}
                onReadyToShip={handleReadyToShip}
                onCreateShipment={
                  shipmentCreationEnabled ? handleCreateShipment : undefined
                }
                onPrintLabel={handlePrintLabel}
                onPrintInvoice={handlePrintInvoice}
                readyToShipDisabled={readyToShipDisabled}
                createShipmentDisabled={createShipmentDisabled}
                printLabelDisabled={
                  selectedLabelOrderIds.length === 0
                    ? "Tidak ada order yang mendukung cetak label"
                    : undefined
                }
              />
            </div>
            <OrderTable
              orders={mappedOrders.map((m) => m.ui)}
              tab={tab}
              variant="sales"
              extraColumns={extraColumns}
              selectable
              selectedIds={selectedIds}
              onToggle={toggleId}
              allSelected={allSelected}
              someSelected={someSelected}
              onToggleAll={toggleAll}
              getRowSelectable={rowSelectability}
              sorting={list.sorting}
              onSortingChange={list.setSorting}
            />
          </div>
        )}
      </div>

      <div className="px-4 pb-4 sm:px-5">
        <SimplePagination
          page={meta.current_page}
          lastPage={meta.last_page}
          onPageChange={list.setPage}
          perPage={list.perPage}
          onPerPageChange={(s) => {
            list.setPerPage(s);
            list.resetPage();
          }}
          pageSizeOptions={TABLE_PAGE_SIZES}
          isFetching={isFetching}
          label="pesanan"
          total={meta.total}
        />
      </div>

      <AmbilNoResiDialog
        open={ambilResiOpen}
        onOpenChange={setAmbilResiOpen}
        orderIds={resiOrderIds}
      />

      {shipmentCreationEnabled && (
        <BuatPengirimanDialog
          open={pengirimanOpen}
          onOpenChange={setPengirimanOpen}
          orderIds={selectedOrderIds}
          locationId={
            shipmentLocationIds.size === 1
              ? Array.from(shipmentLocationIds)[0]
              : null
          }
          locationName={
            shipmentLocationIds.size === 1
              ? selectedOrders[0]?.raw.locationName
              : null
          }
          multiLocation={shipmentLocationIds.size > 1}
          internalOnly={selectedOrders.every((m) =>
            isInternalManualOrder(m.ui),
          )}
          onCreated={() => setSelectedIds(new Set())}
          marketplaceSource={(() => {
            const sources = new Set(
              selectedOrders
                .map((m) => (m.raw.source ?? "").toLowerCase())
                .filter(Boolean),
            );
            return sources.size === 1 ? selectedOrders[0]?.raw.source : null;
          })()}
          shippingProvider={
            shipmentProviderKeys.size === 1
              ? selectedShipmentProvider
              : null
          }
          shippingType={
            hasMixedShipmentTypes ? null : selectedOrders[0]?.raw.shippingType
          }
        />
      )}
    </div>
  );
}
