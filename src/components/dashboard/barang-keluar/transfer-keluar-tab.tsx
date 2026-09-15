"use client";
import { EmptyState } from "@/components/ui/empty-state";

import { useState, useMemo, useCallback } from "react";
import { useListState } from "@/hooks/use-list-state";
import { useUrlTab } from "@/hooks/use-url-tab";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRightLeftIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  Trash2Icon,
  Loader2Icon,
  UploadIcon,
} from "lucide-react";

import type { DateRange } from "react-day-picker";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { DateRangePicker } from "@/components/ui/date-picker";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import type {
  ColumnDef,
  Table as TableInstance,
  SortingState,
} from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterToolbar } from "@/components/dashboard/master-produk/filter-toolbar";
import {
  useOutboundDrafts,
  useOutboundTransit,
  useOutboundFinished,
  useShipTransfer,
  useSubmitDraft,
  useDeleteTransfer,
  useBulkDeleteTransfer,
  useBulkPdfTransferAsync,
} from "@/hooks/barang-keluar/use-outbound-transfers";
import { useMe } from "@/hooks/auth/use-auth";
import { toast } from "sonner";
import { apiError } from "@/lib/toast";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import type { InventoryTransfer } from "@/types/barang-masuk/inventory-transfer";
import { formatDateTime } from "@/lib/format";
import { ImportTransferDialog } from "@/components/dashboard/barang-keluar/import-transfer-dialog";

type SubTab = "draft" | "transit" | "finished";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "draft", label: "Baru Dibuat" },
  { key: "transit", label: "Sedang Dijalan" },
  { key: "finished", label: "Selesai" },
];

interface FilterState {
  location_id: string;
  date_from: string;
  date_to: string;
}

const EMPTY_FILTERS: FilterState = {
  location_id: "",
  date_from: "",
  date_to: "",
};

function toDateStr(d?: Date): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateStr(s: string): Date | undefined {
  if (!s) return undefined;
  return new Date(`${s}T00:00:00`);
}

function hasMissingBin(item: InventoryTransfer): boolean {
  return item.items.some((it) => !it.source_bin_id);
}

