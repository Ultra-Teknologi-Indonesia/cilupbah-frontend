"use client";

import * as React from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2Icon,
  PackageOpenIcon,
  PrinterIcon,
  RefreshCwIcon,
  Trash2Icon,
  TruckIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { Button } from "@/components/ui/button";
import {
  SimplePagination,
  TABLE_PAGE_SIZES,
} from "@/components/ui/simple-pagination";
import { OrderTable } from "@/components/dashboard/proses-pesanan/shared/order-table";
import { AmbilNoResiDialog } from "@/components/dashboard/proses-pesanan/shared/ambil-no-resi-dialog";
import { DeleteOrderDialog } from "@/components/dashboard/proses-pesanan/shared/delete-order-dialog";
import { BulkBuatPicklistConfirmDialog } from "@/components/dashboard/proses-pesanan/picking/bulk-buat-picklist-confirm-dialog";
import {
  FulfillmentFilterBar,
  type FulfillmentFilterValue,
} from "@/components/dashboard/proses-pesanan/shared/fulfillment-filter-bar";
import { UserSelectById } from "@/components/dashboard/shared/user-select-by-id";
import { useMe } from "@/hooks/auth/use-auth";
import { usePermissions } from "@/hooks/auth/use-permissions";
import {
  fulfillmentKeys,
  useCreatePicklist,
  useOrdersByStage,
  usePickers,
} from "@/hooks/proses-pesanan/use-fulfillment";
import { orderKeys } from "@/hooks/pesanan/use-orders";
import { useListState } from "@/hooks/use-list-state";
import { fulfillmentToOrder } from "@/lib/proses-pesanan/order-card-mapper";
import { cn } from "@/lib/utils";

type ReadyFilterState = {
  shipping_provider: string;
  location_id: string;
  source: string;
  channel_shop_id: string;
  awb: string;
  label_printed: string;
  date_from: string;
  date_to: string;
};

const EMPTY_READY_FILTERS: ReadyFilterState = {
  shipping_provider: "",
  location_id: "",
  source: "",
  channel_shop_id: "",
  awb: "",
  label_printed: "",
  date_from: "",
  date_to: "",
};

