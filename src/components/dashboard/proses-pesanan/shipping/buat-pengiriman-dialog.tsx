"use client";

import * as React from "react";
import { format } from "date-fns";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import { DateTimePicker } from "@/components/ui/date-picker";
import {
  useCouriers,
  useCreateShipment,
} from "@/hooks/proses-pesanan/use-fulfillment";
import { guessShipmentTypeFromCourierName } from "@/lib/proses-pesanan/shipment-type";

interface BuatPengirimanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderIds?: string[];
  onCreated?: () => void;
  marketplaceSource?: string | null;
  shippingProvider?: string | null;

  locationId?: string | null;

  locationName?: string | null;

  multiLocation?: boolean;

  internalOnly?: boolean;
}

export function BuatPengirimanDialog({
  open,
  onOpenChange,
  orderIds,
  onCreated,
  marketplaceSource,
  shippingProvider,
  locationId,
  locationName,
  multiLocation,
  internalOnly,
}: BuatPengirimanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Pengiriman Baru</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <PengirimanForm
          onOpenChange={onOpenChange}
          orderIds={orderIds}
          onCreated={onCreated}
          marketplaceSource={marketplaceSource}
          shippingProvider={shippingProvider}
          locationId={locationId}
          locationName={locationName}
          multiLocation={multiLocation}
          internalOnly={internalOnly}
        />
      </DialogContent>
    </Dialog>
  );
}

function PengirimanForm({
  onOpenChange,
  orderIds,
  onCreated,
  marketplaceSource,
  shippingProvider,
  locationId,
  locationName,
  multiLocation,
  internalOnly,
}: {
  onOpenChange: (open: boolean) => void;
  orderIds?: string[];
  onCreated?: () => void;
  marketplaceSource?: string | null;
  shippingProvider?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  multiLocation?: boolean;
  internalOnly?: boolean;
}) {
  const orderMode = orderIds !== undefined && orderIds.length > 0;
  const isMarketplace = orderMode && !!marketplaceSource && !internalOnly;

  const [shipmentNo, setShipmentNo] = React.useState("");
  const [courierId, setCourierId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [shipmentDateTime, setShipmentDateTime] = React.useState<
    Date | undefined
  >(() => new Date());
  const [dateError, setDateError] = React.useState("");

  const couriers = useCouriers(!isMarketplace);
  const createShipment = useCreateShipment();

  const selectedCourier =
    couriers.data?.find((c) => c.id === courierId) ?? null;

  const handleCourierChange = (id: string | null) => {
    setCourierId(id ?? "");
  };

  const handleDateTimeChange = (date: Date | undefined) => {
    setShipmentDateTime(date);
    if (date && date < new Date()) {
      setDateError("Tanggal & jam tidak boleh di masa lalu.");
    } else {
      setDateError("");
    }
  };

  const canSubmit = isMarketplace
    ? !!shipmentDateTime && !dateError
    : !!courierId && !!shipmentDateTime && !dateError;

  const handleSubmit = async () => {
    if (!shipmentDateTime) return;

    if (shipmentDateTime < new Date()) {
      setDateError("Tanggal & jam tidak boleh di masa lalu.");
      return;
    }

    let courierName: string;
    let courierCode: string | null;

    if (isMarketplace && shippingProvider) {
      courierName = shippingProvider;
      courierCode = shippingProvider.toLowerCase().replace(/\s+/g, "-");
    } else if (selectedCourier) {
      courierName = selectedCourier.name;
      courierCode = selectedCourier.code;
    } else {
      return;
    }

    // `shippingType` is the marketplace/channel label (for example, `TIKTOK`)
    // and is not the delivery service. The actual courier is authoritative for
    // shipment classification, especially for providers such as Gojek Instant.
    const shipmentType = guessShipmentTypeFromCourierName(courierName);

    const payload = {
      shipment_no: shipmentNo.trim() || null,
      location_id: locationId ?? null,
      courier_name: courierName,
      courier_code: courierCode,
      shipment_type: shipmentType,
      shipment_date: format(shipmentDateTime, "yyyy-MM-dd HH:mm:ss"),
      notes: notes.trim() || null,
    };

    try {
      await createShipment.mutateAsync({
        payload,
        orderIds: orderIds ?? [],
        internalOnly,
      });
      toast.success(
        orderMode
          ? `Pengiriman dibuat untuk ${orderIds!.length} pesanan.`
          : "Pengiriman baru berhasil dibuat.",
      );
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Gagal membuat pengiriman.";
      toast.error(msg);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 py-2">
        {orderMode && (
          <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm">
            <span className="font-medium">{orderIds!.length}</span> pesanan
            terpilih
            {(locationName || multiLocation) && (
              <span className="ml-2 text-xs text-muted-foreground">
                · Lokasi: {multiLocation ? "berbeda" : locationName}
              </span>
            )}
            {isMarketplace && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize">
                {marketplaceSource}
              </span>
            )}
          </div>
        )}

        {!orderMode && (
          <div className="space-y-1.5">
            <Label htmlFor="new-shipment-no">No. Pengiriman</Label>
            <Input
              id="new-shipment-no"
              value={shipmentNo}
              onChange={(e) => setShipmentNo(e.target.value)}
              placeholder="[auto]"
              className="bg-muted/30"
            />
          </div>
        )}

        {isMarketplace ? (
          <div className="space-y-1.5">
            <Label>Kurir</Label>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium">
              {shippingProvider || "Dari marketplace"}
            </div>
            <p className="text-xs text-muted-foreground">
              Kurir otomatis dari {marketplaceSource} — tidak perlu dipilih
              manual.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>
              Kurir<span className="text-destructive"> *</span>
            </Label>
            <Combobox
              value={courierId || null}
              onChange={handleCourierChange}
              options={
                couriers.data?.map((c) => ({
                  value: c.id,
                  label: c.name,
                })) ?? []
              }
              placeholder="Pilih Kurir"
              searchPlaceholder="Cari kurir"
              emptyText="Kurir tidak ditemukan."
              loading={couriers.isLoading}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>
            Tanggal Pengiriman<span className="text-destructive"> *</span>
          </Label>
          <DateTimePicker
            value={shipmentDateTime}
            onChange={handleDateTimeChange}
            disablePast
            placeholder="Pilih tanggal & jam"
          />
          {dateError && <p className="text-xs text-destructive">{dateError}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="shipment-notes">Catatan (opsional)</Label>
          <textarea
            id="shipment-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Batal
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!canSubmit || createShipment.isPending}
        >
          {createShipment.isPending && <Loader2Icon className="animate-spin" />}
          Simpan
        </Button>
      </div>
    </>
  );
}
