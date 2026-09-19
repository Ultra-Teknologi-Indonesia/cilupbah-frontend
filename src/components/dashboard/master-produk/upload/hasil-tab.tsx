"use client";
import Image from "next/image";

import * as React from "react";
import { formatDateTime } from "@/lib/format";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  ClockIcon,
  ExternalLinkIcon,
  ImageIcon,
  InfoIcon,
  RotateCcwIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";

import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { Checkbox } from "@/components/ui/checkbox";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useBulkDeleteHistories,
  useReuploadHistory,
  useUploadHistories,
} from "@/hooks/master-produk/use-upload";
import { useConnectedStores } from "@/hooks/channel/use-connected-stores";
import type { HistoryRow } from "@/hooks/master-produk/use-upload";
import type { ChannelCode } from "@/types/channel";
import { ChannelLogo } from "@/components/dashboard/integrasi-channel/channel-logo";
import { FilterToolbar } from "../filter-toolbar";

const STATUS_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "success", label: "Berhasil" },
  { value: "failed", label: "Gagal" },
  { value: "pending", label: "Diproses" },
];

const STATUS_META: Record<
  HistoryRow["status"],
  { label: string; icon: React.ElementType; className: string }
> = {
  success: {
    label: "Sukses",
    icon: CheckCircle2Icon,
    className: "text-success bg-success/10",
  },
  failed: {
    label: "Gagal",
    icon: XCircleIcon,
    className: "text-destructive bg-destructive/10",
  },
  pending: {
    label: "Diproses",
    icon: ClockIcon,
    className: "text-warning bg-warning/10",
  },
};

function HistoryStatus({ row }: { row: HistoryRow }) {
  const meta = STATUS_META[row.status] ?? STATUS_META.pending;
  const Icon = meta.icon;
  const label = row.status === "pending" ? "Sedang diproses" : meta.label;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="img"
            aria-label={`Status: ${label}`}
            className={
              "inline-flex size-7 items-center justify-center rounded-full " +
              meta.className
            }
          >
            <Icon className="size-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const CATEGORY_BADGE: Record<string, { label: string; className: string }> = {
  user_fixable: {
    label: "Perlu diperbaiki",
    className: "bg-warning/10 text-warning",
  },
  retryable: {
    label: "Bisa dicoba lagi",
    className: "bg-primary/10 text-primary",
  },
  token: {
    label: "Hubungkan ulang",
    className: "bg-primary/10 text-primary",
  },
  fatal: {
    label: "Ditolak channel",
    className: "bg-destructive/10 text-destructive",
  },
};

