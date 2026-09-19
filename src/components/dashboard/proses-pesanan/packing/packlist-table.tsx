"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCwIcon, Trash2Icon, ZapIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FulfillmentFilterBar,
  type FulfillmentFilterValue,
} from "@/components/dashboard/proses-pesanan/shared/fulfillment-filter-bar";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import {
  usePacklists,
  usePrefetchPacklistDetail,
  useRevertPacklists,
} from "@/hooks/proses-pesanan/use-fulfillment";
import { type Packlist } from "@/types/proses-pesanan/fulfillment";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { useListState } from "@/hooks/use-list-state";
import { formatDateTime } from "@/lib/format";

import { DeleteOrderDialog } from "../shared/delete-order-dialog";
import { FulfillmentBulkActionBar } from "../shared/fulfillment-bulk-action-bar";
import { UbahPackerDialog } from "./ubah-packer-dialog";
import { AmbilNoResiDialog } from "../shared/ambil-no-resi-dialog";
import { DocActions } from "@/hooks/proses-pesanan/use-doc-actions";
import { Checkbox } from "@/components/ui/checkbox";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiError } from "@/lib/toast";
import { toast } from "@/components/ui/sonner";

const PACKLIST_LABEL_CHANNELS = new Set(["shopee", "tiktok", "lazada"]);

function packlistLabelEligible(p: Packlist): {
  eligible: boolean;
  reason?: string;
} {
  const src = (p.source ?? "").toLowerCase();
  if (!src) return { eligible: false, reason: "Pesanan manual" };
  if (!PACKLIST_LABEL_CHANNELS.has(src))
    return { eligible: false, reason: "Kanal belum didukung" };
  return { eligible: true };
}

type PageFilterState = {
  shipping_provider: string;
  label_printed: string;
  date_from: string;
  date_to: string;
};

const EMPTY_FILTERS: PageFilterState = {
  shipping_provider: "",
  label_printed: "",
  date_from: "",
  date_to: "",
};

