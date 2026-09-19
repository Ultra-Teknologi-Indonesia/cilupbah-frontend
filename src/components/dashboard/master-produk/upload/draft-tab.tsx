"use client";
import Image from "next/image";

import * as React from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { ImageIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { DataTable } from "@/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useChannelDrafts,
  useDeleteDraft,
  useUploadDraft,
} from "@/hooks/master-produk/use-upload";
import type { DraftRow, DraftStatus } from "@/hooks/master-produk/use-upload";
import type { ChannelCode } from "@/types/channel";
import { ChannelLogo } from "@/components/dashboard/integrasi-channel/channel-logo";
import { FilterToolbar } from "../filter-toolbar";
import { SyncStatusBadge } from "../detail/tab-pagination";

const STATUS_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "draft", label: "Draft" },
  { value: "ready", label: "Siap" },
  { value: "cancelled", label: "Dibatalkan" },
];

type DeletePending = { productId: string; draftId: string; name: string };

export function DraftTab({
  tabBar,
  actionButton,
}: {
  tabBar?: React.ReactNode;
  actionButton?: React.ReactNode;
}) {
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [deletePending, setDeletePending] =
    React.useState<DeletePending | null>(null);

  const applySearch = React.useCallback((nextSearch?: string) => {
    setSearch((nextSearch ?? searchInput).trim());
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [searchInput]);

  const { data, isLoading } = useChannelDrafts({
    search: search || undefined,
    status: (status === "all" ? undefined : status) as DraftStatus | undefined,
    page: pagination.pageIndex + 1,
    perPage: pagination.pageSize,
  });

  const items = data?.items ?? [];
  const total = data?.meta?.total ?? 0;

  const uploadDraft = useUploadDraft();
  const deleteDraft = useDeleteDraft();

  const confirmDelete = () => {
    if (!deletePending) return;
    deleteDraft.mutate(
      { productId: deletePending.productId, draftId: deletePending.draftId },
      { onSuccess: () => setDeletePending(null) },
    );
  };

  const columns = React.useMemo<ColumnDef<DraftRow>[]>(
    () => [
      {
        accessorKey: "itemGroupName",
        header: "Produk",
        cell: ({ row }) => {
          const d = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
                {d.thumbnail ? (
                  <Image
                    unoptimized
                    width={400}
                    height={400}
                    src={d.thumbnail}
                    alt={d.itemGroupName ?? ""}
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageIcon className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">
                  {d.itemGroupName ?? "—"}
                </div>
                {d.storeName && (
                  <div className="truncate text-xs text-muted-foreground">
                    {d.storeName}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: "store",
        header: "Store",
        enableSorting: false,
        cell: ({ row }) => {
          const d = row.original;
          return (
            <div className="flex items-center gap-2">
              <ChannelLogo
                code={(d.channelCode ?? "") as ChannelCode}
                name={d.channelName ?? "—"}
                className="size-7 rounded-lg"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {d.channelName ?? "—"}
                </div>
                {d.storeName && (
                  <div className="truncate text-xs text-muted-foreground">
                    {d.storeName}
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <SyncStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        enableSorting: false,
        cell: ({ row }) => {
          const d = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={!d.canUpload || uploadDraft.isPending}
                onClick={() => uploadDraft.mutate(d.id)}
              >
                <UploadIcon className="size-3.5" />
                Upload
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                aria-label="Hapus draft"
                onClick={() =>
                  setDeletePending({
                    productId: d.itemGroupId,
                    draftId: d.id,
                    name: d.itemGroupName ?? "draft ini",
                  })
                }
              >
                <Trash2Icon className="size-4" />
              </Button>
            </div>
          );
        },
        size: 48,
      },
    ],
    [uploadDraft],
  );

  const hasFilter = !!searchInput || status !== "all";
  const onReset = () => {
    setSearchInput("");
    setSearch("");
    setStatus("all");
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  return (
    <>
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
          activeCount={[status !== "all"].filter(Boolean).length}
        >
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setPagination((p) => ({ ...p, pageIndex: 0 }));
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
        </FilterToolbar>
        <div className="px-5 py-5 sm:px-6">
          <DataTable
            columns={columns}
            data={items}
            getRowId={(d) => d.id}
            isLoading={isLoading}
            hideToolbar
            manualPagination
            rowCount={total}
            pagination={pagination}
            onPaginationChange={setPagination}
            tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
            emptyState={
              <span className="text-muted-foreground">
                Belum ada draft upload
              </span>
            }
          />
        </div>
      </LiquidGlass>

      <Dialog
        open={!!deletePending}
        onOpenChange={(o) => {
          if (!o && !deleteDraft.isPending) setDeletePending(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus draft?</DialogTitle>
            <DialogDescription>
              Draft untuk{" "}
              <span className="font-medium text-foreground">
                {deletePending?.name}
              </span>{" "}
              akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleteDraft.isPending}>
                Batal
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteDraft.isPending}
            >
              {deleteDraft.isPending ? (
                <Loader2Icon className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Trash2Icon />
              )}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
