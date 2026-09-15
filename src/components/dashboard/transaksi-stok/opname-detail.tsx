"use client";

import * as React from "react";
import type { StockOpnameItem } from "@/types/transaksi-stok/stock-opname";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DownloadIcon,
  PlayIcon,
  CheckCircle2Icon,
  XCircleIcon,
  Trash2Icon,
  ClipboardCheckIcon,
  CalculatorIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { PageTitle } from "@/components/dashboard/page-title";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { UserSelect } from "@/components/dashboard/shared/user-select";
import { SectionTitle } from "@/components/dashboard/shared/section-title";
import {
  useStockOpnameDetail,
  useStartStockOpname,
  useFinalizeStockOpname,
  useCancelStockOpname,
  useDeleteStockOpname,
  useCountOpnameItem,
} from "@/hooks/transaksi-stok/use-stock-opname";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { exportCsv } from "@/lib/export-csv";
import { formatDateTimeWib } from "@/lib/format";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-40 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

interface CountDialogState {
  open: boolean;
  itemId: string;
  productName: string;
  qtyActual: string;
  reason: string;
  countedBy: string;
}

const EMPTY_COUNT: CountDialogState = {
  open: false,
  itemId: "",
  productName: "",
  qtyActual: "",
  reason: "",
  countedBy: "",
};

