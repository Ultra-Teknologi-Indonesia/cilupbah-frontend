"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2Icon, ScanBarcodeIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageTitle } from "@/components/dashboard/page-title";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useRemoveOrderFromShipment,
  useScanOrderToShipment,
  useShipmentOrdersPaginated,
  useShipments,
} from "@/hooks/proses-pesanan/use-fulfillment";
import { formatShipmentLabel } from "@/lib/proses-pesanan/shipment-type";
import { formatDateTime } from "@/lib/format";
import {
  playScanFeedback,
  primeScanAudio,
  scanFeedbackFromErrorCode,
} from "@/lib/scan-feedback";
import { apiError } from "@/lib/toast";
import { ChannelBadge } from "../channel-badge";
import type { ShipmentOrderItem } from "@/types/proses-pesanan/fulfillment";

export function MasukkanKePengirimanView() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from");
  const initialShipmentId = search.get("shipmentId") ?? "";

  const [shipmentId, setShipmentId] = React.useState(initialShipmentId);
  const [barcode, setBarcode] = React.useState("");
  const [latestScannedOrder, setLatestScannedOrder] =
    React.useState<ShipmentOrderItem | null>(null);
  const scanRef = React.useRef<HTMLInputElement>(null);
  const isScanningRef = React.useRef(false);

  const shipmentsList = useShipments({
    status: "SCHEDULED",
    per_page: 50,
  });
  const selectedShipmentId =
    shipmentId || shipmentsList.data?.items?.[0]?.id || "";
  const orders = useShipmentOrdersPaginated(
    selectedShipmentId,
    { page: 1, per_page: 100 },
    !!selectedShipmentId,
  );
  const scanOrder = useScanOrderToShipment();
  const removeOrder = useRemoveOrderFromShipment();

  const shipmentOptions = React.useMemo(
    () =>
      (shipmentsList.data?.items ?? []).map((s) => ({
        value: s.id,
        label: formatShipmentLabel(s),
      })),
    [shipmentsList.data?.items],
  );

  React.useEffect(() => {
    if (selectedShipmentId) {
      const timer = setTimeout(() => {
        scanRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedShipmentId]);

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!selectedShipmentId) return;
      const activeEl = document.activeElement;
      const isInputOrTextarea =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute("contenteditable") === "true";

      if (
        !isInputOrTextarea &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        scanRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [selectedShipmentId]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    primeScanAudio();
    const value = barcode.trim();
    if (!value || !selectedShipmentId || isScanningRef.current) return;
    isScanningRef.current = true;

    try {
      const result = await scanOrder.mutateAsync({
        shipmentId: selectedShipmentId,
        barcode: value,
      });
      setLatestScannedOrder(result.shipmentOrder);
      if (result.status === "already_added") {
        playScanFeedback("package_already_scanned");
      } else {
        playScanFeedback("ok");
      }
      toast.success(
        result.status === "already_added"
          ? `Resi ${result.shipmentOrder.trackingNumber ?? value} sudah ada di daftar pesanan.`
          : `Resi ${result.shipmentOrder.trackingNumber ?? value} ditambahkan ke daftar pesanan.`,
      );
      setBarcode("");
    } catch (err) {
      playScanFeedback(scanFeedbackFromErrorCode(err));
      apiError(err, "Gagal menambahkan pesanan ke pengiriman.");
      setBarcode("");
    } finally {
      isScanningRef.current = false;
      requestAnimationFrame(() => {
        scanRef.current?.focus();
      });
    }
  };

  const handleRemove = async (orderId: string) => {
    if (!selectedShipmentId) return;
    try {
      await removeOrder.mutateAsync({
        shipmentId: selectedShipmentId,
        orderIds: [orderId],
      });
      toast.success("Pesanan dihapus dari pengiriman.");
    } catch (err) {
      apiError(err, "Gagal menghapus pesanan dari pengiriman.");
    } finally {
      requestAnimationFrame(() => {
        scanRef.current?.focus();
      });
    }
  };

  const backHref = from ?? "/dashboard/proses-pesanan/shipping";

  const handleBack = () => {
    router.push(backHref);
  };

  const items = React.useMemo(() => {
    const shipmentOrders = orders.data?.items ?? [];
    if (!latestScannedOrder) return shipmentOrders;

    return [
      latestScannedOrder,
      ...shipmentOrders.filter((order) => order.id !== latestScannedOrder.id),
    ];
  }, [latestScannedOrder, orders.data?.items]);

  return (
    <div className="space-y-5 pb-8">
      <PageTitle title="Masukkan ke Pengiriman" backHref={backHref} />

      <div className="rounded-4xl border border-border/60 bg-background/80 p-4 sm:p-5">
        <div className="space-y-1.5">
          <Label htmlFor="mkp-shipment">
            No. Pengiriman <span className="text-destructive">*</span>
          </Label>
          <Combobox
            id="mkp-shipment"
            options={shipmentOptions}
            value={selectedShipmentId || null}
            onChange={(v) => {
              setShipmentId(v ?? "");
              setLatestScannedOrder(null);
              setTimeout(() => scanRef.current?.focus(), 50);
            }}
            placeholder="Pilih no. pengiriman…"
            searchPlaceholder="Cari no. pengiriman…"
            emptyText="Belum ada pengiriman terjadwal."
            loading={shipmentsList.isLoading}
          />
        </div>
      </div>

      <form
        onSubmit={handleScan}
        className="rounded-4xl border border-border/60 bg-background/80 p-4 sm:p-5"
      >
        <Label
          htmlFor="mkp-scan"
          className="mb-1.5 flex items-center gap-2 text-sm font-medium"
        >
          <ScanBarcodeIcon className="size-4 text-muted-foreground" />
          Scan No. Pesanan / No. Resi
        </Label>
        <div className="flex gap-2">
          <Input
            id="mkp-scan"
            ref={scanRef}
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Masukkan No. Pesanan/No. Resi"
            disabled={!selectedShipmentId}
            autoFocus
          />
          <Button
            type="submit"
            variant="primary"
            disabled={
              !selectedShipmentId || !barcode.trim() || scanOrder.isPending
            }
          >
            {scanOrder.isPending && <Loader2Icon className="animate-spin" />}
            Tambah
          </Button>
        </div>
        {!selectedShipmentId && (
          <p className="mt-2 text-xs text-muted-foreground">
            Pilih No. Pengiriman terlebih dahulu untuk mulai scan.
          </p>
        )}
      </form>

      <div className="rounded-4xl border border-border/60 bg-background/80">
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 sm:px-5">
          <p className="text-sm font-medium">
            Paket dalam pengiriman{" "}
            <span className="text-muted-foreground">({items.length})</span>
          </p>
        </div>
        {items.length === 0 ? (
          <EmptyState
            title={
              selectedShipmentId
                ? "Belum ada pesanan"
                : "Pilih pengiriman untuk melihat isi"
            }
            description={
              selectedShipmentId
                ? "Scan No. Pesanan / No. Resi di atas untuk menambahkan."
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Resi</TableHead>
                  <TableHead>No. Pesanan</TableHead>
                  <TableHead>Tgl. Pesanan</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead className="w-16 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it) => (
                  <TableRow
                    key={it.id}
                    className={
                      it.id === latestScannedOrder?.id
                        ? "bg-emerald-500/5"
                        : undefined
                    }
                  >
                    <TableCell className="font-medium">
                      {it.trackingNumber ?? "—"}
                      {it.id === latestScannedOrder?.id && (
                        <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                          Baru dipindai
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{it.orderNo ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(it.transactionDate)}
                    </TableCell>
                    <TableCell>
                      <ChannelBadge source={it.source ?? null} />
                    </TableCell>
                    <TableCell>{it.customerName ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(it.orderId)}
                        disabled={removeOrder.isPending}
                        aria-label={`Hapus ${it.orderNo ?? it.trackingNumber ?? "pesanan"}`}
                      >
                        <Trash2Icon className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        <p className="text-xs text-muted-foreground">
          Pengiriman ini masih terbuka dan bisa ditambah resi kapan saja. Tutup
          lewat tombol Selesaikan di daftar Jadwal Pengiriman.
        </p>
        <Button variant="outline" onClick={handleBack}>
          Tutup
        </Button>
      </div>
    </div>
  );
}
