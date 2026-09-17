"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2Icon,
  RefreshCwIcon,
  PrinterIcon,
  TruckIcon,
  XCircleIcon,
  ZapIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDateTime } from "@/lib/format";
import {
  FulfillmentFilterBar,
  type FulfillmentFilterValue,
} from "@/components/dashboard/proses-pesanan/shared/fulfillment-filter-bar";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import {
  useCancelShipment,
  useHandOverShipment,
  useShipments,
} from "@/hooks/proses-pesanan/use-fulfillment";
import { usePermissions } from "@/hooks/auth/use-permissions";
import type {
  Shipment,
} from "@/types/proses-pesanan/fulfillment";

// eslint-disable-next-line no-restricted-imports
import { OutboundService } from "@/services/proses-pesanan/outbound.service";
import { ShipmentDriverBadge } from "@/components/dashboard/proses-pesanan/shared/driver-call-indicator";
import { useListState } from "@/hooks/use-list-state";
import { apiError } from "@/lib/toast";

import { DocActions } from "../picking/doc-actions";
import { PanggilDriverBulkDialog } from "./panggil-driver-bulk-dialog";

type PageFilterState = {
  status: string;
  courier_code: string;
  shipment_type: string;
  date_from: string;
  date_to: string;
};

const EMPTY_FILTERS: PageFilterState = {
  status: "",
  courier_code: "",
  shipment_type: "",
  date_from: "",
  date_to: "",
};

function formatWeight(gram: number): string {
  if (!gram) return "—";
  const kg = gram / 1000;
  return kg < 1
    ? `${gram} g`
    : `${kg.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kg`;
}

function instantSlaClass(row: Shipment): string | undefined {
  if (!row.hasInstant || !row.createdAt) return undefined;
  const ageMs = Date.now() - new Date(row.createdAt).getTime();
  const ageH = ageMs / 3_600_000;
  if (ageH > 1.5)
    return "bg-red-50/60 dark:bg-red-950/20 border-l-4 border-l-red-500";
  if (ageH > 1)
    return "bg-yellow-50/60 dark:bg-yellow-950/20 border-l-4 border-l-yellow-500";
  return "bg-emerald-50/60 dark:bg-emerald-950/20 border-l-4 border-l-emerald-500";
}

const SHIPMENT_STATUS_OPTIONS = [
  { value: "SCHEDULED", label: "Menunggu" },
  { value: "HANDED_OVER,IN_TRANSIT,DELIVERED", label: "Terkirim" },
];