export function ReadyToProcessCardList() {
  const qc = useQueryClient();
  const list = useListState<ReadyFilterState>(EMPTY_READY_FILTERS, {
    perPage: 20,
    debounceMs: 350,
    namespace: "ready",
  });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pickerId, setPickerId] = React.useState<string>("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [ambilResiOpen, setAmbilResiOpen] = React.useState(false);
  const [resiOrderIds, setResiOrderIds] = React.useState<string[]>([]);

  const handleOpenAmbilResi = React.useCallback(() => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setResiOrderIds(ids);
    setAmbilResiOpen(true);
  }, [selected]);

  const params = React.useMemo(
    () => ({
      q: list.debouncedSearch || undefined,
      shipping_provider: list.filters.shipping_provider || undefined,
      location_id: list.filters.location_id || undefined,
      source: list.filters.source || undefined,
      channel_shop_id: list.filters.channel_shop_id || undefined,
      awb: (list.filters.awb as "yes" | "no" | "") || undefined,
      label_printed:
        (list.filters.label_printed as "yes" | "no" | "") || undefined,
      date_from: list.filters.date_from || undefined,
      date_to: list.filters.date_to || undefined,
      exclude_transit: "1" as const,
      page: list.page,
      per_page: list.perPage,
      sort_by: list.sorting[0]?.id || undefined,
      sort_dir: list.sorting[0]
        ? list.sorting[0].desc
          ? "desc"
          : "asc"
        : undefined,
    }),
    [list.debouncedSearch, list.filters, list.page, list.perPage, list.sorting],
  );

  const { data, isLoading, isFetching, refetch } = useOrdersByStage(
    "ready-to-process",
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

  const pageIds = orders.map((o) => o.id);
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = pageIds.some((id) => selected.has(id));

  const selectedOrders = orders.filter((o) => selected.has(o.id));
  const distinctLocations = Array.from(
    new Set(selectedOrders.map((o) => o.locationId).filter(Boolean)),
  ) as string[];
  const locationId = distinctLocations[0] ?? null;
  const multiLocation = distinctLocations.length > 1;
  const locationName = selectedOrders[0]?.locationName ?? null;

  const pickers = usePickers(locationId ?? undefined, undefined, !!locationId);
  const createPicklist = useCreatePicklist();
  const { data: me } = useMe();
  const { can } = usePermissions();
  const canDeleteOrder = can("delete-pesanan");
  const pickerOptions = React.useMemo(
    () =>
      (pickers.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
      })),
    [pickers.data],
  );
  const selectedPicker = pickers.data?.find((p) => p.id === pickerId) ?? null;

  const prevLocationRef = React.useRef<string | null>(locationId);
  if (prevLocationRef.current !== locationId) {
    prevLocationRef.current = locationId;
    if (pickerId !== "") setPickerId("");
  }

  const clearSelection = () => {
    setSelected(new Set());
    setPickerId("");
  };

  const toggleAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      setSelected(new Set(pageIds));
    }
  };

  const toggleOne = (id: string, v: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (v) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleCreatePicklist = async () => {
    if (!locationId) {
      toast.error("Lokasi pesanan tidak ditemukan");
      return;
    }
    if (multiLocation) {
      toast.error("Pesanan terpilih berasal dari lokasi berbeda");
      return;
    }
    if (!pickerId) {
      toast.error("Pilih picker terlebih dahulu");
      return;
    }
    try {
      const res = await createPicklist.mutateAsync({
        order_ids: Array.from(selected),
        location_id: locationId,
        picker_id: pickerId,
      });
      const no = res?.picklistNo ?? "";
      toast.success(
        no ? `Picklist ${no} berhasil dibuat` : "Picklist berhasil dibuat",
      );
      clearSelection();
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: fulfillmentKeys.board });
      qc.invalidateQueries({ queryKey: orderKeys.all });
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Gagal membuat picklist";
      toast.error(msg);
    }
  };

  return (
    <div>
      <FulfillmentFilterBar
        value={list.filters as FulfillmentFilterValue}
        onChange={(v) =>
          list.setFilters({ ...EMPTY_READY_FILTERS, ...v } as ReadyFilterState)
        }
        courierStage="ready-to-process"
        fields={[
          "courier",
          "location",
          "channel",
          "store",
          "awb",
          "label_printed",
          "date",
        ]}
        excludeTransit
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Cari no. pesanan…"
      />

      <div className="flex flex-wrap items-center gap-4 border-b border-border/40 px-4 py-2 sm:px-5">
        <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
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
              <PackageOpenIcon className="size-8 text-muted-foreground/70" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">
                Belum ada pesanan siap dipick
              </p>
              <p className="text-xs text-muted-foreground">
                Pesanan akan muncul di sini setelah klik &quot;Proses
                Pesanan&quot; di halaman Pesanan.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/pesanan">Buka Halaman Pesanan</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            <BulkActionBar
              count={selected.size}
              onClear={clearSelection}
              label={(n) => `${n} pesanan dipilih`}
              message={
                multiLocation ? (
                  <span className="text-xs text-destructive">
                    Pesanan dari lokasi berbeda — pilih dari satu lokasi saja
                  </span>
                ) : null
              }
              actions={
                <>
                    {!multiLocation && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            Picker
                          </span>
                          <UserSelectById
                            value={pickerId}
                            onChange={(id) => setPickerId(id)}
                            options={pickerOptions}
                            isLoading={pickers.isLoading}
                            currentUserId={me?.id}
                            disabled={!locationId || pickers.isLoading}
                            placeholder={
                              pickers.isLoading
                                ? "Memuat…"
                                : "Pilih picker…"
                            }
                            emptyText="Tidak ada picker di lokasi ini."
                            className="w-72"
                          />
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setConfirmOpen(true)}
                          disabled={createPicklist.isPending || !pickerId}
                        >
                          {createPicklist.isPending && (
                            <Loader2Icon className="animate-spin" />
                          )}
                          Buat Picklist
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-full gap-1.5"
                          onClick={handleOpenAmbilResi}
                        >
                          <TruckIcon className="size-4" />
                          Siap Kirim
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full gap-1.5"
                          onClick={handleOpenAmbilResi}
                        >
                          <PrinterIcon className="size-4" />
                          Cetak Label
                        </Button>
                      </>
                    )}
                    {canDeleteOrder && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full gap-1.5 text-destructive hover:text-destructive"
                        onClick={() => setDeleteOpen(true)}
                      >
                        <Trash2Icon className="size-4" />
                        Hapus
                      </Button>
                    )}
                </>
              }
            />

            <OrderTable
              orders={mappedOrders.map((m) => m.ui)}
              tab="all"
              variant="outbound-ready"
              selectable
              selectedIds={selected}
              onToggle={toggleOne}
              allSelected={allSelected}
              someSelected={someSelected}
              onToggleAll={toggleAll}
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

      <BulkBuatPicklistConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        selectedOrders={selectedOrders}
        pickerName={selectedPicker?.name ?? null}
        pickerEmail={selectedPicker?.email ?? null}
        locationName={locationName}
        loading={createPicklist.isPending}
        onConfirm={handleCreatePicklist}
      />

      {canDeleteOrder && (
        <DeleteOrderDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          orders={selectedOrders.map((order) => ({
            id: order.id,
            no: order.salesorderNo,
          }))}
          outcomeDescription="Pilih alasan penghapusan. Pesanan akan dipindahkan ke Gagal Picking agar dapat ditindaklanjuti."
          outcomeLabel="dipindahkan ke Gagal Picking"
          bulkSuccessMessage={(count) =>
            `${count} pesanan dipindahkan ke Gagal Picking.`
          }
          onDeleted={clearSelection}
        />
      )}

      <AmbilNoResiDialog
        open={ambilResiOpen}
        onOpenChange={setAmbilResiOpen}
        orderIds={resiOrderIds}
      />
    </div>
  );
}
