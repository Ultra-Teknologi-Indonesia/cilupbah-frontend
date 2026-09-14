"use client";

import * as React from "react";
import type { StockAdjustmentItem } from "@/types/transaksi-stok/stock-adjustment";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  DownloadIcon,
  Trash2Icon,
  ClipboardListIcon,
  PencilIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { SectionTitle } from "@/components/dashboard/shared/section-title";
import { PageTitle } from "@/components/dashboard/page-title";
import {
  useStockAdjustmentDetail,
  useStockAdjustmentItems,
  useDeleteStockAdjustment,
} from "@/hooks/transaksi-stok/use-stock-adjustments";
import { exportCsv } from "@/lib/export-csv";
import { formatDateTimeFull } from "@/lib/format";
import { usePermissions } from "@/hooks/auth/use-permissions";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-36 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export function PenyesuaianDetail({ id }: { id: string }) {
  const router = useRouter();
  const { can } = usePermissions();
  const canEdit = can("edit-penyesuaian-stok");
  const canDelete = can("delete-penyesuaian-stok");
  const canExport = can("export-penyesuaian-stok");
  const { data: adj, isLoading } = useStockAdjustmentDetail(id);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [globalFilter, setGlobalFilter] = useState("");

  const { data: itemsData, isLoading: _itemsLoading } = useStockAdjustmentItems(
    id,
    {
      page: pagination.pageIndex + 1,
      per_page: pagination.pageSize,
      search: globalFilter || undefined,
    },
  );

  const deleteMut = useDeleteStockAdjustment();

  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleExport = () => {
    if (!canExport || !adj || !itemsData?.items?.length) return;
    exportCsv(
      `koreksi-stok-${adj.adjustment_no}.csv`,
      [
        "SKU",
        "Nama Produk",
        "Bin",
        "Stok Sistem",
        "Stok Aktual",
        "Selisih",
        "Catatan",
      ],
      itemsData.items.map((item) => [
        item.product?.sku ?? "",
        item.product?.product?.name ?? "",
        item.bin?.bin_final_code ?? "",
        String(item.system_qty ?? 0),
        String(item.actual_qty ?? 0),
        String((item.actual_qty ?? 0) - (item.system_qty ?? 0)),
        item.notes ?? "",
      ]),
    );
  };

  const columns = React.useMemo<ColumnDef<StockAdjustmentItem>[]>(
    () => [
      {
        accessorKey: "item_name",
        header: "Nama Produk",
        cell: ({ row }) => {
          const prod = row.original.product;
          const imageUrl =
            prod?.media?.[0]?.url || prod?.product?.media?.[0]?.url;
          return (
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={prod?.product?.name ?? "Produk"}
                  width={40}
                  height={40}
                  className="rounded-xl object-cover w-10 h-10 shrink-0"
                />
              ) : (
                <div className="rounded-xl bg-muted w-10 h-10 shrink-0" />
              )}
              <div
                className="flex min-w-0 flex-col gap-0.5"
                style={{ maxWidth: 280 }}
              >
                <span className="font-medium whitespace-normal break-words text-foreground">
                  {prod?.product?.name ?? "—"}
                </span>
                {prod?.sku && (
                  <span className="font-mono text-2xs text-foreground/80">
                    {prod.sku}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "bin",
        header: "Bin",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.bin?.bin_final_code ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "system_qty",
        header: () => <div className="text-right">Stok Sistem</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums text-foreground">
            {row.original.system_qty ?? 0}
          </div>
        ),
      },
      {
        accessorKey: "actual_qty",
        header: () => <div className="text-right">Stok Aktual</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums text-foreground">
            {row.original.actual_qty ?? 0}
          </div>
        ),
      },
      {
        id: "diff",
        header: () => <div className="text-right">Selisih</div>,
        cell: ({ row }) => {
          const diff =
            (row.original.actual_qty ?? 0) - (row.original.system_qty ?? 0);
          return (
            <div
              className={cn(
                "text-right tabular-nums font-medium",
                diff > 0
                  ? "text-success"
                  : diff < 0
                    ? "text-destructive"
                    : "text-foreground",
              )}
            >
              {diff > 0 ? `+${diff}` : diff}
            </div>
          );
        },
      },
      {
        accessorKey: "notes",
        header: "Catatan",
        cell: ({ row }) => (
          <span className="text-foreground">{row.original.notes ?? "—"}</span>
        ),
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!adj) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <ClipboardListIcon className="size-10" />
        <p className="text-sm">Dokumen tidak ditemukan.</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/transaksi-stok?tab=penyesuaian">Kembali</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        title={adj.adjustment_no}
        backHref="/dashboard/transaksi-stok?tab=penyesuaian"
        breadcrumb={[
          { label: "Persediaan" },
          {
            label: "Transaksi Stok",
            href: "/dashboard/transaksi-stok?tab=penyesuaian",
          },
          { label: adj.adjustment_no },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {canExport && <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!itemsData?.items?.length}
            >
              <DownloadIcon className="mr-1.5 size-3.5" />
              Export CSV
            </Button>}
            {canEdit && <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  `/dashboard/transaksi-stok/penyesuaian/${adj.id}/edit`,
                )
              }
            >
              <PencilIcon className="mr-1.5 size-3.5" />
              Ubah
            </Button>}
            {canDelete && <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              disabled={deleteMut.isPending}
            >
              <Trash2Icon className="mr-1.5 size-3.5" />
              Hapus
            </Button>}
          </div>
        }
      />

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04] p-5"
      >
        <SectionTitle className="mb-4">Informasi Koreksi Stok</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow label="No. Koreksi Stok" value={adj.adjustment_no} />
          <InfoRow label="Lokasi" value={adj.location?.location_name} />
          <InfoRow
            label="Tgl. Transaksi"
            value={
              adj.created_at || adj.transaction_date
                ? formatDateTimeFull(adj.created_at || adj.transaction_date)
                : null
            }
          />
          <InfoRow label="Dibuat Oleh" value={adj.created_by} />
          <InfoRow label="Catatan" value={adj.notes} />
        </div>
      </LiquidGlass>

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04] p-5"
      >
        <SectionTitle className="mb-4">
          Daftar Item ({itemsData?.meta?.total ?? 0})
        </SectionTitle>
        <div className="border border-border/40 rounded-lg overflow-hidden">
          <DataTable
            columns={columns}
            data={itemsData?.items ?? []}
            rowCount={itemsData?.meta?.total ?? 0}
            pagination={pagination}
            onPaginationChange={setPagination}
            searchValue={globalFilter}
            onSearchChange={setGlobalFilter}
            searchPlaceholder="Cari item..."
            manualPagination={true}
            enableColumnVisibility={false}
            tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
            emptyState={<EmptyState title="Belum ada item." />}
          />
        </div>
      </LiquidGlass>

      {canDelete && <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteOpen(false);
        }}
        title="Hapus Koreksi Stok"
        description={`Hapus koreksi stok "${adj.adjustment_no}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={() => {
          deleteMut.mutate(adj.id, {
            onSuccess: () => {
              setDeleteOpen(false);
              router.push("/dashboard/transaksi-stok?tab=penyesuaian");
            },
          });
        }}
      />}
    </div>
  );
}