export function ShipmentTable() {
  const list = useListState<PageFilterState>(EMPTY_FILTERS, {
    perPage: 20,
    debounceMs: 350,
    namespace: "shipment",
  });
  const [cancelTarget, setCancelTarget] = React.useState<Shipment | null>(null);
  const [finishTarget, setFinishTarget] = React.useState<Shipment | null>(null);
  const [driverCallTargets, setDriverCallTargets] = React.useState<
    Shipment[] | null
  >(null);
  const [printLabelPending, setPrintLabelPending] = React.useState(false);

  const handleBulkPrintLabel = React.useCallback(
    async (selectedShipments: Shipment[]) => {
      if (selectedShipments.length === 0) return;
      setPrintLabelPending(true);
      const loadingId = toast.loading("Mengumpulkan pesanan dari pengiriman…");
      try {
        const shipmentOrders = await OutboundService.shipmentOrdersBulk(
          selectedShipments.map((shipment) => shipment.id),
        );
        const seen = new Set<string>();
        const orderInputs: { id: string; source: string | null }[] = [];
        for (const order of shipmentOrders) {
          if (seen.has(order.order_id)) continue;
          if ((order.source ?? "").toLowerCase() === "woocommerce") continue;
          seen.add(order.order_id);
          orderInputs.push({ id: order.order_id, source: order.source ?? null });
        }
        toast.dismiss(loadingId);
        if (orderInputs.length === 0) {
          toast.error(
            "Tidak ada pesanan yang mendukung cetak label pada pilihan.",
          );
          return;
        }
        await DocActions.shippingLabel(orderInputs);
      } catch (err) {
        toast.dismiss(loadingId);
        apiError(err, "Gagal menyiapkan cetak label.");
      } finally {
        setPrintLabelPending(false);
      }
    },
    [],
  );

  const params = React.useMemo(
    () => ({
      status: list.filters.status || "SCHEDULED",
      q: list.debouncedSearch || undefined,
      page: list.page,
      per_page: list.perPage,
      courier_code: list.filters.courier_code || undefined,
      shipment_type: list.filters.shipment_type || undefined,
      date_from: list.filters.date_from || undefined,
      date_to: list.filters.date_to || undefined,
      sort_by: list.sorting[0]?.id || undefined,
      sort_dir: list.sorting[0]
        ? list.sorting[0].desc
          ? "desc"
          : "asc"
        : undefined,
    }),
    [list.debouncedSearch, list.page, list.perPage, list.filters, list.sorting],
  );
  const { data, isLoading, isFetching, refetch } = useShipments(params);
  const cancel = useCancelShipment();
  const handOver = useHandOverShipment();
  const { can } = usePermissions();

  const shipments = data?.items ?? [];
  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  };

  const onCancel = (s: Shipment) => {
    setCancelTarget(s);
  };

  const handleCancelConfirm = () => {
    if (!cancelTarget) return;
    cancel.mutate(cancelTarget.id, {
      onSuccess: () => toast.success(`${cancelTarget.shipmentNo} dibatalkan.`),
      onError: (e) => apiError(e, "Gagal membatalkan pengiriman."),
      onSettled: () => setCancelTarget(null),
    });
  };

  const handleFinishConfirm = () => {
    if (!finishTarget) return;
    handOver.mutate(finishTarget.id, {
      onSuccess: () =>
        toast.success(`Berhasil menyelesaikan ${finishTarget.shipmentNo}.`),
      onError: (e) => apiError(e, "Gagal menyelesaikan pengiriman."),
      onSettled: () => setFinishTarget(null),
    });
  };

  const columns = React.useMemo<ColumnDef<Shipment>[]>(
    () => [
      {
        id: "shipment_no",
        accessorFn: (row) => row.shipmentNo,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Pengiriman" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Link
              href={`/dashboard/proses-pesanan/shipping/${row.original.id}`}
              className={cn(
                "font-medium hover:underline",
                row.original.hasInstant
                  ? "text-orange-700 dark:text-orange-400"
                  : "text-primary",
              )}
            >
              {row.original.shipmentNo}
            </Link>
            {row.original.hasInstant && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 rounded-xl border border-orange-500/60 bg-orange-500/15 px-1 py-0.5 text-[9px] font-semibold text-orange-700 dark:text-orange-400">
                      <ZapIcon className="size-2.5 fill-current" />
                      INSTANT
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Manifest ini berisi pesanan instan — prioritaskan!
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ),
      },
      {
        id: "courier_code",
        accessorFn: (row) => row.courierName,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Kurir" />
        ),
        cell: ({ row }) => <span>{row.original.courierName ?? "—"}</span>,
      },
      {
        id: "shipment_type",
        accessorFn: (row) => row.shipmentType,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tipe" />
        ),
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.shipmentType ?? "—"}
          </span>
        ),
      },
      {
        id: "orders_count",
        accessorFn: (row) => row.ordersCount,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Jml. Pesanan" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.ordersCount}</span>
        ),
      },
      {
        id: "total_weight_gram",
        accessorFn: (row) => row.totalWeightGram,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Total Berat" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatWeight(row.original.totalWeightGram)}
          </span>
        ),
      },
      {
        id: "created_at",
        accessorFn: (row) => row.createdAt,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Dibuat" />
        ),
        cell: ({ row }) => (
          <span className="text-foreground text-xs">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "driver",
        header: "Driver",
        cell: ({ row }) => (
          <ShipmentDriverBadge
            status={row.original.driverCallStatus}
            driverName={row.original.driverName}
            driverPhone={row.original.driverPhone}
            calledAt={row.original.driverCalledAt}
          />
        ),
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <div className="flex justify-end items-center gap-2">
            {row.original.status === "SCHEDULED" && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/dashboard/proses-pesanan/shipping/masukkan-ke-pengiriman?shipmentId=${encodeURIComponent(row.original.id)}&from=${encodeURIComponent("/dashboard/proses-pesanan/shipping")}`}
                >
                  <TruckIcon className="size-3.5" />
                  Masukkan ke Pengiriman
                </Link>
              </Button>
            )}
            {row.original.status === "SCHEDULED" && can("edit-pengiriman") && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={row.original.ordersCount === 0}
                        onClick={() => setFinishTarget(row.original)}
                      >
                        <CheckCircle2Icon className="size-3.5" />
                        Selesaikan
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {row.original.ordersCount === 0
                      ? "Belum ada pesanan dalam pengiriman ini."
                      : "Tutup manifest dan tandai pesanannya terkirim."}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => DocActions.manifest(row.original.id)}
            >
              <PrinterIcon className="size-3.5" />
              Cetak Manifest
            </Button>
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Batalkan"
                    onClick={() => onCancel(row.original)}
                  >
                    <XCircleIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Batalkan</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ),
      },
    ],
    [can],
  );

  return (
    <div>
      <FulfillmentFilterBar
        value={list.filters as FulfillmentFilterValue}
        onChange={(v) =>
          list.setFilters({ ...EMPTY_FILTERS, ...v } as PageFilterState)
        }
        fields={["courier", "shipment_type", "status", "date"]}
        courierMode="courier_code"
        statusOptions={SHIPMENT_STATUS_OPTIONS}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Cari no. pengiriman…"
      />
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-2 text-sm text-muted-foreground sm:px-5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              list.setFilters({
                ...(list.filters as PageFilterState),
                shipment_type: "",
              } as PageFilterState)
            }
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              !list.filters.shipment_type
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() =>
              list.setFilters({
                ...(list.filters as PageFilterState),
                shipment_type: "INSTANT",
              } as PageFilterState)
            }
            className={cn(
              "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              list.filters.shipment_type === "INSTANT"
                ? "border-orange-500 bg-orange-500 text-white"
                : "border-border bg-background hover:bg-muted",
            )}
            aria-label="Filter Kurir Instan"
          >
            <ZapIcon className="size-3" />
            Kurir Instan
          </button>
        </div>
        <div className="flex items-center gap-3">
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
        <DataTable
          columns={columns}
          data={shipments}
          isLoading={isLoading}
          hideToolbar
          getRowId={(row) => row.id}
          enableRowSelection
          bulkActions={(selected) => {
            const instantEligible = selected.filter((s) => s.hasInstant);
            return (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={selected.length === 0 || printLabelPending}
                  onClick={() => handleBulkPrintLabel(selected)}
                >
                  <PrinterIcon className="size-4" />
                  Cetak Label ({selected.length})
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  className="rounded-full"
                  disabled={instantEligible.length === 0}
                  onClick={() => setDriverCallTargets(instantEligible)}
                >
                  <TruckIcon className="size-3.5" />
                  Panggil Driver ({instantEligible.length})
                </Button>
              </>
            );
          }}
          getRowClassName={(row) => instantSlaClass(row)}
          manualPagination
          manualSorting
          sorting={list.sorting}
          onSortingChange={list.setSorting}
          pagination={list.pagination}
          rowCount={meta.total}
          onPaginationChange={list.onPaginationChange}
          tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
          emptyState={
            <div className="py-16 text-center text-sm text-muted-foreground">
              Tidak ada jadwal pengiriman.
            </div>
          }
        />
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => {
          if (!o) setCancelTarget(null);
        }}
        title="Batalkan Pengiriman"
        description={`Batalkan pengiriman ${cancelTarget?.shipmentNo ?? ""}?`}
        confirmLabel="Batalkan"
        variant="destructive"
        loading={cancel.isPending}
        onConfirm={handleCancelConfirm}
      />

      <ConfirmDialog
        open={!!finishTarget}
        onOpenChange={(o) => {
          if (!o) setFinishTarget(null);
        }}
        title="Selesaikan Pengiriman"
        description={`Tutup manifest ${finishTarget?.shipmentNo ?? ""} berisi ${finishTarget?.ordersCount ?? 0} pesanan? Seluruh pesanan di dalamnya ditandai terkirim. Setelah ditutup, pengiriman ini tidak bisa dibatalkan dan tidak bisa ditambah resi lagi.`}
        confirmLabel="Selesaikan"
        loading={handOver.isPending}
        onConfirm={handleFinishConfirm}
      />

      <PanggilDriverBulkDialog
        open={!!driverCallTargets}
        onOpenChange={(o) => {
          if (!o) setDriverCallTargets(null);
        }}
        shipments={driverCallTargets ?? []}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
