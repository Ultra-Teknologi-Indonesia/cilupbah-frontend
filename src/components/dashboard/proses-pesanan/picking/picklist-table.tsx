"use client";

import * as React from "react";
import Link from "next/link";
import {
  ClipboardListIcon,
  PrinterIcon,
  RefreshCwIcon,
  Trash2Icon,
  UserCogIcon,
  ZapIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatDateTime, formatPickingDuration } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  FulfillmentFilterBar,
  type FulfillmentFilterValue,
} from "@/components/dashboard/proses-pesanan/shared/fulfillment-filter-bar";
import type { ColumnDef } from "@tanstack/react-table";
import { AssignedBadge } from "@/components/shared/channel-lock";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  usePicklists,
  useBulkRevertPicklists,
  usePrefetchPicklistDetail,
  useRevertPicklist,
} from "@/hooks/proses-pesanan/use-fulfillment";
import { useListState } from "@/hooks/use-list-state";
import { type Picklist } from "@/types/proses-pesanan/fulfillment";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { apiError } from "@/lib/toast";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { DocActions } from "@/hooks/proses-pesanan/use-doc-actions";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { BulkUbahPickerDialog } from "./bulk-ubah-picker-dialog";

type PicklistFilterState = {
  status: string;
  shipping_provider: string;
  location_id: string;
  source: string;
  channel_shop_id: string;
  label_printed: string;
  date_from: string;
  date_to: string;
  zone_id: string;
};

const EMPTY_PICKLIST_FILTERS: PicklistFilterState = {
  status: "",
  shipping_provider: "",
  location_id: "",
  source: "",
  channel_shop_id: "",
  label_printed: "",
  date_from: "",
  date_to: "",
  zone_id: "",
};

import { UbahPickerDialog } from "./ubah-picker-dialog";

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "IN_PROGRESS", label: "Diproses" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "FAILED", label: "Gagal" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

