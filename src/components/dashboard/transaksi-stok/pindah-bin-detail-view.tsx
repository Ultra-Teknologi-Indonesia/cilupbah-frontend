"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  CheckIcon,
  Loader2Icon,
  PackageSearchIcon,
  PencilIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LiquidGlass } from "@/components/ui/liquid-glass";
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
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { PageTitle } from "@/components/dashboard/page-title";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useBinTransferDetail,
  useBinTransferItemDelete,
  type BinTransferDetailItem,
} from "@/hooks/transaksi-stok/use-bin-transfer";
import { formatDateTimeFull } from "@/lib/format";
import { usePermissions } from "@/hooks/auth/use-permissions";

const LIST_HREF = "/dashboard/transaksi-stok?tab=transfer";

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

function TimelineStep({
  label,
  timestamp,
  actor,
  active,
  done,
}: {
  label: string;
  timestamp?: string | null;
  actor?: string | null;
  active?: boolean;
  done?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 text-center">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 ${
          done
            ? "border-primary bg-primary/10 text-primary"
            : active
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/20 bg-muted text-muted-foreground"
        }`}
      >
        {done || active ? (
          <CheckIcon className="size-5" />
        ) : (
          <span className="text-sm font-semibold">•</span>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          {label}
          {timestamp ? ` — ${formatDateTimeFull(timestamp)}` : ""}
        </p>
        {actor && <p className="text-xs text-muted-foreground">{actor}</p>}
      </div>
    </div>
  );
}

function CorrectItemButton({
  transferId,
  item,
  canCorrect,
}: {
  transferId: string;
  item: BinTransferDetailItem;
  canCorrect: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const deleteMutation = useBinTransferItemDelete(transferId);

  if (!canCorrect) return null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        disabled={deleteMutation.isPending}
        className="text-muted-foreground hover:text-destructive"
        aria-label="Koreksi baris"
      >
        {deleteMutation.isPending ? (
          <Loader2Icon className="size-3.5 animate-spin" />
        ) : (
          <Trash2Icon className="size-3.5" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Koreksi Baris Pindah Bin</DialogTitle>
            <DialogDescription>
              Kembalikan {item.qty} unit dari rak{" "}
              <span className="font-mono font-medium">
                {item.destination_bin?.bin_final_code ?? "—"}
              </span>{" "}
              ke rak asal{" "}
              <span className="font-mono font-medium">
                {item.source_bin?.bin_final_code ?? "—"}
              </span>
              ? Baris ini akan dihapus.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteMutation.mutate(
                  { itemId: item.id },
                  { onSuccess: () => setOpen(false) },
                )
              }
            >
              {deleteMutation.isPending ? "Mengoreksi…" : "Ya, Koreksi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PindahBinDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { can } = usePermissions();
  const canEditTransfer = can("edit-pindah-bin");
  const { data: trf, isLoading } = useBinTransferDetail(id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!trf) {
    return (
      <EmptyState
        icon={PackageSearchIcon}
        title="Transfer internal tidak ditemukan."
        className="py-20"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href={LIST_HREF}>Kembali</Link>
          </Button>
        }
      />
    );
  }

  const timestamp = trf.created_at ?? trf.transfer_date;
  const printed = !!trf.printed_at || trf.status !== "BARU_DIBUAT";
  const done = trf.status === "SELESAI";
  const lastReceipt =
    trf.receipts && trf.receipts.length > 0
      ? trf.receipts[trf.receipts.length - 1]
      : null;

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        title={`Transfer Internal - ${trf.transfer_number}`}
        backHref={LIST_HREF}
        breadcrumb={[
          { label: "Persediaan" },
          { label: "Transaksi Stok", href: LIST_HREF },
          { label: "Transfer Internal", href: LIST_HREF },
          { label: trf.transfer_number },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {canEditTransfer && (
              <Button
                size="sm"
                onClick={() =>
                  router.push(
                    `/dashboard/transaksi-stok/pindah-bin/${trf.id}/edit`,
                  )
                }
              >
                <PencilIcon className="mr-1.5 size-3.5" />
                Edit
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => router.push(LIST_HREF)}
              aria-label="Tutup"
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        }
      />

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="flex items-center gap-3 px-5 py-6">
          <TimelineStep
            label="Dibuat"
            timestamp={timestamp}
            actor={trf.created_by}
            done
          />
          <div
            className={`mt-5 h-0.5 flex-1 ${printed ? "bg-primary/40" : "bg-muted-foreground/20"}`}
          />
          <TimelineStep
            label="Sedang Dijalan"
            timestamp={trf.printed_at}
            actor={trf.printed_by}
            done={printed && done}
            active={printed && !done}
          />
          <div
            className={`mt-5 h-0.5 flex-1 ${done ? "bg-primary/40" : "bg-muted-foreground/20"}`}
          />
          <TimelineStep
            label="Selesai"
            timestamp={lastReceipt?.received_at}
            actor={lastReceipt?.received_by}
            active={done}
          />
        </div>
      </LiquidGlass>

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
          <InfoRow
            label="Tgl. Transfer"
            value={
              trf.transfer_date ? formatDateTimeFull(trf.transfer_date) : null
            }
          />
          <InfoRow label="No. Transfer Internal" value={trf.transfer_number} />
          <InfoRow label="Lokasi" value={trf.location?.location_name ?? "—"} />
          <InfoRow label="Dibuat Oleh" value={trf.created_by} />
          <InfoRow
            label="Status"
            value={<StatusBadge domain="bin-transfer" status={trf.status} />}
          />
          <InfoRow label="Dicetak Oleh" value={trf.printed_by ?? "—"} />
          <div className="sm:col-span-2">
            <InfoRow label="Keterangan" value={trf.notes ?? "—"} />
          </div>
        </div>
      </LiquidGlass>

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="flex flex-col gap-4 px-5 py-5">
          <SectionTitle>Produk ({trf.items?.length ?? 0})</SectionTitle>
          <Table containerClassName="rounded-lg border border-border">
            <TableHeader className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <TableRow>
                <TableHead className="px-3 py-2.5 text-muted-foreground">
                  Produk
                </TableHead>
                <TableHead className="px-3 py-2.5 text-muted-foreground">
                  Rak Asal
                </TableHead>
                <TableHead className="px-3 py-2.5 text-muted-foreground">
                  Rak Tujuan
                </TableHead>
                <TableHead className="px-3 py-2.5 text-right text-muted-foreground">
                  Qty
                </TableHead>
                <TableHead className="px-3 py-2.5 text-right text-muted-foreground">
                  Ditempatkan
                </TableHead>
                <TableHead className="px-3 py-2.5 text-right text-muted-foreground">
                  Sisa
                </TableHead>
                <TableHead className="px-3 py-2.5 text-muted-foreground">
                  Keterangan
                </TableHead>
                <TableHead className="px-3 py-2.5 text-right text-muted-foreground">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border">
              {(trf.items ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    Tidak ada produk.
                  </TableCell>
                </TableRow>
              ) : (
                (trf.items ?? []).map((it) => {
                  const p = it.product as
                    | (NonNullable<typeof it.product> & {
                        thumbnail_url?: string | null;
                        media?: { url?: string | null }[];
                        product?: { media?: { url?: string | null }[] } | null;
                      })
                    | null
                    | undefined;
                  const image =
                    p?.thumbnail_url ??
                    p?.media?.[0]?.url ??
                    p?.product?.media?.[0]?.url ??
                    null;
                  return (
                    <TableRow key={it.id} className="bg-background/50">
                      <TableCell className="px-3 py-2.5 align-top">
                        <div className="flex max-w-[280px] items-start gap-3">
                          {image ? (
                            <Image
                              src={image}
                              alt={p?.product?.name ?? p?.sku ?? "Produk"}
                              width={40}
                              height={40}
                              className="h-10 w-10 shrink-0 rounded-xl border border-border object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                              <PackageSearchIcon className="size-5 text-muted-foreground/40" />
                            </div>
                          )}
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <p className="whitespace-normal break-words text-sm font-medium">
                              {p?.product?.name ?? "—"}
                            </p>
                            {p?.variant_label && (
                              <p className="whitespace-normal break-words text-xs text-muted-foreground">
                                {p.variant_label}
                              </p>
                            )}
                            <p className="whitespace-normal break-all font-mono text-2xs text-muted-foreground">
                              {p?.sku ?? "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 font-mono text-xs text-foreground">
                        {it.source_bin?.bin_final_code ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 font-mono text-xs text-foreground">
                        {it.destination_bin?.bin_final_code ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-mono tabular-nums">
                        {it.qty}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                        {it.placed_qty ?? 0}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                        {it.remaining_qty ?? 0}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-muted-foreground">
                        {it.notes ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right">
                        {(it.placed_qty ?? 0) > 0 ? (
                          <CorrectItemButton
                            transferId={trf.id}
                            item={it}
                            canCorrect={canEditTransfer}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </LiquidGlass>
    </div>
  );
}
