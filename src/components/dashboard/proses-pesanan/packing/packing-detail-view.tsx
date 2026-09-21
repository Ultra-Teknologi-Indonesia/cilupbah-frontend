"use client";

import { DetailSkeleton } from "@/components/ui/page-skeleton";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  Loader2Icon,
  PackageIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ScanAutoflowBar,
  type ScanAutoflowLine,
} from "@/components/dashboard/shared/scan-autoflow-bar";
import { PageTitle } from "@/components/dashboard/page-title";
import { DeleteOrderDialog } from "@/components/dashboard/proses-pesanan/shared/delete-order-dialog";
import { playScanFeedback } from "@/lib/scan-feedback";
import { apiError } from "@/lib/toast";
import { type PacklistItem } from "@/types/proses-pesanan/fulfillment";
import {
  useCompletePacklist,
  usePackItem,
  useUnpackItem,
  usePacklistDetail,
  useStartPacklist,
  useVerifyBarcode,
} from "@/hooks/proses-pesanan/use-fulfillment";
import { usePrintWithDriverCall } from "@/hooks/proses-pesanan/use-driver-call";
import { isShopeeInstantOrSameDay } from "@/lib/proses-pesanan/shopee";
import { useQtyBumpQueue } from "@/hooks/proses-pesanan/use-qty-bump-queue";
import { usePermissions } from "@/hooks/auth/use-permissions";

