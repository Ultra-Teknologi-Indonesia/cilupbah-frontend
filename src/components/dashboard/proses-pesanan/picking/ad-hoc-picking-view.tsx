"use client";

import { DetailSkeleton } from "@/components/ui/page-skeleton";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PackageIcon,
  ScanBarcodeIcon,
  ScanLineIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageTitle } from "@/components/dashboard/page-title";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import {
  useAdHocPickScan,
  useGetOrderByNo,
} from "@/hooks/proses-pesanan/use-fulfillment";
import { playScanFeedback } from "@/lib/scan-feedback";
import { apiError } from "@/lib/toast";

const LIST_HREF = "/dashboard/proses-pesanan/picking";

interface AdHocItem {
  id: string;
  sku: string;
  description: string | null;
  qtyOrdered: number;
  qtyPicked: number;
  imageUrl: string | null;
}

interface AdHocOrder {
  id: string;
  salesorderNo: string;
  trackingNumber: string | null;
  locationName: string | null;
  status: string | null;
  items: AdHocItem[];
}

interface RawItem {
  id: string;
  sku: string;
  description?: string | null;
  qty_in_base?: number;
  image_url?: string | null;
}

interface RawOrder {
  id: string;
  salesorder_no: string;
  tracking_number?: string | null;
  status?: string | null;
  location?: { location_name?: string | null } | null;
  location_name?: string | null;
  items?: RawItem[];
}

function mapOrder(raw: RawOrder): AdHocOrder {
  return {
    id: raw.id,
    salesorderNo: raw.salesorder_no,
    trackingNumber: raw.tracking_number ?? null,
    status: raw.status ?? null,
    locationName: raw.location?.location_name ?? raw.location_name ?? null,
    items: (raw.items ?? []).map((it: RawItem) => ({
      id: it.id,
      sku: it.sku,
      description: it.description ?? null,
      qtyOrdered: Number(it.qty_in_base ?? 0),
      qtyPicked: 0,
      imageUrl: it.image_url ?? null,
    })),
  };
}

