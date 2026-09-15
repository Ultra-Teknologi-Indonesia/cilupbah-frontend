"use client";

import * as React from "react";
import {
  CheckCircle2Icon,
  DownloadIcon,
  Loader2Icon,
  RefreshCwIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import {
  FulfillmentFilterBar,
  type FulfillmentFilterValue,
} from "@/components/dashboard/proses-pesanan/shared/fulfillment-filter-bar";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import {
  useDismissPreManifestCancel,
  useDownloadPreManifestCancelXlsx,
  usePreManifestCancelList,
  useUndismissPreManifestCancel,
} from "@/hooks/proses-pesanan/use-fulfillment";
import type { FulfillmentOrder } from "@/types/proses-pesanan/fulfillment";
import { useListState } from "@/hooks/use-list-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiError } from "@/lib/toast";
import { usePermissions } from "@/hooks/auth/use-permissions";

type PageFilterState = {
  source: string;
  location_id: string;
};

const EMPTY_FILTERS: PageFilterState = {
  source: "",
  location_id: "",
};

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return <span className="text-muted-foreground">—</span>;
  const label = source.charAt(0).toUpperCase() + source.slice(1);
  return (
    <span className="rounded-md bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
      {label}
    </span>
  );
}

export function PreManifestCancelTable() {
  const { can } = usePermissions();
  const canEditShipping = can("edit-pengiriman");
  const canExportShipping = can("export-pengiriman");
  const list = useListState<PageFilterState>(EMPTY_FILTERS, {
    perPage: 20,
    debounceMs: 350,
    namespace: "premanifest",
  });
  const [dismissTarget, setDismissTarget] =
    React.useState<FulfillmentOrder | null>(null);
  const [undismissTarget, setUndismissTarget] =
    React.useState<FulfillmentOrder | null>(null);

  const params = React.useMemo(
    () => ({
      q: list.debouncedSearch || undefined,
      source: list.filters.source || undefined,
      location_id: list.filters.location_id || undefined,
      page: list.page,
      per_page: list.perPage,
      sort_by: list.sorting[0]?.id || undefined,
      sort_dir: list.sorting[0]
        ? list.sorting[0].desc
          ? "desc"
          : "asc"
        : undefined,
    }),
    [list.debouncedSearch, list.page, list.perPage, list.filters, list.sorting],
  );

  const { data, isLoading, isFetching, refetch } =
    usePreManifestCancelList(params);
  const dismiss = useDismissPreManifestCancel();
  const undismiss = useUndismissPreManifestCancel();
  const download = useDownloadPreManifestCancelXlsx();

  const orders = data?.items ?? [];
  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  };

  const handleDismissConfirm = () => {
    if (!dismissTarget) return;
    dismiss.mutate(dismissTarget.id, {
      onSuccess: () =>
        toast.success(
          `${dismissTarget.salesorderNo} ditandai sudah dipisahkan.`,
        ),
      onError: (e) => apiError(e, "Gagal menandai pemisahan."),
      onSettled: () => setDismissTarget(null),
    });
  };

  const handleUndismissConfirm = () => {
    if (!undismissTarget) return;
    undismiss.mutate(undismissTarget.id, {
      onSuccess: () =>
        toast.success(
          `${undismissTarget.salesorderNo} dikembalikan ke daftar.`,
        ),
      onError: (e) => apiError(e, "Gagal membatalkan pemisahan."),
      onSettled: () => setUndismissTarget(null),
    });
  };

  const columns = React.useMemo<ColumnDef<FulfillmentOrder>[]>(
    () => [
      {
        id: "salesorder_no",
        accessorFn: (row) => row.salesorderNo,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Pesanan" />
        ),
        cell: ({ row }) =>
          canEditShipping ? (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">
                {row.original.salesorderNo}
              </span>
              {row.original.channelOrderNo && (
                <span className="text-2xs text-muted-foreground">
                  {row.original.channelOrderNo}
                </span>
              )}
            </div>
          ) : null,
      },
      {
        id: "source",
        accessorFn: (row) => row.source,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Channel" />
        ),
        cell: ({ row }) => <SourceBadge source={row.original.source} />,
      },
      {
        id: "customer_name",
        accessorFn: (row) => row.customerName,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Pelanggan" />
        ),
        cell: ({ row }) => (
          <span className="max-w-[180px] truncate">
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
        id: "tracking_number",
        accessorFn: (row) => row.trackingNumber,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Resi" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.trackingNumber ?? "—"}
          </span>
        ),
      },
      {
        id: "channel_status",
        accessorFn: (row) => row.channelStatus,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status Channel" />
        ),
        cell: ({ row }) => (
          <StatusBadge
            domain="channel-status"
            status={row.original.channelStatus}
            className="text-xs"
          />
        ),
      },
      {
        id: "cancel_reason",
        accessorFn: (row) => row.cancelReason,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Alasan Batal" />
        ),
        cell: ({ row }) => (
          <span className="max-w-[200px] truncate text-xs">
            {row.original.cancelReason ?? "—"}
          </span>
        ),
      },
      {
        id: "cancel_accepted_at",
        accessorFn: (row) => row.cancelAcceptedAt,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Waktu Batal" />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-foreground">
            {formatDateTime(row.original.cancelAcceptedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => null,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                    onClick={() => setDismissTarget(row.original)}
                  >
                    <CheckCircle2Icon className="size-3.5" />
                    Sudah Dipisahkan
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Tandai paket fisik sudah dipisahkan dari tumpukan
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ),
      },
    ],
    [canEditShipping],
  );

  return (
    <div>
      <FulfillmentFilterBar
        value={list.filters as FulfillmentFilterValue}
        onChange={(v) =>
          list.setFilters({ ...EMPTY_FILTERS, ...v } as PageFilterState)
        }
        fields={["channel", "location"]}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Cari no. pesanan / resi / pelanggan…"
      />

      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-2 sm:px-5">
        <p className="text-xs text-muted-foreground">
          Pesanan batal pasca-packing yang paket fisiknya harus dipisahkan
          sebelum diserahkan ke kurir.
        </p>
        <div className="flex items-center gap-2">
          {canExportShipping && (
            <ExportButton
              onDownload={(range) => download.mutate(range ?? undefined)}
              pending={download.isPending}
            />
          )}
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
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            Total{" "}
            <Badge
              className={cn(
                meta.total > 0 &&
                  "bg-destructive text-white hover:bg-destructive/90",
              )}
            >
              {meta.total}
            </Badge>
          </span>
        </div>
      </div>

      <div className="px-4 pb-4 sm:px-5">
        <DataTable
          columns={columns}
          data={orders}
          isLoading={isLoading}
          hideToolbar
          getRowClassName={() =>
            "border-l-4 border-l-destructive/60 bg-destructive/[0.03]"
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
            <EmptyState
              title="Tidak ada pesanan batal pra-manifest"
              description="Semua paket aman — tidak ada yang perlu dipisahkan."
            />
          }
        />
      </div>

      {canEditShipping && (
        <ConfirmDialog
          open={!!dismissTarget}
          onOpenChange={(o) => {
            if (!o) setDismissTarget(null);
          }}
          title="Konfirmasi Pemisahan"
          description={`Paket ${dismissTarget?.salesorderNo ?? ""} sudah dipisahkan dari tumpukan dan tidak akan terkirim ke kurir?`}
          confirmLabel="Ya, Sudah Dipisahkan"
          variant="default"
          loading={dismiss.isPending}
          onConfirm={handleDismissConfirm}
        />
      )}

      {canEditShipping && (
        <ConfirmDialog
          open={!!undismissTarget}
          onOpenChange={(o) => {
            if (!o) setUndismissTarget(null);
          }}
          title="Batalkan Pemisahan"
          description={`Kembalikan ${undismissTarget?.salesorderNo ?? ""} ke daftar pesanan yang perlu dipisahkan?`}
          confirmLabel="Kembalikan"
          variant="destructive"
          loading={undismiss.isPending}
          onConfirm={handleUndismissConfirm}
        />
      )}
    </div>
  );
}

function ExportButton({
  onDownload,
  pending,
}: {
  onDownload: (range?: { date_from?: string; date_to?: string }) => void;
  pending: boolean;
}) {
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10"
          disabled={pending}
        >
          {pending ? (
            <Loader2Icon className="size-3.5 animate-spin" />
          ) : (
            <DownloadIcon className="size-3.5" />
          )}
          Unduh Rekap
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem onSelect={() => onDownload()}>
          Hari ini
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <p className="mb-1.5 text-2xs font-medium text-muted-foreground">
            Rentang tanggal
          </p>
          <div className="flex flex-col gap-1.5">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              variant="primary"
              disabled={!dateFrom || !dateTo || pending}
              onClick={() =>
                onDownload({ date_from: dateFrom, date_to: dateTo })
              }
            >
              Unduh
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