function KeteranganCell({ row }: { row: HistoryRow }) {
  const [openDetail, setOpenDetail] = React.useState(false);

  if (row.status === "success") {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  if (row.status === "pending") {
    return (
      <span className="text-sm text-muted-foreground">Sedang diproses…</span>
    );
  }

  const error = row.error;
  const title = error?.title ?? "Produk gagal di-upload";
  const reason = error?.reason ?? row.statusMessage ?? "Gagal";
  const badge = CATEGORY_BADGE[error?.category ?? "fatal"];
  const hasMore = !!(error?.action || error?.detail);

  return (
    <div className="flex max-w-[22rem] flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {badge && (
          <span
            className={
              "rounded-full px-1.5 py-0.5 text-2xs font-medium " +
              badge.className
            }
          >
            {badge.label}
          </span>
        )}
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="line-clamp-2 whitespace-normal break-words text-xs leading-snug text-muted-foreground">
              {reason}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <span className="block min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">
              {reason}
            </span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {hasMore && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline"
            >
              Selengkapnya
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-foreground">
                {title}
              </span>
              <span className="text-xs leading-snug text-muted-foreground">
                {reason}
              </span>
            </div>
            {error?.action && (
              <div className="flex items-start gap-2 rounded-2xl bg-muted/50 p-3">
                <WrenchIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-xs leading-snug text-foreground">
                  {error.action}
                </span>
              </div>
            )}
            {error?.detail && (
              <Collapsible open={openDetail} onOpenChange={setOpenDetail}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-2xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDownIcon
                      className={
                        "size-3 transition-transform " +
                        (openDetail ? "rotate-180" : "")
                      }
                    />
                    Detail teknis
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted/60 p-2 text-2xs leading-snug text-muted-foreground">
                    {error.detail}
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export function HasilTab({
  tabBar,
  actionButton,
}: {
  tabBar?: React.ReactNode;
  actionButton?: React.ReactNode;
}) {
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [shopId, setShopId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const applySearch = React.useCallback((nextSearch?: string) => {
    setSearch((nextSearch ?? searchInput).trim());
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [searchInput]);

  const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }));

  const { data: stores = [] } = useConnectedStores();
  const storeOptions = React.useMemo(
    () =>
      stores.map((s) => ({
        value: s.shop_id,
        label: s.shop_name,
        hint: s.channel?.name ?? undefined,
      })),
    [stores],
  );

  const { data, isLoading } = useUploadHistories({
    search: search || undefined,
    status: status === "all" ? undefined : status,
    shopId: shopId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
  });

  const items = data?.items ?? [];
  const total = data?.meta?.total ?? 0;

  const reupload = useReuploadHistory();
  const bulkDelete = useBulkDeleteHistories();

  const hasFilter =
    !!search || status !== "all" || !!shopId || !!dateFrom || !!dateTo;

  const onReset = () => {
    setSearchInput("");
    setSearch("");
    setShopId(null);
    setStatus("all");
    setDateFrom("");
    setDateTo("");
    resetPage();
  };

  const columns = React.useMemo<ColumnDef<HistoryRow>[]>(
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
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Pilih baris"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 36,
      },
      {
        accessorKey: "itemGroupName",
        header: "Produk",
        cell: ({ row }) => {
          const h = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
                {h.thumbnail ? (
                  <Image
                    unoptimized
                    width={400}
                    height={400}
                    src={h.thumbnail}
                    alt={h.itemGroupName ?? ""}
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageIcon className="size-4 text-muted-foreground" />
                )}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="line-clamp-2 min-w-0 whitespace-normal break-words font-medium">
                      {h.itemGroupName ?? "—"}
                    </div>
                  </TooltipTrigger>
                  {h.itemGroupName && (
                    <TooltipContent className="max-w-sm">
                      <span className="block min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">
                        {h.itemGroupName}
                      </span>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        },
        size: 320,
      },
      {
        id: "store",
        header: "Store",
        enableSorting: false,
        cell: ({ row }) => {
          const h = row.original;
          return (
            <div className="flex items-center gap-2">
              <ChannelLogo
                code={(h.channelCode ?? "") as ChannelCode}
                name={h.channelName ?? "—"}
                className="size-7 rounded-xl"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {h.channelName ?? "—"}
                </div>
                {h.storeName && (
                  <div className="truncate text-xs text-muted-foreground">
                    {h.storeName}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "uploadDate",
        header: "Tgl. Upload",
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums text-sm text-muted-foreground">
            {formatDateTime(row.original.uploadDate)}
          </span>
        ),
      },
      {
        accessorKey: "success",
        header: () => <div className="text-center">Status</div>,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <HistoryStatus row={row.original} />
          </div>
        ),
        size: 64,
      },
      {
        id: "keterangan",
        header: "Keterangan",
        enableSorting: false,
        cell: ({ row }) => <KeteranganCell row={row.original} />,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Tindakan</div>,
        enableSorting: false,
        cell: ({ row }) => {
          const h = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              {h.channelUrl && (
                <Button variant="ghost" size="icon" className="size-8" asChild>
                  <a
                    href={h.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Buka di channel"
                  >
                    <ExternalLinkIcon className="size-4" />
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={!h.canReupload || reupload.isPending}
                onClick={() => reupload.mutate(h.id)}
              >
                <RotateCcwIcon className="size-3.5" />
                Re-upload
              </Button>
            </div>
          );
        },
        size: 48,
      },
    ],
    [reupload],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        <p>
          Produk yang berhasil di-upload ke channel lebih dari 30 hari akan
          otomatis terhapus dari halaman ini.
        </p>
      </div>

      <LiquidGlass
        radius={24}
        intensity="default"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 pt-3 sm:px-5">
          <div className="overflow-x-auto">{tabBar}</div>
          <div className="flex items-center gap-3 pb-2">
            {actionButton}
            <span className="text-sm text-muted-foreground">
              Total{" "}
              <span className="font-medium text-foreground tabular-nums">
                {total}
              </span>
            </span>
          </div>
        </div>
        <FilterToolbar
          search={searchInput}
          onSearchChange={setSearchInput}
          onSearch={applySearch}
          searchPlaceholder="Cari produk…"
          onReset={hasFilter ? onReset : undefined}
          hasFilter={hasFilter}
          activeCount={
            [
              shopId !== null,
              status !== "all",
              dateFrom !== "",
              dateTo !== "",
            ].filter(Boolean).length
          }
        >
          <Combobox
            options={storeOptions}
            value={shopId}
            onChange={(v) => {
              setShopId(v);
              resetPage();
            }}
            placeholder="Pilih toko"
            searchPlaceholder="Cari toko"
            className="h-9 bg-background"
          />
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              resetPage();
            }}
          >
            <SelectTrigger className="h-9 w-auto min-w-[140px] rounded-full bg-background">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DatePicker
            value={dateFrom ? parseISO(dateFrom) : undefined}
            onChange={(d) => {
              setDateFrom(d ? format(d, "yyyy-MM-dd") : "");
              resetPage();
            }}
            placeholder="Dari tanggal"
            className="bg-background"
          />
          <DatePicker
            value={dateTo ? parseISO(dateTo) : undefined}
            onChange={(d) => {
              setDateTo(d ? format(d, "yyyy-MM-dd") : "");
              resetPage();
            }}
            placeholder="Sampai tanggal"
            className="bg-background"
          />
        </FilterToolbar>
        <div className="px-5 py-5 sm:px-6">
          <DataTable
            columns={columns}
            data={items}
            getRowId={(h) => h.id}
            isLoading={isLoading}
            hideToolbar
            manualPagination
            rowCount={total}
            pagination={pagination}
            onPaginationChange={setPagination}
            enableRowSelection
            tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
            bulkActions={(selected, table) => (
              <Button
                variant="destructive"
                size="sm"
                disabled={bulkDelete.isPending}
                onClick={() =>
                  bulkDelete.mutate(
                    selected.map((h) => h.id),
                    { onSuccess: () => table.resetRowSelection() },
                  )
                }
              >
                Hapus
              </Button>
            )}
            emptyState={<EmptyState title="Belum ada riwayat upload" />}
          />
        </div>
      </LiquidGlass>
    </div>
  );
}
