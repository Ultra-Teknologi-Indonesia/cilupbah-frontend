"use client";

import * as React from "react";
import { PackageSearchIcon, InboxIcon } from "lucide-react";
import Image from "next/image";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectionTitle } from "@/components/dashboard/shared/section-title";
import { PageTitle } from "@/components/dashboard/page-title";
import { EmptyState } from "@/components/ui/empty-state";
import { useBinTransferReceiptDetail } from "@/hooks/transaksi-stok/use-bin-transfer";
import { formatDateTimeFull, formatDateTimeWib } from "@/lib/format";

const LIST_HREF = "/dashboard/transaksi-stok?tab=selesai";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-40 shrink-0 text-sm font-medium text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function PenerimaanTransferDetailView({ id }: { id: string }) {
  const { data: detail, isLoading } = useBinTransferReceiptDetail(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageTitle
          title="Detail Penerimaan"
          description="Memuat detail penerimaan transfer..."
          backHref={LIST_HREF}
        />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-6">
        <PageTitle title="Detail Penerimaan" backHref={LIST_HREF} />
        <EmptyState
          icon={PackageSearchIcon}
          title="Penerimaan Tidak Ditemukan"
          description="Data penerimaan transfer ini mungkin sudah dihapus atau Anda tidak memiliki akses."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <PageTitle
        title={`Penerimaan ${detail.receipt_number}`}
        description="Detail penerimaan barang dari dokumen transfer internal"
        backHref={LIST_HREF}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Info Dokumen */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <SectionTitle className="mb-4">Informasi Dokumen</SectionTitle>
          <div className="space-y-3">
            <InfoRow label="No. Penerimaan" value={detail.receipt_number} />
            <InfoRow
              label="No. Transfer Asal"
              value={detail.bin_transfer?.transfer_number || "—"}
            />
            <InfoRow
              label="Tgl Transfer"
              value={
                detail.bin_transfer?.transfer_date
                  ? formatDateTimeWib(detail.bin_transfer.transfer_date)
                  : "—"
              }
            />
            <InfoRow
              label="Lokasi"
              value={detail.location?.location_name || "—"}
            />
            <InfoRow
              label="Tgl Diterima"
              value={
                detail.received_at
                  ? formatDateTimeFull(detail.received_at)
                  : "—"
              }
            />
            <InfoRow label="Diterima Oleh" value={detail.received_by || "—"} />
            <InfoRow label="Keterangan" value={detail.notes || "—"} />
          </div>
        </div>
      </div>

      {/* Tabel Barang */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b bg-muted/40 p-4">
          <div className="space-y-0.5">
            <SectionTitle>Daftar Barang Diterima</SectionTitle>
            <p className="text-xs text-muted-foreground">
              {`Terdapat ${detail.items?.length || 0} baris barang yang diterima.`}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20">
                <TableHead className="w-[80px]">Foto</TableHead>
                <TableHead className="min-w-[200px]">Produk & SKU</TableHead>
                <TableHead className="min-w-[120px]">Rak Asal</TableHead>
                <TableHead className="min-w-[120px]">Rak Tujuan</TableHead>
                <TableHead className="text-right">Qty Diterima</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.items?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <EmptyState
                      icon={InboxIcon}
                      title="Belum Ada Barang"
                      description="Penerimaan ini tidak memiliki rincian barang."
                    />
                  </TableCell>
                </TableRow>
              )}
              {detail.items?.map((row) => {
                const prod = row.transfer_item?.product;
                const sku = prod?.sku || row.transfer_item?.item_id;
                const name = prod?.product?.name || sku;
                const src = prod?.thumbnail_url || "/placeholder.jpg";
                const vlabel = prod?.variant_label;
                const sourceBin =
                  row.transfer_item?.source_bin?.bin_final_code || "—";
                const destBin = row.destination_bin?.bin_final_code || "—";

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="relative size-12 overflow-hidden rounded-md border bg-muted/50">
                        <Image
                          src={src}
                          alt={name || ""}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium line-clamp-2 text-foreground">
                          {name}
                        </span>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                            {sku}
                          </span>
                          {vlabel && <span>• {vlabel}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{sourceBin}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{destBin}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium text-primary">
                        {row.qty}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