function DurationCell({
  startedAt,
  completedAt,
  status,
}: {
  startedAt: string | null;
  completedAt: string | null;
  status: Picklist["status"];
}) {
  const [, forceTick] = React.useReducer((c: number) => c + 1, 0);

  React.useEffect(() => {
    if (status !== "IN_PROGRESS" || completedAt) return;
    const t = setInterval(forceTick, 60_000);
    return () => clearInterval(t);
  }, [status, completedAt]);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="tabular-nums text-foreground">
            {formatPickingDuration(startedAt, completedAt, status)}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Mulai: {formatDateTime(startedAt)}
          <br />
          Selesai:{" "}
          {completedAt ? formatDateTime(completedAt) : "Sedang berjalan"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ProgressCell({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="min-w-[140px]">
      <div className="mb-1 text-xs tabular-nums text-muted-foreground">
        {done} / {total}
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 100 ? "bg-success" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PicklistTable() {
  const { can } = usePermissions();
  const canEditPicking = can("edit-picking");
  const canRevertPicking = can("edit-picking");
  const canExportPicking = can("export-picking");
  const prefetchPicklist = usePrefetchPicklistDetail();
  const list = useListState<PicklistFilterState>(EMPTY_PICKLIST_FILTERS, {
    perPage: 20,
    debounceMs: 350,
    namespace: "picklist",
  });
  const [editPicker, setEditPicker] = React.useState<Picklist | null>(null);
  const [revertTarget, setRevertTarget] = React.useState<Picklist | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkPickerOpen, setBulkPickerOpen] = React.useState(false);
  const [bulkRevertOpen, setBulkRevertOpen] = React.useState(false);
  const revertPicklist = useRevertPicklist();
  const bulkRevertPicklists = useBulkRevertPicklists();

  const params = React.useMemo(
    () => ({
      q: list.debouncedSearch || undefined,
      status: list.filters.status || undefined,
      shipping_provider: list.filters.shipping_provider || undefined,
      location_id: list.filters.location_id || undefined,
      source: list.filters.source || undefined,
      channel_shop_id: list.filters.channel_shop_id || undefined,
      label_printed:
        (list.filters.label_printed as "yes" | "no" | "") || undefined,
      date_from: list.filters.date_from || undefined,
      date_to: list.filters.date_to || undefined,
      zone_id: list.filters.zone_id || undefined,
      sort_by: list.sorting[0]?.id || undefined,
      sort_dir: list.sorting[0]
        ? list.sorting[0].desc
          ? "desc"
          : "asc"
        : undefined,
      page: list.page,
      per_page: list.perPage,
    }),
    [list.debouncedSearch, list.filters, list.page, list.perPage, list.sorting],
  );
  const { data, isLoading, isFetching, refetch } = usePicklists(params);

  const picklists = React.useMemo(() => data?.items ?? [], [data]);

  const selectablePicklistIds = React.useMemo(
    () =>
      picklists
        .filter(
          (picklist) =>
            picklist.status === "DRAFT" || picklist.status === "IN_PROGRESS",
        )
        .map((picklist) => picklist.id),
    [picklists],
  );

  const selectedPicklists = React.useMemo(
    () => picklists.filter((picklist) => selectedIds.has(picklist.id)),
    [picklists, selectedIds],
  );

  const selectedLocationIds = React.useMemo(
    () => new Set(selectedPicklists.map((picklist) => picklist.locationId)),
    [selectedPicklists],
  );

  const bulkPickerLocationId =
    selectedLocationIds.size === 1 ? selectedPicklists[0]?.locationId ?? null : null;
  const hasMultipleLocations = selectedLocationIds.size > 1;

  const allSelected =
    selectablePicklistIds.length > 0 &&
    selectablePicklistIds.every((id) => selectedIds.has(id));
  const someSelected =
    !allSelected && selectablePicklistIds.some((id) => selectedIds.has(id));

  const togglePicklist = React.useCallback((id: string, checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAll = React.useCallback(() => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      const shouldClear = selectablePicklistIds.every((id) => next.has(id));
      if (shouldClear) {
        selectablePicklistIds.forEach((id) => next.delete(id));
      } else {
        selectablePicklistIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [selectablePicklistIds]);

  const handleBulkRevert = async () => {
    if (selectedPicklists.length === 0) return;

    try {
      const result = await bulkRevertPicklists.mutateAsync(
        selectedPicklists.map((picklist) => picklist.id),
      );
      setSelectedIds(new Set());
      setBulkRevertOpen(false);
      if (result.failed_count > 0) {
        toast.warning("Sebagian picklist tidak dimundurkan", {
          description: `${result.success_count} berhasil, ${result.failed_count} gagal.`,
        });
      } else {
        toast.success(`${result.success_count} picklist dimundurkan ke Belum Mulai.`);
      }
    } catch (error) {
      apiError(error, "Gagal memundurkan picklist.");
    }
  };

  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  };

  const columns = React.useMemo<ColumnDef<Picklist>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={toggleAll}
            aria-label="Pilih semua picklist"
            disabled={!canEditPicking && !canExportPicking}
          />
        ),
        cell: ({ row }) => {
          const selectable =
            row.original.status === "DRAFT" ||
            row.original.status === "IN_PROGRESS";
          if (!selectable) {
            return (
              <Checkbox
                checked={false}
                disabled
                aria-label="Picklist tidak dapat dipilih"
              />
            );
          }

          return (
            <Checkbox
              checked={selectedIds.has(row.original.id)}
              onCheckedChange={(value) =>
                togglePicklist(row.original.id, !!value)
              }
              aria-label={`Pilih ${row.original.picklistNo}`}
              disabled={!canEditPicking && !canExportPicking}
            />
          );
        },
        enableSorting: false,
      },
      {
        id: "picklist_no",
        accessorFn: (row) => row.picklistNo,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Picklist" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Link
              href={`/dashboard/proses-pesanan/picking/proses/${row.original.id}`}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={() => prefetchPicklist(row.original.id)}
              onFocus={() => prefetchPicklist(row.original.id)}
              className={cn(
                "cursor-pointer font-medium hover:underline",
                row.original.hasInstant ? "text-warning" : "text-primary",
              )}
            >
              {row.original.picklistNo}
            </Link>
            {row.original.hasInstant && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 rounded border border-warning/60 bg-warning/15 px-1 py-0.5 text-xs font-semibold text-warning">
                      <ZapIcon className="size-2.5 fill-current" />
                      INSTANT
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Picklist ini berisi pesanan instan — prioritaskan!
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
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
        id: "picker_id",
        accessorFn: (row) => row.pickerName,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Sedang di" />
        ),
        cell: ({ row }) => (
          <AssignedBadge
            assignedToName={row.original.pickerName ?? null}
            isUnlockedOnce={row.original.completedAt != null}
          />
        ),
      },
      {
        accessorKey: "itemsCount",
        header: "Total Item",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.itemsCount}</span>
        ),
      },
      {
        id: "progress",
        header: "Progress",
        cell: ({ row }) => (
          <ProgressCell
            done={row.original.qtyPicked}
            total={row.original.qtyOrdered}
          />
        ),
      },
      {
        id: "duration",
        header: "Durasi",
        cell: ({ row }) => (
          <DurationCell
            startedAt={row.original.startedAt}
            completedAt={row.original.completedAt}
            status={row.original.status}
          />
        ),
      },
      {
        id: "createdAt",
        header: "Dibuat",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => (
          <StatusBadge domain="picklist" status={row.original.status} />
        ),
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            {canExportPicking && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Cetak Picklist"
                    >
                      <Link
                        href={`/dashboard/document-preview/picklist/${row.original.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <PrinterIcon className="size-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Pratinjau & Cetak Picklist</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {canEditPicking && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Ubah Picker"
                      onClick={() => setEditPicker(row.original)}
                    >
                      <UserCogIcon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ubah Picker</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {canRevertPicking && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Hapus Picklist"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setRevertTarget(row.original)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Hapus Picklist (kembalikan semua pesanan ke belum dipick)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ),
      },
    ],
    [
      allSelected,
      canEditPicking,
      canExportPicking,
      canRevertPicking,
      prefetchPicklist,
      selectedIds,
      someSelected,
      toggleAll,
      togglePicklist,
    ],
  );

  const handleRevertConfirm = () => {
    if (!revertTarget) return;
    revertPicklist.mutate(revertTarget.id, {
      onSuccess: () => {
        toast.success(
          `${revertTarget.picklistNo} dihapus, pesanan kembali ke belum dipick.`,
        );
        setRevertTarget(null);
      },
      onError: (e) => apiError(e, "Gagal menghapus picklist."),
    });
  };

  return (
    <div>
      <FulfillmentFilterBar
        value={list.filters as FulfillmentFilterValue}
        onChange={(v) =>
          list.setFilters({
            ...EMPTY_PICKLIST_FILTERS,
            ...v,
          } as PicklistFilterState)
        }
        fields={[
          "status",
          "courier",
          "location",
          "channel",
          "store",
          "label_printed",
          "date",
          "zone",
        ]}
        statusOptions={STATUS_OPTIONS}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Cari no. picklist, pesanan, picker…"
      />
      <div className="flex flex-wrap items-center justify-end gap-3 border-b border-border/40 px-4 py-2 text-sm text-muted-foreground sm:px-5">
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
        <BulkActionBar
          count={selectedIds.size}
          onClear={() => setSelectedIds(new Set())}
          label={(count) => `${count} picklist dipilih`}
          message={
            hasMultipleLocations ? (
              <span className="text-xs text-destructive">
                Ubah picker hanya bisa untuk satu lokasi sekaligus.
              </span>
            ) : null
          }
          actions={
            <>
              {canEditPicking && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setBulkPickerOpen(true)}
                  disabled={hasMultipleLocations || selectedPicklists.length === 0}
                >
                  <UserCogIcon className="size-4" />
                  Ubah Picker
                </Button>
              )}
              {canExportPicking && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void DocActions.pickListByPicklistIds(
                      selectedPicklists.map((picklist) => picklist.id),
                    )
                  }
                  disabled={selectedPicklists.length === 0}
                >
                  <PrinterIcon className="size-4" />
                  Cetak Picklist
                </Button>
              )}
              {canEditPicking && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkRevertOpen(true)}
                  disabled={selectedPicklists.length === 0}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                  Mundurkan
                </Button>
              )}
            </>
          }
        />
        <DataTable
          columns={columns}
          data={picklists}
          isLoading={isLoading}
          hideToolbar
          manualPagination
          manualSorting
          sorting={list.sorting}
          onSortingChange={list.setSorting}
          pagination={{
            pageIndex: meta.current_page - 1,
            pageSize: meta.per_page,
          }}
          rowCount={meta.total}
          onPaginationChange={list.onPaginationChange}
          tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
          emptyState={
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-muted/60">
                <ClipboardListIcon className="size-8 text-muted-foreground/70" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">Belum ada picklist</p>
                <p className="text-xs text-muted-foreground">
                  Buat picklist dari tab &quot;Belum Mulai&quot; untuk memulai
                  proses picking.
                </p>
              </div>
            </div>
          }
        />
      </div>

      {canEditPicking && (
        <UbahPickerDialog
          open={!!editPicker}
          onOpenChange={(o) => !o && setEditPicker(null)}
          picklistId={editPicker?.id ?? null}
          picklistNo={editPicker?.picklistNo ?? null}
          locationId={editPicker?.locationId ?? null}
          currentPickerId={editPicker?.pickerId ?? null}
        />
      )}

      {canRevertPicking && (
        <ConfirmDialog
          open={!!revertTarget}
          onOpenChange={(o) => {
            if (!o) setRevertTarget(null);
          }}
          title="Hapus Picklist?"
          description={`Picklist ${revertTarget?.picklistNo ?? ""} berisi ${revertTarget?.itemsCount ?? 0} item dari beberapa pesanan. Menghapusnya akan mengembalikan SEMUA pesanan anggota ke antrian belum dipick — stok yang sudah di-pick dikembalikan ke rak asal. Pesanan tidak hilang, hanya kembali ke tahap sebelumnya.`}
          confirmLabel="Hapus Picklist"
          variant="destructive"
          loading={revertPicklist.isPending}
          onConfirm={handleRevertConfirm}
        />
      )}

      {canEditPicking && (
        <BulkUbahPickerDialog
          open={bulkPickerOpen}
          onOpenChange={setBulkPickerOpen}
          picklistIds={selectedPicklists.map((picklist) => picklist.id)}
          locationId={bulkPickerLocationId}
        />
      )}

      {canEditPicking && (
        <ConfirmDialog
          open={bulkRevertOpen}
          onOpenChange={setBulkRevertOpen}
          title={`Mundurkan ${selectedPicklists.length} picklist?`}
          description="Picklist yang dipilih akan dihapus dan semua pesanan di dalamnya dikembalikan ke tahap Pengambilan — Belum Mulai. Stok yang sudah diambil akan dikembalikan ke rak."
          confirmLabel="Mundurkan Picklist"
          variant="destructive"
          loading={bulkRevertPicklists.isPending}
          onConfirm={() => void handleBulkRevert()}
        />
      )}
    </div>
  );
}
