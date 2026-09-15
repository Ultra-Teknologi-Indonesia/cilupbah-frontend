"use client";
import { EmptyState } from "@/components/ui/empty-state";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { PrinterIcon, Trash2Icon, ImageIcon, PencilIcon } from "lucide-react";
import { toast } from "sonner";

import { apiError } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { PageTitle } from "@/components/dashboard/page-title";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { InfoField } from "@/components/dashboard/shared/info-field";
import { SectionTitle } from "@/components/dashboard/shared/section-title";
import { CopySku } from "@/components/dashboard/shared/copy-sku";
import {
  useOutboundTransferDetail,
  useSubmitDraft,
  useShipTransfer,
  useDeleteTransfer,
} from "@/hooks/barang-keluar/use-outbound-transfers";
import { useMe } from "@/hooks/auth/use-auth";
import { useState, useCallback } from "react";
import { formatDateTime } from "@/lib/format";

const LIST_HREF = "/dashboard/barang-keluar?tab=transfer";

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <InfoField label={label} value={value} />;
}

export function TransferOutDetailView({ transferId }: { transferId: string }) {
  const router = useRouter();
  const { data: transfer, isLoading } = useOutboundTransferDetail(transferId);
  const { data: me } = useMe();
  const meName = me?.name ?? "";

  const submitMutation = useSubmitDraft();
  const shipMutation = useShipTransfer();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMutation = useDeleteTransfer();
  const [printing, setPrinting] = useState(false);

  const openPreview = useCallback(() => {
    window.open(
      `/dashboard/document-preview/transfer-out/${transferId}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, [transferId]);

  const handlePrint = useCallback(async () => {
    if (!transfer || printing) return;
    setPrinting(true);
    try {
      if (transfer.status === "DRAFT") {
        await submitMutation.mutateAsync(transfer.id);
        toast.success("Transfer dikirim — pindah ke Sedang Dijalan");
      } else if (transfer.status === "APPROVED") {
        await shipMutation.mutateAsync({
          id: transfer.id,
          data: { shipped_by: meName },
        });
        toast.success("Transfer dikirim — pindah ke Sedang Dijalan");
      }
      openPreview();
    } catch (err) {
      apiError(err, "Gagal mencetak transfer");
    } finally {
      setPrinting(false);
    }
  }, [transfer, printing, submitMutation, shipMutation, meName, openPreview]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <p className="text-sm font-medium">Transfer tidak ditemukan</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(LIST_HREF)}
        >
          Kembali
        </Button>
      </div>
    );
  }

  const isBaruDibuat =
    transfer.status === "DRAFT" || transfer.status === "APPROVED";
  const isInTransit = transfer.status === "IN_TRANSIT";
  const isEditable = isBaruDibuat || isInTransit;

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={transfer.transfer_number}
        description="Detail transfer keluar"
        backHref={LIST_HREF}
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Gudang" },
          { label: "Barang Keluar", href: LIST_HREF },
          { label: transfer.transfer_number },
        ]}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="print:hidden"
              onClick={handlePrint}
              disabled={printing}
            >
              <PrinterIcon className="mr-1.5 size-4" />
              {isBaruDibuat ? "Cetak & Kirim" : "Cetak"}
            </Button>
            {isEditable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(`${LIST_HREF}/transfer/${transfer.id}/edit`)
                }
              >
                <PencilIcon className="mr-1.5 size-4" />
                Ubah
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2Icon className="mr-1.5 size-4" />
              Hapus
            </Button>
          </>
        }
      />

      <LiquidGlass
        radius={20}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04]"
      >
        <div className="px-4 py-5 sm:px-6">
          <SectionTitle className="mb-4">Informasi Transfer</SectionTitle>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            <InfoRow label="No. Transfer" value={transfer.transfer_number} />
            <InfoRow
              label="Lokasi Asal"
              value={transfer.source_location?.location_name}
            />
            <InfoRow
              label="Lokasi Tujuan"
              value={transfer.destination_location?.location_name}
            />
            <InfoRow
              label="Status"
              value={
                <StatusBadge
                  domain="inventory-transfer"
                  status={transfer.status}
                  className="text-xs leading-tight"
                />
              }
            />
            <InfoRow label="Dibuat oleh" value={transfer.created_by} />
            <InfoRow
              label="Tgl. Dibuat"
              value={formatDateTime(transfer.created_at)}
            />
            {transfer.approved_by && (
              <InfoRow label="Disetujui oleh" value={transfer.approved_by} />
            )}
            {transfer.approved_at && (
              <InfoRow
                label="Tgl. Approve"
                value={formatDateTime(transfer.approved_at)}
              />
            )}
            {transfer.assigned_to && (
              <InfoRow label="Petugas" value={transfer.assigned_to} />
            )}
            {transfer.shipped_at && (
              <InfoRow
                label="Tgl. Kirim"
                value={formatDateTime(transfer.shipped_at)}
              />
            )}
            {transfer.received_by && (
              <InfoRow label="Diterima oleh" value={transfer.received_by} />
            )}
            {transfer.received_at && (
              <InfoRow
                label="Tgl. Diterima"
                value={formatDateTime(transfer.received_at)}
              />
            )}
            {transfer.notes && (
              <InfoRow label="Catatan" value={transfer.notes} />
            )}
          </div>
        </div>
      </LiquidGlass>

      <LiquidGlass
        radius={20}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04]"
      >
        <div className="px-4 py-5 sm:px-6">
          <SectionTitle className="mb-4">Item Transfer</SectionTitle>
          {transfer.items?.length > 0 ? (
            <Table containerClassName="rounded-lg border border-border/40">
              <TableHeader>
                <TableRow className="border-b border-border/60 bg-muted/30">
                  {["Produk", "Kode Rak", "Qty", "Qty Diterima"].map((h, i) => (
                    <TableHead
                      key={i}
                      className="px-3 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfer.items.map((item) => {
                  const variant = item.product;
                  const productName = variant?.product?.name ?? "—";
                  const variantOptions = variant?.options
                    ?.map((o) => o.value)
                    .filter(Boolean)
                    .join(", ");
                  const imageUrl =
                    variant?.media?.[0]?.url ??
                    variant?.product?.media?.[0]?.url;
                  return (
                    <TableRow
                      key={item.id}
                      className="border-b border-border/20 last:border-0"
                    >
                      <TableCell className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border bg-muted/50">
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={productName}
                                width={40}
                                height={40}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                                <ImageIcon className="size-4 opacity-50" />
                              </div>
                            )}
                          </div>
                          <div
                            className="flex min-w-0 flex-col gap-0.5"
                            style={{ maxWidth: 360 }}
                          >
                            <span className="font-medium whitespace-normal break-words text-foreground">
                              {productName}
                            </span>
                            {variantOptions && (
                              <span className="whitespace-normal break-words text-xs text-foreground">
                                {variantOptions}
                              </span>
                            )}
                            {variant?.sku && <CopySku sku={variant.sku} />}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5">
                        {item.source_bin?.bin_final_code ? (
                          <span className="font-mono text-xs text-foreground">
                            {item.source_bin.bin_final_code}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 tabular-nums text-foreground">
                        {item.qty}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 tabular-nums text-muted-foreground">
                        {item.received_qty ?? 0}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="Belum ada item" />
          )}
        </div>
      </LiquidGlass>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Batalkan Transfer"
        description={`Batalkan transfer ${transfer.transfer_number}? Aktivitas stok akan dibersihkan, saldo dikembalikan ke kondisi awal, dan dokumen di-reset ke status Draft.`}
        confirmLabel="Batalkan & Reset"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate(transfer.id, {
            onSuccess: () => {
              setDeleteOpen(false);
              router.push(LIST_HREF);
            },
          });
        }}
      />

      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          nav,
          header,
          aside,
          footer {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