function PackCorrectButton({
  packlistId,
  item,
}: {
  packlistId: string;
  item: PacklistItem;
}) {
  const [open, setOpen] = React.useState(false);
  const unpack = useUnpackItem();

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(true)}
        disabled={unpack.isPending}
        className="text-muted-foreground hover:text-destructive"
        aria-label="Koreksi pack"
      >
        {unpack.isPending ? (
          <Loader2Icon className="size-3.5 animate-spin" />
        ) : (
          <Trash2Icon className="size-3.5" />
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Koreksi Pack</DialogTitle>
            <DialogDescription>
              Batalkan {item.qtyPacked} unit yang sudah di-pack untuk{" "}
              <span className="font-medium">
                {item.description ?? item.sku}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={unpack.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={unpack.isPending}
              onClick={() =>
                unpack.mutate(
                  { packlistId, itemId: item.id },
                  { onSuccess: () => setOpen(false) },
                )
              }
            >
              {unpack.isPending ? "Mengoreksi…" : "Ya, Koreksi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const LIST_HREF = "/dashboard/proses-pesanan/packing";

function ItemImage({
  src,
  alt,
  size = 48,
}: {
  src: string | null;
  alt: string;
  size?: number;
}) {
  const [errored, setErrored] = React.useState(false);
  if (!src || errored) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground"
        style={{ width: size, height: size }}
      >
        <PackageIcon className="size-5" />
      </div>
    );
  }
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl border border-border bg-muted"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

function ProgressBar({ packed, total }: { packed: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((packed / total) * 100)) : 0;
  const done = packed >= total && total > 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {packed} / {total}
        </span>
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            done ? "bg-success" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PackingDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { can } = usePermissions();
  const canEditPacking = can("edit-packing");
  const canEditShipping = can("edit-pengiriman");
  const canDeleteOrder = can("delete-pesanan");

  const [deleteOrderOpen, setDeleteOrderOpen] = React.useState(false);
  const [scanFocusKey, setScanFocusKey] = React.useState(0);
  const refocusScan = () => setScanFocusKey((k) => k + 1);

  const { data: pk, isLoading, isError } = usePacklistDetail(id);
  const startPacklist = useStartPacklist();
  const packItem = usePackItem();
  const verifyBarcode = useVerifyBarcode();
  const completePacklist = useCompletePacklist();

  const commitPack = React.useCallback(
    (itemId: string, qty: number) =>
      packItem.mutateAsync({
        packlistId: id,
        itemId,
        qtyPacked: qty,
        barcodeVerified: true,
      }),
    [packItem, id],
  );
  const { bump } = useQtyBumpQueue(commitPack, {
    onGiveUp: (itemId) => {
      const item = pk?.items.find((i) => i.id === itemId);
      playScanFeedback("error");
      toast.error(
        `Gagal menyimpan hasil scan ${item?.sku ?? ""} — scan ulang barang ini.`,
      );
    },
  });

  const items = pk?.items ?? [];
  const totalOrdered = items.reduce((s, i) => s + i.qtyOrdered, 0);
  const totalPacked = items.reduce((s, i) => s + i.qtyPacked, 0);
  const allPacked =
    items.length > 0 && items.every((i) => i.qtyPacked >= i.qtyOrdered);
  const isTerminal = pk
    ? ["COMPLETED", "CANCELLED"].includes(pk.status)
    : false;
  const editable = !!pk && !isTerminal && canEditPacking;

  const printWithDriverCall = usePrintWithDriverCall();

  const triggerShopeeDriverCall = React.useCallback(() => {
    if (!canEditShipping || !pk?.orderId) return;
    const isShopeeInstant = isShopeeInstantOrSameDay({
      shippingProvider: pk.shippingProvider,
      shippingType: pk.shippingType,
      isInstant: pk.isInstant,
    });
    if (!isShopeeInstant) return;

    printWithDriverCall.mutate(
      { orderId: pk.orderId },
      {
        onSuccess: (res) => {
          if (res.driver_call_status === "success") {
            toast.success("Driver Shopee berhasil dipanggil.");
          } else if (res.driver_call_status === "failed") {
            toast.warning(
              `Panggilan driver Shopee gagal: ${res.driver_call_message ?? "Coba lagi nanti."}`,
            );
          }
        },
        onError: () => {
          toast.warning("Gagal memanggil driver Shopee otomatis.");
        },
      },
    );
  }, [pk, printWithDriverCall, canEditShipping]);

  const didAutoComplete = React.useRef(false);
  React.useEffect(() => {
    if (!pk || didAutoComplete.current) return;
    if (allPacked && pk.status !== "COMPLETED" && canEditPacking) {
      didAutoComplete.current = true;
      completePacklist.mutate(id, {
        onSuccess: () => {
          toast.success("Semua item sudah dikemas. Packing selesai!");
          triggerShopeeDriverCall();
          router.push(LIST_HREF);
        },
        onError: (e) => {
          didAutoComplete.current = false;
          apiError(e, "Gagal menyelesaikan packing.");
        },
      });
    }
  }, [
    pk,
    allPacked,
    id,
    completePacklist,
    router,
    triggerShopeeDriverCall,
    canEditPacking,
  ]);

  React.useEffect(() => {
    if (pk && pk.status === "DRAFT" && canEditPacking) {
      startPacklist.mutate(id, {
        onError: (e) => apiError(e, "Gagal memulai packing."),
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pk?.id, canEditPacking]);

  const scanLines: ScanAutoflowLine[] = items.map((i) => ({
    id: i.id,
    primary: i.description ?? i.sku,
    secondary: i.sku,
    codes: [i.sku],
    done: i.qtyPacked >= i.qtyOrdered,
  }));

  const increment = (item: PacklistItem) => {
    const remaining = item.qtyOrdered - item.qtyPacked;
    if (remaining <= 0) {
      playScanFeedback("error");
      toast.info(`${item.sku} sudah lengkap.`);
      refocusScan();
      return;
    }
    bump({
      itemId: item.id,
      base: item.qtyPacked,
      max: item.qtyOrdered,
      delta: 1,
    });
    refocusScan();
  };

  const handleResolve = (line: ScanAutoflowLine) => {
    const item = items.find((i) => i.id === line.id);
    if (item) increment(item);
  };

  const handleUnmatched = (code: string) => {
    if (!id) return;
    verifyBarcode.mutate(
      { packlistId: id, barcode: code },
      {
        onSuccess: (res) => {
          if (!res) {
            toast.error(`SKU/Barcode "${code}" tidak ditemukan.`);
            playScanFeedback("sku_mismatch");
            return;
          }
          const matched = items.find((i) => i.id === res.itemId);
          if (matched) {
            playScanFeedback("ok");
            increment(matched);
          } else {
            toast.info(`${res.sku} sudah lengkap.`);
            playScanFeedback("error");
          }
        },
        onError: (e) => {
          apiError(e, "Barcode tidak valid.");
          playScanFeedback("error");
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <PageTitle
          title="Proses Packing"
          breadcrumb={[
            { label: "Gudang" },
            { label: "Proses Pesanan", href: LIST_HREF },
            { label: "Packing" },
            { label: "Proses Packing" },
          ]}
          actions={
            <Button variant="outline" onClick={() => router.push(LIST_HREF)}>
              <ArrowLeftIcon /> Kembali
            </Button>
          }
        />
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !pk) {
    return (
      <div className="flex flex-col gap-6">
        <PageTitle
          title="Proses Packing"
          breadcrumb={[
            { label: "Gudang" },
            { label: "Proses Pesanan", href: LIST_HREF },
            { label: "Packing" },
            { label: "Proses Packing" },
          ]}
          actions={
            <Button variant="outline" onClick={() => router.push(LIST_HREF)}>
              <ArrowLeftIcon /> Kembali
            </Button>
          }
        />
        <div className="py-24 text-center text-sm text-destructive">
          Gagal memuat packlist.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Proses Packing"
        backHref={LIST_HREF}
        breadcrumb={[
          { label: "Gudang" },
          { label: "Proses Pesanan", href: LIST_HREF },
          { label: "Packing" },
          { label: "Proses Packing" },
        ]}
        actions={
          pk.orderId && canDeleteOrder ? (
            <Button
              variant="outline"
              size="sm"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteOrderOpen(true)}
            >
              <Trash2Icon className="size-4 mr-1.5" />
              Hapus Pesanan
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">
                  No. Packing
                </span>
                <div className="font-mono font-semibold">{pk.packlistNo}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Pesanan</span>
                <div className="font-medium">{pk.orderNo ?? "—"}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Customer</span>
                <div className="font-medium">{pk.customerName ?? "—"}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Packer</span>
                <div className="font-medium">{pk.packerName ?? "—"}</div>
              </div>
            </div>
          </div>

          {editable && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <label className="text-xs font-medium text-muted-foreground">
                Scan SKU / Barcode Produk
              </label>
              <ScanAutoflowBar
                lines={scanLines}
                onResolve={handleResolve}
                onUnmatched={handleUnmatched}
                refocusKey={scanFocusKey}
                hideManualSelect
                hint="Scan SKU/barcode → qty pack +1 tiap scan. Untuk bulk, ketik qty di kolom QTY Pack lalu Enter."
                className="mt-1.5"
              />
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            {items.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Tidak ada item dalam packlist ini.
              </div>
            ) : (
              <Table className="table-fixed border-collapse">
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                    <TableHead className="px-4 py-3 text-muted-foreground">
                      Produk
                    </TableHead>
                    <TableHead className="w-28 px-4 py-3 text-muted-foreground text-center">
                      QTY Pesanan
                    </TableHead>
                    <TableHead className="w-24 px-4 py-3 text-muted-foreground text-center">
                      QTY Pack
                    </TableHead>
                    <TableHead className="w-28 px-4 py-3 text-muted-foreground text-center">
                      Status
                    </TableHead>
                    <TableHead className="w-20 px-4 py-3 text-muted-foreground text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const done = item.qtyPacked >= item.qtyOrdered;
                    return (
                      <TableRow
                        key={item.id}
                        className={cn(
                          "border-b border-border/60 last:border-0 transition-colors",
                          done && "bg-success/[0.04]",
                        )}
                      >
                        <TableCell className="whitespace-normal px-4 py-3">
                          <div className="flex items-center gap-3">
                            <ItemImage
                              src={item.imageUrl}
                              alt={item.description ?? item.sku}
                              size={80}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground break-words">
                                {item.description ?? item.sku}
                              </p>
                              <p
                                className="select-none font-mono text-2xs text-muted-foreground"
                                onCopy={(e) => e.preventDefault()}
                                onContextMenu={(e) => e.preventDefault()}
                              >
                                {item.sku}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center tabular-nums font-medium text-foreground">
                          {item.qtyOrdered}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex h-7 min-w-12 items-center justify-center rounded-xl px-2.5 text-sm font-semibold tabular-nums",
                              done
                                ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
                                : item.qtyPacked > 0
                                  ? "bg-warning/10 text-warning"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {item.qtyPacked}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-center">
                          {done ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                              <CheckCircle2Icon className="size-3.5" /> Selesai
                            </span>
                          ) : item.qtyPacked > 0 ? (
                            <span className="text-xs font-medium text-warning">
                              Sisa {item.qtyOrdered - item.qtyPacked}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Belum
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          {editable && canEditPacking && item.qtyPacked > 0 ? (
                            <PackCorrectButton packlistId={id} item={item} />
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <ProgressBar packed={totalPacked} total={totalOrdered} />
          </div>

          {items.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                Produk dalam paket
              </p>
              <div className="grid grid-cols-2 gap-3">
                {items.map((item) => {
                  const done = item.qtyPacked >= item.qtyOrdered;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "relative overflow-hidden rounded-xl border-2 transition-colors",
                        done ? "border-success/40" : "border-border/60",
                      )}
                    >
                      <ItemImage
                        src={item.imageUrl}
                        alt={item.description ?? item.sku}
                        size={192}
                      />
                      {done && (
                        <div className="absolute inset-0 flex items-center justify-center bg-success/20">
                          <CheckCircle2Icon className="size-10 text-success" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                        <p className="truncate text-xs font-semibold text-white">
                          {item.qtyPacked}/{item.qtyOrdered}
                        </p>
                        <p className="truncate text-2xs text-white/80">
                          {item.sku}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      {canDeleteOrder && (
        <DeleteOrderDialog
          open={deleteOrderOpen}
          onOpenChange={setDeleteOrderOpen}
          orders={pk.orderId ? [{ id: pk.orderId, no: pk.orderNo }] : []}
          onDeleted={() => router.push(LIST_HREF)}
        />
      )}
    </div>
  );
}