function TransferTable({
  items,
  isLoading,
  isFetching,
  meta,
  page,
  perPage,
  setPage,
  setPerPage,
  resetPage: _resetPage,
  onRowClick,
  actionSlot,
  bulkActions,
  sorting,
  onSortingChange,
}: {
  items: InventoryTransfer[];
  isLoading: boolean;
  isFetching: boolean;
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  page: number;
  perPage: number;
  setPage: (p: number) => void;
  setPerPage: (s: number) => void;
  resetPage: () => void;
  onRowClick: (item: InventoryTransfer) => void;
  actionSlot?: (item: InventoryTransfer) => React.ReactNode;
  bulkActions?: (
    selected: InventoryTransfer[],
    table: TableInstance<InventoryTransfer>,
  ) => React.ReactNode;
  sorting?: SortingState;
  onSortingChange?: (s: SortingState) => void;
}) {
  const columns = useMemo<ColumnDef<InventoryTransfer>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Pilih semua"
          />
        ),
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Pilih baris"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 36,
      },
      {
        accessorKey: "transfer_number",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Transfer" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <Link
            href={`/dashboard/barang-keluar/transfer/${row.original.id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium font-mono text-xs text-primary underline-offset-2 transition-colors hover:underline"
          >
            {row.original.transfer_number}
          </Link>
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Tanggal / Jam" />
        ),
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-foreground whitespace-nowrap text-xs">
            {formatDateTime(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "source_location",
        header: "Lokasi Asal",
        cell: ({ row }) => (
          <span className="text-foreground text-xs">
            {row.original.source_location?.location_name ?? "—"}
          </span>
        ),
      },
      {
        id: "destination_location",
        header: "Lokasi Tujuan",
        cell: ({ row }) => (
          <span className="text-foreground text-xs">
            {row.original.destination_location?.location_name ?? "—"}
          </span>
        ),
      },
      {
        id: "items_count",
        header: "Jumlah Item",
        cell: ({ row }) => (
          <span className="tabular-nums text-foreground text-xs">
            {row.original.items?.length ?? 0} item
          </span>
        ),
      },
      {
        accessorKey: "notes",
        header: "Catatan",
        cell: ({ row }) => (
          <span
            className="text-muted-foreground text-xs line-clamp-1 max-w-[200px]"
            title={row.original.notes ?? ""}
          >
            {row.original.notes || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          return (
            <div
              className="flex items-center justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              {actionSlot?.(row.original)}
            </div>
          );
        },
      },
    ],
    [actionSlot],
  );
  return (
    <>
      <div className="px-5 py-5 sm:px-6">
        <DataTable
          columns={columns}
          data={items}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          isFetching={isFetching}
          hideToolbar
          manualPagination
          manualSorting
          sorting={sorting}
          onSortingChange={onSortingChange}
          enableRowSelection={!!bulkActions}
          bulkActions={bulkActions}
          onRowClick={onRowClick}
          pagination={{
            pageIndex: page - 1,
            pageSize: perPage,
          }}
          rowCount={meta.total}
          onPaginationChange={(p) => {
            setPage(p.pageIndex + 1);
            setPerPage(p.pageSize);
          }}
          tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
          emptyState={
            <EmptyState
              icon={ArrowRightLeftIcon}
              title="Belum ada transfer keluar"
              description="Transfer antar lokasi yang keluar akan tampil di sini."
            />
          }
        />
      </div>
    </>
  );
}

export function TransferKeluarTab() {
  const { can } = usePermissions();
  const canCreateTransfer = can("create-barang-keluar");
  const canEditTransfer = can("edit-barang-keluar");
  const canDeleteTransfer = can("delete-barang-keluar");
  const canExportTransfer = can("export-barang-keluar");
  const router = useRouter();
  const [subTab, setSubTab] = useUrlTab<SubTab>("tab", "draft", {
    validValues: ["draft", "transit", "finished"],
  });
  const list = useListState<FilterState>(EMPTY_FILTERS, {
    perPage: 20,
    debounceMs: 350,
    namespace: "transfer_out",
  });

  const shipMutation = useShipTransfer();

  const [deleteTarget, setDeleteTarget] = useState<InventoryTransfer | null>(
    null,
  );
  const deleteMutation = useDeleteTransfer();

  const [bulkDeleteState, setBulkDeleteState] = useState<{
    ids: string[];
    onDone: () => void;
  } | null>(null);
  const bulkDeleteMutation = useBulkDeleteTransfer();
  const bulkPdfMutation = useBulkPdfTransferAsync();
  const [bulkPrinting, setBulkPrinting] = useState(false);

  const handleEdit = useCallback(
    (item: InventoryTransfer) => {
      router.push(`/dashboard/barang-keluar/transfer/${item.id}/edit`);
    },
    [router],
  );

  const submitMutation = useSubmitDraft();
  const { data: me } = useMe();
  const meName = me?.name ?? "";
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const openTransferPdf = useCallback((id: string) => {
    window.open(
      `/dashboard/document-preview/transfer-out/${id}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, []);

  const handlePrint = useCallback(
    async (item: InventoryTransfer) => {
      if (printingId) return;
      if (hasMissingBin(item)) {
        toast.error(
          "Pilih rak asal untuk semua item sebelum bisa cetak/kirim.",
        );
        return;
      }
      setPrintingId(item.id);
      try {
        if (item.status === "DRAFT") {
          await submitMutation.mutateAsync(item.id);
          toast.success("Transfer dikirim — pindah ke Sedang Dijalan");
        } else if (item.status === "APPROVED") {
          await shipMutation.mutateAsync({
            id: item.id,
            data: { shipped_by: meName },
          });
        }
        openTransferPdf(item.id);
      } catch (err) {
        apiError(err, "Gagal memproses cetak transfer");
      } finally {
        setPrintingId(null);
      }
    },
    [printingId, submitMutation, shipMutation, meName, openTransferPdf],
  );

  const handleReprint = useCallback(
    (item: InventoryTransfer) => {
      openTransferPdf(item.id);
    },
    [openTransferPdf],
  );

  const openBulkTransferPdf = useCallback(async (ids: string[]) => {
    const previewWindow = window.open("about:blank", "_blank");

    try {
      const result = await bulkPdfMutation.mutateAsync(ids);
      const previewUrl =
        `/dashboard/document-preview/transfer-out-bulk-export/${encodeURIComponent(result.export_id)}`;

      if (previewWindow && !previewWindow.closed) {
        previewWindow.location.href = previewUrl;
      } else {
        window.open(previewUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      previewWindow?.close();
      apiError(error, "Gagal menyiapkan PDF transfer bulk");
    }
  }, [bulkPdfMutation]);

  const handleBulkPrint = useCallback(
    async (items: InventoryTransfer[], resetSelection: () => void) => {
      if (bulkPrinting || items.length === 0) return;
      setBulkPrinting(true);
      try {
        const blockedByBin = items.filter(hasMissingBin).length;
        const printable = items.filter((item) => !hasMissingBin(item));

        const results = await Promise.allSettled(
          printable.map(async (item) => {
            if (item.status === "DRAFT") {
              await submitMutation.mutateAsync(item.id);
            } else if (item.status === "APPROVED") {
              await shipMutation.mutateAsync({
                id: item.id,
                data: { shipped_by: meName },
              });
            }
            return item.id;
          }),
        );

        const succeeded = results
          .filter(
            (r): r is PromiseFulfilledResult<string> =>
              r.status === "fulfilled",
          )
          .map((r) => r.value);
        const failedCount = results.length - succeeded.length;

        if (blockedByBin > 0) {
          toast.error(
            `${blockedByBin} transfer dilewati karena belum semua item punya rak asal`,
          );
        }
        if (failedCount > 0) {
          toast.warning(
            `${failedCount} transfer gagal diproses, ${succeeded.length} dilanjutkan cetak`,
          );
        }
        if (succeeded.length > 0) {
          await openBulkTransferPdf(succeeded);
          resetSelection();
        }
      } finally {
        setBulkPrinting(false);
      }
    },
    [bulkPrinting, submitMutation, shipMutation, meName, openBulkTransferPdf],
  );

  const handleSubTabChange = useCallback(
    (t: SubTab) => {
      setSubTab(t);
      list.setPage(1);
    },
    [setSubTab, list],
  );

  const sortParam = useMemo(() => {
    if (!list.sorting || list.sorting.length === 0) return undefined;
    const s = list.sorting[0];
    return s.desc ? `-${s.id}` : s.id;
  }, [list.sorting]);

  const params = useMemo(
    () => ({
      search: list.debouncedSearch || undefined,
      page: list.page,
      per_page: list.perPage,
      "filter[source_location_id]": list.filters.location_id || undefined,
      "filter[date_from]": list.filters.date_from || undefined,
      "filter[date_to]": list.filters.date_to || undefined,
      sort: sortParam,
    }),
    [list.debouncedSearch, list.page, list.perPage, list.filters, sortParam],
  );

  const dateRange: DateRange | undefined = useMemo(() => {
    const from = parseDateStr(list.filters.date_from);
    const to = parseDateStr(list.filters.date_to);
    if (!from && !to) return undefined;
    return { from, to };
  }, [list.filters.date_from, list.filters.date_to]);

  const draftQuery = useOutboundDrafts(subTab === "draft" ? params : {});
  const transitQuery = useOutboundTransit(subTab === "transit" ? params : {});
  const finishedQuery = useOutboundFinished(
    subTab === "finished" ? params : {},
  );

  const activeQuery =
    subTab === "draft"
      ? draftQuery
      : subTab === "transit"
        ? transitQuery
        : finishedQuery;
  const items = activeQuery.data?.items ?? [];
  const meta = activeQuery.data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: list.perPage,
    total: 0,
  };

  const { data: locData } = useLocations({ perPage: 100 });
  const locationOptions = useMemo(
    () => [
      { value: "", label: "Semua Lokasi" },
      ...(locData?.items ?? []).map((l) => ({
        value: l.id,
        label: l.locationName,
      })),
    ],
    [locData],
  );

  const handleRowClick = useCallback(
    (item: InventoryTransfer) => {
      router.push(`/dashboard/barang-keluar/transfer/${item.id}`);
    },
    [router],
  );

  const draftActions = useCallback(
    (item: InventoryTransfer) => {
      const missingBin = hasMissingBin(item);
      return (
        <div className="flex items-center gap-1">
          {canExportTransfer && canCreateTransfer && <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handlePrint(item)}
            disabled={printingId === item.id || missingBin}
            aria-label="Cetak Surat Jalan & kirim"
            title={
              missingBin
                ? "Pilih rak asal untuk semua item dulu"
                : "Cetak Surat Jalan & kirim"
            }
          >
            {printingId === item.id ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <PrinterIcon className="size-3.5" />
            )}
          </Button>}
          {canEditTransfer && <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleEdit(item)}
            aria-label="Ubah transfer"
            title="Ubah transfer"
          >
            <PencilIcon className="size-3.5" />
          </Button>}
          {canDeleteTransfer && <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setDeleteTarget(item)}
            aria-label="Hapus transfer"
            title="Hapus transfer"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2Icon className="size-3.5" />
          </Button>}
        </div>
      );
    },
    [canCreateTransfer, canDeleteTransfer, canEditTransfer, canExportTransfer, handlePrint, handleEdit, printingId],
  );

  const transitActions = useCallback(
    (item: InventoryTransfer) => (
      <div className="flex items-center gap-1">
        {canExportTransfer && <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleReprint(item)}
          disabled={printingId === item.id}
          aria-label="Cetak ulang Surat Jalan"
          title="Cetak ulang Surat Jalan"
        >
          {printingId === item.id ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <PrinterIcon className="size-3.5" />
          )}
        </Button>}
        {canEditTransfer && <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleEdit(item)}
          aria-label="Ubah transfer (dikembalikan ke Baru Dibuat)"
          title="Ubah transfer (dikembalikan ke Baru Dibuat)"
        >
          <PencilIcon className="size-3.5" />
        </Button>}
        {canDeleteTransfer && <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setDeleteTarget(item)}
          aria-label="Hapus transfer"
          title="Hapus transfer"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon className="size-3.5" />
        </Button>}
      </div>
    ),
    [canDeleteTransfer, canEditTransfer, canExportTransfer, handleReprint, handleEdit, printingId],
  );

  const reprintActions = useCallback(
    (item: InventoryTransfer) => (
      <div className="flex items-center gap-1">
        {canExportTransfer && <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => handleReprint(item)}
          disabled={printingId === item.id}
          aria-label="Cetak ulang Surat Jalan"
          title="Cetak ulang Surat Jalan"
        >
          {printingId === item.id ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <PrinterIcon className="size-3.5" />
          )}
        </Button>}
        {canDeleteTransfer && <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setDeleteTarget(item)}
          aria-label="Batalkan & reset ke draft (kembalikan stok ke gudang asal)"
          title="Batalkan & reset ke draft (kembalikan stok ke gudang asal)"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon className="size-3.5" />
        </Button>}
      </div>
    ),
    [canDeleteTransfer, canExportTransfer, handleReprint, printingId],
  );

  const bulkActionsFor = useCallback(
    (
      selected: InventoryTransfer[],
      table: TableInstance<InventoryTransfer>,
    ) => {
      const ids = selected.map((i) => i.id);
      return (
        <>
          {canExportTransfer && <Button
            size="sm"
            variant="outline"
            disabled={bulkPrinting}
            onClick={() =>
              handleBulkPrint(selected, () => table.resetRowSelection())
            }
          >
            {bulkPrinting ? (
              <Loader2Icon className="mr-1.5 size-4 animate-spin" />
            ) : (
              <PrinterIcon className="mr-1.5 size-4" />
            )}
            Cetak {ids.length}
          </Button>}
          {canDeleteTransfer && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                setBulkDeleteState({
                  ids,
                  onDone: () => table.resetRowSelection(),
                })
              }
            >
              <Trash2Icon className="mr-1.5 size-4" />
              Hapus {ids.length}
            </Button>
          )}
        </>
      );
    },
    [
      bulkPrinting,
      canDeleteTransfer,
      canExportTransfer,
      handleBulkPrint,
    ],
  );

  return (
    <>
      <LiquidGlass
        radius={20}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-5">
          <Tabs
            value={subTab}
            onValueChange={(val) => handleSubTabChange(val as SubTab)}
            className="flex flex-col gap-4"
          >
            <TabsList variant="line" className="h-auto">
              {SUB_TABS.map(({ key, label }) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            {canCreateTransfer && <Button
              size="sm"
              variant="outline"
              onClick={() => setImportOpen(true)}
            >
              <UploadIcon className="mr-1.5 size-4" />
              Import
            </Button>}
            {canCreateTransfer && <Button
              size="sm"
              onClick={() =>
                router.push("/dashboard/barang-keluar/transfer/tambah")
              }
            >
              <PlusIcon className="mr-1.5 size-4" />
              Tambah baru
            </Button>}
          </div>
        </div>

        <FilterToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Cari no. transfer..."
          align="end"
          onReset={
            list.hasActiveFilter || !!list.search ? list.resetAll : undefined
          }
          hasFilter={list.hasActiveFilter || !!list.search}
          activeCount={list.activeFilterCount}
          gridCols={2}
        >
          <Combobox
            options={locationOptions}
            value={list.filters.location_id}
            onChange={(v) =>
              list.setFilters({ ...list.filters, location_id: v ?? "" })
            }
            placeholder="Lokasi Asal"
            searchPlaceholder="Cari lokasi"
            className="h-9 bg-background"
          />
          <DateRangePicker
            value={dateRange}
            onChange={(range) =>
              list.setFilters({
                ...list.filters,
                date_from: toDateStr(range?.from),
                date_to: toDateStr(range?.to),
              })
            }
            placeholder="Rentang tanggal transfer"
            className="h-9 bg-background"
          />
        </FilterToolbar>

        <TransferTable
          key={subTab}
          items={items}
          isLoading={activeQuery.isLoading}
          isFetching={activeQuery.isFetching}
          meta={meta}
          page={list.page}
          perPage={list.perPage}
          setPage={list.setPage}
          setPerPage={list.setPerPage}
          resetPage={list.resetPage}
          onRowClick={handleRowClick}
          sorting={list.sorting}
          onSortingChange={list.setSorting}
          actionSlot={
            subTab === "draft"
              ? draftActions
              : subTab === "transit"
                ? transitActions
                : reprintActions
          }
          bulkActions={
            canExportTransfer ||
            canDeleteTransfer ||
            (subTab === "transit" && canEditTransfer)
              ? bulkActionsFor
              : undefined
          }
        />
      </LiquidGlass>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Batalkan Transfer"
        description={`Batalkan transfer ${deleteTarget?.transfer_number ?? ""}? Aktivitas stok akan dibersihkan, saldo dikembalikan ke kondisi awal, dan dokumen di-reset ke status Draft.`}
        confirmLabel="Batalkan & Reset"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMutation.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />

      <ConfirmDialog
        open={!!bulkDeleteState}
        onOpenChange={(v) => !v && setBulkDeleteState(null)}
        title="Batalkan Transfer Terpilih"
        description={`Batalkan ${bulkDeleteState?.ids.length ?? 0} transfer? Aktivitas stok akan dibersihkan, saldo dikembalikan ke kondisi awal, dan dokumen di-reset ke status Draft.`}
        confirmLabel="Batalkan & Reset"
        variant="destructive"
        loading={bulkDeleteMutation.isPending}
        onConfirm={() => {
          if (!bulkDeleteState) return;
          bulkDeleteMutation.mutate(bulkDeleteState.ids, {
            onSuccess: () => {
              bulkDeleteState.onDone();
              setBulkDeleteState(null);
            },
          });
        }}
      />

      <ImportTransferDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        createdBy={meName}
      />
    </>
  );
}