function ItemImage({ src, alt }: { src: string | null; alt: string }) {
  const [errored, setErrored] = React.useState(false);
  if (!src || errored) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
        <PackageIcon className="size-5" />
      </div>
    );
  }
  return (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="48px"
        className="object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

function getItemStatus(picked: number, ordered: number) {
  if (picked >= ordered && ordered > 0) return "COMPLETED";
  if (picked > 0) return "PARTIAL";
  return "PENDING";
}

export function AdHocPickingView() {
  const router = useRouter();

  const orderScanRef = React.useRef<HTMLInputElement>(null);
  const skuScanRef = React.useRef<HTMLInputElement>(null);
  const binScanRef = React.useRef<HTMLInputElement>(null);

  const [orderScan, setOrderScan] = React.useState("");
  const [skuScan, setSkuScan] = React.useState("");
  const [binScan, setBinScan] = React.useState("");
  const [scannedBinCode, setScannedBinCode] = React.useState<string | null>(
    null,
  );
  const [pickedBinByItem, setPickedBinByItem] = React.useState<
    Record<string, string>
  >({});
  const [order, setOrder] = React.useState<AdHocOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = React.useState(false);
  const [notes, setNotes] = React.useState("");

  const scanMutation = useAdHocPickScan();
  const getOrderByNo = useGetOrderByNo();

  React.useEffect(() => {
    orderScanRef.current?.focus();
  }, []);

  const totalOrdered = React.useMemo(
    () => (order?.items ?? []).reduce((s, i) => s + i.qtyOrdered, 0),
    [order],
  );
  const totalPicked = React.useMemo(
    () => (order?.items ?? []).reduce((s, i) => s + i.qtyPicked, 0),
    [order],
  );
  const allPicked =
    !!order &&
    order.items.length > 0 &&
    order.items.every((i) => i.qtyPicked >= i.qtyOrdered);

  const handleScanOrder = async () => {
    const code = orderScan.trim();
    if (!code) return;
    setOrderScan("");
    setLoadingOrder(true);
    try {
      const raw = (await getOrderByNo.mutateAsync(code)) as RawOrder | null;
      if (!raw) {
        playScanFeedback("error");
        toast.error(`Order "${code}" tidak ditemukan.`);
        orderScanRef.current?.focus();
        return;
      }
      const mapped = mapOrder(raw);
      if (mapped.status !== "reserved") {
        playScanFeedback("error");
        toast.error(
          `Order ${mapped.salesorderNo} berstatus '${mapped.status ?? "?"}' — hanya 'reserved' yang bisa di-pick.`,
        );
        orderScanRef.current?.focus();
        return;
      }
      setOrder(mapped);
      playScanFeedback("ok");
      toast.success(`Order ${mapped.salesorderNo} dimuat.`);
      setTimeout(() => skuScanRef.current?.focus(), 50);
    } catch (e) {
      playScanFeedback("error");
      apiError(e, "Gagal memuat order.");
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleScanBin = () => {
    const code = binScan.trim();
    if (!code) return;
    setBinScan("");
    setScannedBinCode(code);
    playScanFeedback("ok");
    toast.success(`Rak ${code} aktif.`);
    setTimeout(() => skuScanRef.current?.focus(), 50);
  };

  const handleScanSku = () => {
    const code = skuScan.trim();
    if (!code) return;
    if (!order) return;
    if (!scannedBinCode) {
      playScanFeedback("error");
      toast.warning("Scan kode rak dulu sebelum scan SKU.");
      setSkuScan("");
      binScanRef.current?.focus();
      return;
    }
    setSkuScan("");
    const activeBin = scannedBinCode;

    scanMutation.mutate(
      { order_id: order.id, sku: code, qty: 1 },
      {
        onSuccess: (res) => {
          if (res.matched_item_id) {
            setPickedBinByItem((prev) => ({
              ...prev,
              [res.matched_item_id]: activeBin,
            }));
          }

          setOrder((prev) => {
            if (!prev) return prev;
            const items = prev.items.map((it) => {
              const next = res.progress?.[it.id];
              if (typeof next === "number") return { ...it, qtyPicked: next };
              return it;
            });
            return { ...prev, items };
          });

          playScanFeedback("ok");
          if (res.completed) {
            toast.success(`Picking selesai untuk order ${order.salesorderNo}.`);

            setOrder(null);
            setNotes("");
            setScannedBinCode(null);
            setPickedBinByItem({});
            setTimeout(() => orderScanRef.current?.focus(), 50);
          } else {
            const item = order.items.find(
              (it) => it.id === res.matched_item_id,
            );
            toast.success(
              `${item?.sku ?? code} di-pick (${res.qty_picked}/${res.qty_ordered}).`,
            );
            setTimeout(() => skuScanRef.current?.focus(), 30);
          }
        },
        onError: (e) => {
          playScanFeedback("error");
          apiError(e, `Gagal scan ${code}.`);
          skuScanRef.current?.focus();
        },
      },
    );
  };

  const handleReset = () => {
    setOrder(null);
    setNotes("");
    setScannedBinCode(null);
    setPickedBinByItem({});
    setTimeout(() => orderScanRef.current?.focus(), 50);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Proses Picking"
        breadcrumb={[
          { label: "Gudang" },
          { label: "Proses Pesanan", href: LIST_HREF },
          { label: "Picking", href: LIST_HREF },
          { label: "Proses Picking" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push(LIST_HREF)}>
              <ArrowLeftIcon /> Kembali
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">
              Order yang sedang dipick
            </div>
            <div className="mt-1 font-mono text-sm font-semibold text-foreground">
              {order?.salesorderNo ?? "—"}
            </div>
            {order && (
              <>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Resi</span>
                  <span className="font-mono font-medium text-foreground">
                    {order.trackingNumber ?? "—"}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Lokasi</span>
                  <span className="font-medium text-foreground">
                    {order.locationName ?? "—"}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {totalPicked} / {totalOrdered}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      allPicked ? "bg-success" : "bg-primary",
                    )}
                    style={{
                      width: `${
                        totalOrdered > 0
                          ? Math.min(
                              100,
                              Math.round((totalPicked / totalOrdered) * 100),
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={handleReset}
                >
                  Reset Order
                </Button>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">Kode Rak Aktif</div>
            <div className="mt-1 font-mono text-base font-semibold text-foreground">
              {scannedBinCode ?? "—"}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <ScanBarcodeIcon className="size-4 text-muted-foreground" />
              <div className="text-sm font-medium">Ganti Rak</div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Scan kode rak sumber pengambilan sebelum scan SKU.
            </p>
            <Input
              ref={binScanRef}
              value={binScan}
              onChange={(e) => setBinScan(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleScanBin();
                }
              }}
              placeholder="Scan kode rak…"
              className="mt-3"
              disabled={!order}
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <label
              htmlFor="adhoc-notes"
              className="text-xs text-muted-foreground"
            >
              Keterangan
            </label>
            <Textarea
              id="adhoc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan picking (opsional)…"
              className="mt-1.5 min-h-24"
            />
          </div>
        </aside>

        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex-1 min-w-[240px]">
              <label
                htmlFor="scan-order"
                className="text-xs text-muted-foreground"
              >
                Scan No. Pesanan / Resi
              </label>
              <div className="relative mt-1.5">
                <ScanLineIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="scan-order"
                  ref={orderScanRef}
                  value={orderScan}
                  onChange={(e) => setOrderScan(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleScanOrder();
                    }
                  }}
                  placeholder="Scan no pesanan / resi…"
                  className="pl-9"
                  disabled={loadingOrder}
                  autoFocus
                />
              </div>
            </div>

            {order && (
              <div className="flex-1 min-w-[240px]">
                <label
                  htmlFor="scan-sku"
                  className="text-xs text-muted-foreground"
                >
                  Scan SKU / Barcode
                </label>
                <div className="relative mt-1.5">
                  <ScanBarcodeIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="scan-sku"
                    ref={skuScanRef}
                    value={skuScan}
                    onChange={(e) => setSkuScan(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleScanSku();
                      }
                    }}
                    placeholder="Scan SKU / barcode…"
                    className="pl-9"
                    disabled={scanMutation.isPending}
                    autoFocus
                  />
                </div>
              </div>
            )}
          </div>

          {loadingOrder ? (
            <DetailSkeleton />
          ) : !order ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 py-16 text-center text-sm text-muted-foreground">
              Scan No. Pesanan / Resi untuk memulai picking.
            </div>
          ) : (
            <Table
              containerClassName="rounded-2xl border border-border bg-card"
              className="min-w-[800px] border-collapse"
            >
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                  <TableHead className="px-3 py-3 text-muted-foreground">
                    Produk
                  </TableHead>
                  <TableHead className="px-3 py-3 text-muted-foreground">
                    Qty Pesan
                  </TableHead>
                  <TableHead className="px-3 py-3 text-muted-foreground">
                    Kode Rak
                  </TableHead>
                  <TableHead className="px-3 py-3 text-muted-foreground">
                    Qty Ambil / Pesan
                  </TableHead>
                  <TableHead className="px-3 py-3 text-muted-foreground">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      Order ini tidak memiliki item.
                    </TableCell>
                  </TableRow>
                ) : (
                  order.items.map((it) => {
                    const done = it.qtyPicked >= it.qtyOrdered;
                    const itemStatus = getItemStatus(
                      it.qtyPicked,
                      it.qtyOrdered,
                    );
                    const itemBin = pickedBinByItem[it.id] ?? null;
                    return (
                      <TableRow
                        key={it.id}
                        className={cn(
                          "border-b border-border/60 last:border-0",
                          done && "bg-success/[0.04]",
                        )}
                      >
                        <TableCell className="px-3 py-3">
                          <div className="flex items-start gap-3">
                            <ItemImage
                              src={it.imageUrl}
                              alt={it.description ?? it.sku}
                            />
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <span className="font-medium text-foreground">
                                {it.description ?? it.sku}
                              </span>
                              <span className="font-mono text-2xs text-foreground/70">
                                {it.sku}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-3 tabular-nums text-foreground">
                          {it.qtyOrdered}
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <span className="font-mono text-xs text-foreground">
                            {itemBin ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <span
                            className={cn(
                              "inline-flex h-7 min-w-12 items-center justify-center rounded-xl px-2 text-sm font-semibold tabular-nums",
                              done
                                ? "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300"
                                : it.qtyPicked > 0
                                  ? "bg-warning/10 text-warning"
                                  : "text-muted-foreground",
                            )}
                          >
                            {it.qtyPicked} / {it.qtyOrdered}
                          </span>
                        </TableCell>
                        <TableCell className="px-3 py-3">
                          <StatusBadge
                            domain="picking-item"
                            status={itemStatus}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </div>
  );
}