export function PacklistTable() {
  const { can } = usePermissions();
  const canViewPacking = can("view-packing");
  const canEditPacking = can("edit-packing");
  const canDeletePackingOrder = can("delete-pesanan");
  const canEditOrder = can("edit-pesanan");
  const canExportShipping = can("export-pengiriman");
  const canExportOrder = can("export-pesanan");
  const router = useRouter();
  const prefetchPacklistDetail = usePrefetchPacklistDetail();
  const list = useListState<PageFilterState>(EMPTY_FILTERS, {
    perPage: 20,
    namespace: "packlist",
    persistPerPage: true,
  });
  const [editPacker, setEditPacker] = React.useState<Packlist | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Packlist | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [revertConfirmOpen, setRevertConfirmOpen] = React.useState(false);
  const [ambilResiOpen, setAmbilResiOpen] = React.useState(false);
  const [resiOrderIds, setResiOrderIds] = React.useState<string[]>([]);
  const revertPacklists = useRevertPacklists();

  const params = React.useMemo(
    () => ({
      q: list.appliedSearch || undefined,
      page: list.page,
      per_page: list.perPage,
      status: "DRAFT,IN_PROGRESS",
      shipping_provider: list.filters.shipping_provider || undefined,
      label_printed:
        (list.filters.label_printed as "yes" | "no" | "") || undefined,
      date_from: list.filters.date_from || undefined,
      date_to: list.filters.date_to || undefined,
      sort_by: list.sorting[0]?.id || undefined,
      sort_dir: list.sorting[0]
        ? list.sorting[0].desc
          ? "desc"
          : "asc"
        : undefined,
    }),
    [list.appliedSearch, list.page, list.perPage, list.filters, list.sorting],
  );
  const { data, isLoading, isFetching, refetch } = usePacklists(params);

  const packlists = React.useMemo(() => data?.items ?? [], [data]);
  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  };

  const prefetchPacklist = React.useCallback(
    (id: string) => {
      router.prefetch(`/dashboard/proses-pesanan/packing/${id}`);
      prefetchPacklistDetail(id);
    },
    [router, prefetchPacklistDetail],
  );

  const eligibleOrderIds = React.useMemo(() => {
    const ids: string[] = [];
    for (const p of packlists) {
      const el = packlistLabelEligible(p);
      if (el.eligible && p.orderId) ids.push(p.orderId);
    }
    return ids;
  }, [packlists]);

  const selectableOrderIds = React.useMemo(
    () =>
      canEditPacking
        ? packlists
            .filter((p) => p.orderId)
            .map((p) => p.orderId as string)
        : eligibleOrderIds,
    [canEditPacking, eligibleOrderIds, packlists],
  );

  const selectedPacklistIds = React.useMemo(
    () =>
      packlists
        .filter((p) => p.orderId && selectedIds.has(p.orderId))
        .map((p) => p.id),
    [packlists, selectedIds],
  );

  const toggleOrder = React.useCallback((orderId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(orderId);
      else next.delete(orderId);
      return next;
    });
  }, []);

  const allSelected =
    selectableOrderIds.length > 0 &&
    selectableOrderIds.every((id) => selectedIds.has(id));
  const someSelected =
    !allSelected && selectableOrderIds.some((id) => selectedIds.has(id));

  const toggleAll = React.useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allOn = selectableOrderIds.every((id) => next.has(id));
      if (allOn) {
        for (const id of selectableOrderIds) next.delete(id);
      } else {
        for (const id of selectableOrderIds) next.add(id);
      }
      return next;
    });
  }, [selectableOrderIds]);

  const handleBulkRevert = React.useCallback(async () => {
    if (selectedPacklistIds.length === 0) return;

    try {
      const result = await revertPacklists.mutateAsync(selectedPacklistIds);
      setSelectedIds(new Set());
      setRevertConfirmOpen(false);

      if (result.failed_count > 0) {
        toast.warning("Sebagian packing tidak dikembalikan", {
          description: `${result.success_count} berhasil, ${result.failed_count} gagal. Pesanan yang sudah masuk pengiriman tetap dipertahankan.`,
        });
      } else {
        toast.success(`${result.success_count} packing dikembalikan ke Belum Mulai.`);
      }
    } catch (error) {
      apiError(error, "Gagal mengembalikan packing.");
    }
  }, [revertPacklists, selectedPacklistIds]);

  const handleReadyToShip = React.useCallback(() => {
    const ids = packlists
      .filter((p) => p.orderId && selectedIds.has(p.orderId))
      .map((p) => p.orderId as string);
    if (ids.length === 0) return;
    setResiOrderIds(ids);
    setAmbilResiOpen(true);
  }, [packlists, selectedIds]);

  const handlePrintLabel = React.useCallback(() => {
    const orderInputs = packlists
      .filter((p) => p.orderId && selectedIds.has(p.orderId))
      .map((p) => ({ id: p.orderId as string, source: p.source ?? null }));
    if (orderInputs.length === 0) return;
    void DocActions.shippingLabel(orderInputs);
  }, [packlists, selectedIds]);

  const handlePrintInvoice = React.useCallback(() => {
    const ids = packlists
      .filter((p) => p.orderId && selectedIds.has(p.orderId))
      .map((p) => p.orderId as string);
    if (ids.length === 0) return;
    DocActions.invoice(ids);
  }, [packlists, selectedIds]);

  const columns = React.useMemo<ColumnDef<Packlist>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            checked={
              allSelected ? true : someSelected ? "indeterminate" : false
            }
            onCheckedChange={toggleAll}
            aria-label="Pilih semua"
            disabled={
              !canEditPacking &&
              !canExportShipping &&
              !canExportOrder &&
              !canEditOrder
            }
          />
        ),
        cell: ({ row }) => {
          const el = packlistLabelEligible(row.original);
          if ((!el.eligible && !canEditPacking) || !row.original.orderId) {
            return (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Checkbox
                        disabled
                        checked={false}
                        aria-label={el.reason}
                      />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {el.reason ?? "Tidak dapat dipilih"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          return (
            <Checkbox
              checked={selectedIds.has(row.original.orderId)}
              onCheckedChange={(v) =>
                toggleOrder(row.original.orderId as string, !!v)
              }
              aria-label="Pilih pesanan"
              disabled={
                !canEditPacking &&
                !canExportShipping &&
                !canExportOrder &&
                !canEditOrder
              }
            />
          );
        },
        enableSorting: false,
      },
      {
        id: "packlist_no",
        accessorFn: (row) => row.packlistNo,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Packing" />
        ),
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={() =>
              router.push(
                `/dashboard/proses-pesanan/packing/${row.original.id}`,
              )
            }
            onMouseEnter={() => prefetchPacklist(row.original.id)}
            onFocus={() => prefetchPacklist(row.original.id)}
          >
            {row.original.packlistNo}
          </button>
        ),
      },
      {
        id: "order_no",
        accessorFn: (row) => row.orderNo,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Pesanan" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                row.original.isInstant &&
                  "font-semibold text-orange-700 dark:text-orange-400",
              )}
            >
              {row.original.orderNo ?? "—"}
            </span>
            {row.original.isInstant && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 rounded border border-orange-500/60 bg-orange-500/15 px-1 py-0.5 text-[9px] font-semibold text-orange-700 dark:text-orange-400">
                      <ZapIcon className="size-2.5 fill-current" />
                      INSTANT
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Pesanan instan — prioritaskan!
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ),
      },
      {
        id: "customer_name",
        accessorFn: (row) => row.customerName,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Pelanggan" />
        ),
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.customerName ?? "—"}
          </span>
        ),
      },
      {
        id: "transaction_date",
        accessorFn: (row) => row.transactionDate,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tgl. Pesanan" />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDateTime(row.original.transactionDate)}
          </span>
        ),
      },
      {
        id: "location_id",
        accessorFn: (row) => row.locationName,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Lokasi" />
        ),
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.locationName ?? "—"}
          </span>
        ),
      },
      {
        id: "packer_id",
        accessorFn: (row) => row.packerName,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Packer" />
        ),
        cell: ({ row }) => <span>{row.original.packerName ?? "—"}</span>,
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => (
          <StatusBadge domain="packlist" status={row.original.status} />
        ),
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <div className="flex justify-end items-center gap-2">
            {canViewPacking && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(
                    `/dashboard/proses-pesanan/packing/${row.original.id}`,
                  )
                }
                onMouseEnter={() => prefetchPacklist(row.original.id)}
              >
                Proses Packing
              </Button>
            )}
            {canEditPacking && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditPacker(row.original)}
              >
                Ubah Packer
              </Button>
            )}
            {canDeletePackingOrder && row.original.orderId && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Hapus Pesanan"
                      onClick={() => setDeleteTarget(row.original)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Hapus Pesanan</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ),
      },
    ],
    [
      canDeletePackingOrder,
      canEditPacking,
      canEditOrder,
      canExportOrder,
      canExportShipping,
      canViewPacking,
      router,
      prefetchPacklist,
      selectedIds,
      allSelected,
      someSelected,
      toggleAll,
      toggleOrder,
    ],
  );

  return (
    <div>
      <FulfillmentFilterBar
        value={list.filters as FulfillmentFilterValue}
        onChange={(v) =>
          list.setFilters({ ...EMPTY_FILTERS, ...v } as PageFilterState)
        }
        fields={["courier", "date", "label_printed"]}
        search={list.search}
        onSearchChange={list.setSearch}
        onSearch={list.applySearch}
        searchPlaceholder="Cari no. packing, pesanan…"
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
        <div className="mb-2">
          <FulfillmentBulkActionBar
            selectedCount={selectedIds.size}
            onReset={() => setSelectedIds(new Set())}
            onReadyToShip={canEditOrder ? handleReadyToShip : undefined}
            onPrintLabel={canExportShipping ? handlePrintLabel : undefined}
            onPrintInvoice={canExportOrder ? handlePrintInvoice : undefined}
            onRevert={canEditPacking ? () => setRevertConfirmOpen(true) : undefined}
          />
        </div>
        <DataTable
          columns={columns}
          data={packlists}
          isLoading={isLoading}
          hideToolbar
          getRowClassName={(row) =>
            row.isInstant
              ? "bg-orange-50/60 dark:bg-orange-950/20 border-l-4 border-l-orange-500"
              : undefined
          }
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
              Tidak ada packlist.
            </div>
          }
        />
      </div>

      {canEditPacking && (
        <UbahPackerDialog
          open={!!editPacker}
          onOpenChange={(o) => !o && setEditPacker(null)}
          packlistId={editPacker?.id ?? null}
          packlistNo={editPacker?.packlistNo ?? null}
          locationId={editPacker?.locationId ?? null}
          currentPackerId={editPacker?.packerId ?? null}
        />
      )}

      {canDeletePackingOrder && (
        <DeleteOrderDialog
          open={!!deleteTarget}
          onOpenChange={(o) => !o && setDeleteTarget(null)}
          orders={
            deleteTarget?.orderId
              ? [{ id: deleteTarget.orderId, no: deleteTarget.orderNo }]
              : []
          }
        />
      )}

      <AmbilNoResiDialog
        open={ambilResiOpen}
        onOpenChange={setAmbilResiOpen}
        orderIds={resiOrderIds}
      />

      {canEditPacking && (
        <ConfirmDialog
          open={revertConfirmOpen}
          onOpenChange={setRevertConfirmOpen}
          title={`Kembalikan ${selectedPacklistIds.length} packing?`}
          description="Packing yang dipilih akan dihapus dari tahap Diproses dan pesanan dikembalikan ke Packing — Belum Mulai. Pesanan yang sudah masuk pengiriman atau sudah dikirim tidak akan diubah."
          confirmLabel="Kembalikan"
          variant="destructive"
          loading={revertPacklists.isPending}
          onConfirm={() => void handleBulkRevert()}
        />
      )}
    </div>
  );
}