export function OpnameDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: opname, isLoading } = useStockOpnameDetail(id);
  const startMut = useStartStockOpname();
  const finalizeMut = useFinalizeStockOpname();
  const cancelMut = useCancelStockOpname();
  const deleteMut = useDeleteStockOpname();
  const countMut = useCountOpnameItem();
  const { can } = usePermissions();
  const canManage = can("edit-stok-opname");

  const isDraft = opname?.status === "DRAFT";
  const isInProgress = opname?.status === "IN_PROGRESS";
  const isFinalized = opname?.status === "FINALIZED";

  const [startOpen, setStartOpen] = useState(false);
  const [startBy, setStartBy] = useState("");
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizeBy, setFinalizeBy] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [countDialog, setCountDialog] = useState<CountDialogState>(EMPTY_COUNT);

  const actionPending =
    startMut.isPending ||
    finalizeMut.isPending ||
    cancelMut.isPending ||
    deleteMut.isPending;

  const columns = React.useMemo<ColumnDef<StockOpnameItem>[]>(() => {
    const cols: ColumnDef<StockOpnameItem>[] = [
      {
        accessorKey: "item_name",
        header: "Nama Produk",
        cell: ({ row }) => (
          <div
            className="flex min-w-0 flex-col gap-0.5"
            style={{ maxWidth: 280 }}
          >
            <span className="font-medium whitespace-normal break-words text-foreground">
              {row.original.item?.item_name ?? "—"}
            </span>
            {row.original.item?.sku && (
              <span className="font-mono text-2xs text-foreground/80">
                {row.original.item.sku}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "bin",
        header: "Bin",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.bin?.code ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "batch_no",
        header: "Batch",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.batch_no ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "serial_no",
        header: "Serial",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.serial_no ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "qty_system",
        header: () => <div className="text-right">Stok Sistem</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums text-foreground">
            {row.original.qty_system ?? 0}
          </div>
        ),
      },
      {
        accessorKey: "qty_actual",
        header: () => <div className="text-right">Stok Aktual</div>,
        cell: ({ row }) => {
          const isCounted = row.original.qty_actual != null;
          return (
            <div className="text-right tabular-nums text-foreground">
              {isCounted ? (
                row.original.qty_actual
              ) : (
                <Badge
                  variant="outline"
                  className="text-2xs leading-tight border-border text-muted-foreground"
                >
                  Belum dihitung
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "diff",
        header: () => <div className="text-right">Selisih</div>,
        cell: ({ row }) => {
          const isCounted = row.original.qty_actual != null;
          const diff = isCounted
            ? row.original.qty_actual! - (row.original.qty_system ?? 0)
            : null;
          return (
            <div
              className={cn(
                "text-right tabular-nums font-medium",
                diff != null && diff > 0
                  ? "text-success"
                  : diff != null && diff < 0
                    ? "text-destructive"
                    : "text-foreground",
              )}
            >
              {diff != null ? (diff > 0 ? `+${diff}` : diff) : "—"}
            </div>
          );
        },
      },
      {
        accessorKey: "reason",
        header: "Alasan",
        cell: ({ row }) => (
          <span className="text-foreground">{row.original.reason ?? "—"}</span>
        ),
      },
      {
        accessorKey: "counted_by",
        header: "Dihitung Oleh",
        cell: ({ row }) => (
          <span className="text-foreground">
            {row.original.counted_by ?? "—"}
          </span>
        ),
      },
    ];

    if (isInProgress && canManage) {
      cols.push({
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const item = row.original;
          const isCounted = item.qty_actual != null;
          if (!isCounted) {
            return (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setCountDialog({
                      open: true,
                      itemId: item.id,
                      productName: item.item?.item_name ?? "",
                      qtyActual: "",
                      reason: "",
                      countedBy: "",
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-500/20"
                >
                  <CalculatorIcon className="size-3.5" />
                  Hitung
                </button>
              </div>
            );
          }
          return null;
        },
      });
    }
    return cols;
  }, [isInProgress, canManage]);

  const hasUncounted =
    opname?.items?.some((i) => i.qty_actual == null) ?? false;

  const handleExport = () => {
    if (!opname || !opname.items?.length) return;
    exportCsv(
      `stok-opname-${opname.opname_no}.csv`,
      [
        "SKU",
        "Nama Produk",
        "Bin",
        "Batch",
        "Serial",
        "Stok Sistem",
        "Stok Aktual",
        "Selisih",
        "Alasan",
        "Dihitung Oleh",
      ],
      opname.items.map((item) => [
        item.item?.sku ?? "",
        item.item?.item_name ?? "",
        item.bin?.code ?? "",
        item.batch_no ?? "",
        item.serial_no ?? "",
        String(item.qty_system ?? 0),
        item.qty_actual != null ? String(item.qty_actual) : "",
        item.qty_actual != null
          ? String(item.qty_actual - (item.qty_system ?? 0))
          : "",
        item.reason ?? "",
        item.counted_by ?? "",
      ]),
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!opname) {
    return (
      <EmptyState
        icon={ClipboardCheckIcon}
        title="Dokumen tidak ditemukan."
        className="py-20"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/transaksi-stok?tab=penyesuaian">
              Kembali
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        title={opname.opname_no}
        backHref="/dashboard/transaksi-stok?tab=penyesuaian"
        breadcrumb={[
          { label: "Persediaan" },
          {
            label: "Transaksi Stok",
            href: "/dashboard/transaksi-stok?tab=penyesuaian",
          },
          { label: opname.opname_no },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!opname.items?.length}
            >
              <DownloadIcon className="mr-1.5 size-3.5" />
              Export CSV
            </Button>
            {isDraft && (
              <Can permission="edit-stok-opname">
                <Button
                  size="sm"
                  onClick={() => {
                    setStartOpen(true);
                    setStartBy("");
                  }}
                  disabled={actionPending}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  <PlayIcon className="mr-1.5 size-3.5" />
                  Mulai
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  disabled={actionPending}
                >
                  <Trash2Icon className="mr-1.5 size-3.5" />
                  Hapus
                </Button>
              </Can>
            )}
            {isInProgress && (
              <Can permission="edit-stok-opname">
                <Button
                  size="sm"
                  onClick={() => {
                    setFinalizeOpen(true);
                    setFinalizeBy("");
                  }}
                  disabled={actionPending || hasUncounted}
                  className="bg-success text-white hover:bg-success/90"
                >
                  <CheckCircle2Icon className="mr-1.5 size-3.5" />
                  Finalisasi
                </Button>
              </Can>
            )}
            {!isFinalized && !isDraft && (
              <Can permission="edit-stok-opname">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCancelOpen(true)}
                  disabled={actionPending}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <XCircleIcon className="mr-1.5 size-3.5" />
                  Batalkan
                </Button>
              </Can>
            )}
          </div>
        }
      />

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04] p-5"
      >
        <SectionTitle className="mb-4">
          Informasi Stok Opname (Hitung Fisik)
        </SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow label="No. Stok Opname" value={opname.opname_no} />
          <InfoRow label="Lokasi" value={opname.location?.location_name} />
          <InfoRow
            label="Status"
            value={
              <StatusBadge
                domain="stock-opname"
                status={opname.status}
                className="text-2xs leading-tight"
              />
            }
          />
          <InfoRow label="Dibuat Oleh" value={opname.created_by} />
          <InfoRow label="Diproses Oleh" value={opname.process_by} />
          <InfoRow label="Difinalisasi Oleh" value={opname.finalized_by} />
          <InfoRow
            label="Tgl. Finalisasi"
            value={
              opname.finalized_at
                ? formatDateTimeWib(opname.finalized_at)
                : null
            }
          />
          <InfoRow label="Catatan" value={opname.notes} />
        </div>
      </LiquidGlass>

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04] p-5"
      >
        <SectionTitle className="mb-4">Daftar Item</SectionTitle>
        <div className="border border-border/40 rounded-lg overflow-hidden">
          <DataTable
            columns={columns}
            data={opname.items ?? []}
            hideToolbar
            manualPagination={false}
            tableContainerClassName="border-0 bg-transparent backdrop-blur-none [&_[data-slot=table-header]]:bg-transparent"
            emptyState={<EmptyState title="Belum ada item." />}
          />
        </div>
      </LiquidGlass>

      <ConfirmDialog
        open={startOpen}
        onOpenChange={(open) => {
          if (!open) setStartOpen(false);
        }}
        title="Mulai Stok Opname"
        description={`Mulai stok opname "${opname.opname_no}"? Status akan berubah menjadi Sedang Berjalan.`}
        confirmLabel="Mulai"
        loading={startMut.isPending}
        onConfirm={() => {
          if (!startBy.trim()) return;
          startMut.mutate(
            { id: opname.id, processBy: startBy.trim() },
            { onSuccess: () => setStartOpen(false) },
          );
        }}
      >
        <div className="px-1 py-2">
          <Label htmlFor="opname-start-by" className="text-sm font-medium">
            Diproses oleh <span className="text-destructive">*</span>
          </Label>
          <UserSelect
            value={startBy}
            onChange={setStartBy}
            defaultToSelf
            placeholder="Nama penanggung jawab"
            className="mt-1.5"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={finalizeOpen}
        onOpenChange={(open) => {
          if (!open) setFinalizeOpen(false);
        }}
        title="Finalisasi Stok Opname"
        description={`Finalisasi stok opname "${opname.opname_no}"? Stok akan disesuaikan sesuai hasil penghitungan.`}
        confirmLabel="Finalisasi"
        loading={finalizeMut.isPending}
        onConfirm={() => {
          if (!finalizeBy.trim()) return;
          finalizeMut.mutate(
            { id: opname.id, finalizedBy: finalizeBy.trim() },
            { onSuccess: () => setFinalizeOpen(false) },
          );
        }}
      >
        <div className="space-y-3 px-1 py-2">
          <div>
            <Label htmlFor="opname-finalize-by" className="text-sm font-medium">
              Difinalisasi oleh <span className="text-destructive">*</span>
            </Label>
            <UserSelect
              value={finalizeBy}
              onChange={setFinalizeBy}
              defaultToSelf
              placeholder="Nama penanggung jawab"
              className="mt-1.5"
            />
          </div>
          <p className="text-xs text-warning">
            Pastikan semua item sudah dihitung.
          </p>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={(open) => {
          if (!open) setCancelOpen(false);
        }}
        title="Batalkan Stok Opname"
        description={`Batalkan stok opname "${opname.opname_no}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Batalkan"
        variant="destructive"
        loading={cancelMut.isPending}
        onConfirm={() => {
          cancelMut.mutate(opname.id, {
            onSuccess: () => setCancelOpen(false),
          });
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteOpen(false);
        }}
        title="Hapus Stok Opname"
        description={`Hapus stok opname "${opname.opname_no}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={() => {
          deleteMut.mutate(opname.id, {
            onSuccess: () => {
              setDeleteOpen(false);
              router.push("/dashboard/transaksi-stok?tab=penyesuaian");
            },
          });
        }}
      />

      <ConfirmDialog
        open={countDialog.open}
        onOpenChange={(open) => {
          if (!open) setCountDialog(EMPTY_COUNT);
        }}
        title="Hitung Item"
        description={`Input jumlah aktual untuk "${countDialog.productName}".`}
        confirmLabel="Simpan"
        loading={countMut.isPending}
        onConfirm={() => {
          if (countDialog.qtyActual === "") return;
          countMut.mutate(
            {
              opnameId: opname.id,
              itemId: countDialog.itemId,
              data: {
                qty_actual: Number(countDialog.qtyActual),
                reason: countDialog.reason.trim() || undefined,
                counted_by: countDialog.countedBy.trim() || "",
              },
            },
            { onSuccess: () => setCountDialog(EMPTY_COUNT) },
          );
        }}
      >
        <div className="space-y-3 px-1 py-2">
          <div>
            <Label htmlFor="count-qty" className="text-sm font-medium">
              Stok Aktual <span className="text-destructive">*</span>
            </Label>
            <Input
              id="count-qty"
              type="number"
              min={0}
              placeholder="0"
              value={countDialog.qtyActual}
              onChange={(e) =>
                setCountDialog((p) => ({ ...p, qtyActual: e.target.value }))
              }
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="count-reason" className="text-sm font-medium">
              Alasan
            </Label>
            <Input
              id="count-reason"
              placeholder="Opsional"
              value={countDialog.reason}
              onChange={(e) =>
                setCountDialog((p) => ({ ...p, reason: e.target.value }))
              }
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="count-by" className="text-sm font-medium">
              Dihitung Oleh
            </Label>
            <UserSelect
              value={countDialog.countedBy}
              onChange={(name) =>
                setCountDialog((p) => ({ ...p, countedBy: name }))
              }
              defaultToSelf
              placeholder="Nama penghitung"
              className="mt-1.5"
            />
          </div>
        </div>
      </ConfirmDialog>
    </div>
  );
}
