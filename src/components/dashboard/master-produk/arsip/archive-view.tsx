"use client";
import Image from "next/image";

import * as React from "react";
import Link from "next/link";
import {
  ArchiveIcon,
  ImageIcon,
  Loader2Icon,
  RotateCcwIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import {
  useArchivedProducts,
  useRestoreProduct,
} from "@/hooks/master-produk/use-archived-products";
import { useListState } from "@/hooks/use-list-state";
import type { ArchivedProduct } from "@/types/master-produk";
import { FilterToolbar } from "../filter-toolbar";
import { CopySku } from "@/components/dashboard/shared/copy-sku";

const fmtDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
        new Date(iso),
      )
    : "—";

function RestoreButton({
  item,
  pending,
  onRestore,
}: {
  item: ArchivedProduct;
  pending: boolean;
  onRestore: (item: ArchivedProduct) => void;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          {pending ? (
            <Loader2Icon className="animate-spin motion-reduce:animate-none" />
          ) : (
            <RotateCcwIcon className="mr-1.5 size-4" />
          )}
          Pulihkan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pulihkan produk?</DialogTitle>
          <DialogDescription>
            {item.itemName} akan dikembalikan ke status Master dan tampil
            kembali di katalog aktif.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Batal</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="primary" onClick={() => onRestore(item)}>
              Pulihkan
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ArchiveView() {
  const list = useListState<Record<string, never>>(
    {},
    { perPage: 20, namespace: "arsip" },
  );

  const { data, isLoading, isError, refetch } = useArchivedProducts({
    search: list.appliedSearch || undefined,
    page: list.page,
    perPage: list.perPage,
  });
  const restore = useRestoreProduct();
  const pendingId = restore.isPending ? (restore.variables ?? null) : null;

  const meta = data?.meta;
  const items = data?.items ?? [];

  const columns = React.useMemo<ColumnDef<ArchivedProduct>[]>(
    () => [
      {
        accessorKey: "itemName",
        header: "Produk",
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted/40">
              {row.original.thumbnail ? (
                <Image
                  unoptimized
                  width={400}
                  height={400}
                  src={row.original.thumbnail}
                  alt={row.original.itemName}
                  className="size-full object-cover"
                />
              ) : (
                <ImageIcon className="size-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <Link
                href={`/dashboard/produk/${row.original.itemGroupId}`}
                className="truncate font-medium hover:text-primary hover:underline"
              >
                {row.original.itemName}
              </Link>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {row.original.sku ? (
                  <CopySku sku={row.original.sku} />
                ) : (
                  <span className="font-mono text-foreground">—</span>
                )}
                <span>
                  ·{" "}
                  {row.original.isBundle
                    ? `${row.original.totalComponents ?? row.original.totalVariants} komposisi`
                    : `${row.original.totalVariants} varian`}
                </span>
              </div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "categoryName",
        header: "Kategori",
        cell: ({ row }) => (
          <span className="text-foreground">{row.original.categoryName}</span>
        ),
      },
      {
        accessorKey: "archivedAt",
        header: "Diarsipkan",
        cell: ({ row }) => (
          <div className="text-foreground">
            {fmtDate(row.original.archivedAt)}
            {row.original.archivedBy && (
              <div className="text-xs text-muted-foreground">
                oleh {row.original.archivedBy}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "archiveReason",
        header: "Alasan",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.archiveReason || "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div
              className="flex justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              <RestoreButton
                item={item}
                pending={pendingId === item.itemGroupId}
                onRestore={(it) => restore.mutate(it.itemGroupId)}
              />
            </div>
          );
        },
      },
    ],
    [pendingId, restore],
  );

  const hasFilter = list.search.length > 0;

  return (
    <LiquidGlass
      radius={24}
      intensity="default"
      className="flex flex-col bg-white/40 dark:bg-white/[0.06]"
    >
      <FilterToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        onSearch={list.applySearch}
        searchPlaceholder="Cari nama / SKU…"
        onReset={hasFilter ? list.resetAll : undefined}
        hasFilter={hasFilter}
        activeCount={0}
      />

      <div className="flex flex-col gap-4 p-5 sm:p-6">
        {isLoading ? (
          <div className="space-y-2 rounded-2xl border border-border/60 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 w-full animate-pulse rounded bg-muted motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
            <p className="text-sm font-medium">Gagal memuat arsip</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Coba lagi
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
            <ArchiveIcon className="size-6 text-muted-foreground" />
            <p className="text-sm font-medium">Belum ada produk diarsipkan</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Produk yang Anda arsipkan dari halaman detail akan muncul di sini.
            </p>
          </div>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={items}
              hideToolbar
              manualPagination
              pagination={
                meta
                  ? {
                      pageIndex: meta.current_page - 1,
                      pageSize: meta.per_page,
                    }
                  : list.pagination
              }
              rowCount={meta?.total ?? 0}
              onPaginationChange={list.onPaginationChange}
              tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
              emptyState={
                <div className="flex flex-col items-center gap-2 py-14 text-center">
                  <ArchiveIcon className="size-6 text-muted-foreground opacity-20" />
                  <p className="text-sm font-medium">
                    Belum ada produk diarsipkan
                  </p>
                </div>
              }
            />
          </>
        )}
      </div>
    </LiquidGlass>
  );
}
