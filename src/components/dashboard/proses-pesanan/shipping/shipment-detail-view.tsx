"use client";
import Image from "next/image";

import * as React from "react";
import {
  CameraIcon,
  ClockIcon,
  Loader2Icon,
  PackageIcon,
  PencilIcon,
  PrinterIcon,
  RefreshCwIcon,
  ScanBarcodeIcon,
  SearchIcon,
  Trash2Icon,
  TruckIcon,
  UserIcon,
  WeightIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageTitle } from "@/components/dashboard/page-title";
import { SimplePagination } from "@/components/ui/simple-pagination";
import { formatDateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useShipmentDetail,
  useShipmentOrdersPaginated,
  useScanOrderToShipment,
  useRemoveOrderFromShipment,
  useRecordDriverCall,
  useUpdateDriverCall,
} from "@/hooks/proses-pesanan/use-fulfillment";
import type { ShipmentOrderItem } from "@/types/proses-pesanan/fulfillment";
import {
  useRefreshShipmentTracking,
  useShipmentTrackingEvents,
} from "@/hooks/proses-pesanan/use-driver-call";
import { Label } from "@/components/ui/label";
import { UserSelectById } from "@/components/dashboard/shared/user-select-by-id";
import { useMe } from "@/hooks/auth/use-auth";
import { useUserLookup } from "@/hooks/pengaturan/use-users";
import {
  playScanFeedback,
  primeScanAudio,
  scanFeedbackFromErrorCode,
} from "@/lib/scan-feedback";
import { apiError } from "@/lib/toast";
import { ChannelBadge } from "../channel-badge";
import { DocActions } from "../picking/doc-actions";
import { DeleteOrderDialog } from "../shared/delete-order-dialog";

const SHIPPER_ROLES = [
  "Shipper",
  "Warehouse Staff",
  "Packer",
  "Fulfillment",
  "Admin",
];

const LIST_HREF = "/dashboard/proses-pesanan/shipping";

function formatWeight(gram: number): string {
  if (!gram) return "0 g";
  const kg = gram / 1000;
  return kg < 1
    ? `${gram} g`
    : `${kg.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kg`;
}

const PICKUP_LABEL: Record<string, { label: string; className: string }> = {
  success: { label: "Sudah", className: "bg-success/10 text-success" },
  pending: { label: "Proses", className: "bg-warning/10 text-warning" },
  failed: { label: "Gagal", className: "bg-destructive/10 text-destructive" },
  skipped: { label: "Manual", className: "bg-muted text-muted-foreground" },
};

function PickupBadge({
  status,
  message,
}: {
  status: string | null;
  message: string | null;
}) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const cfg = PICKUP_LABEL[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground",
  };
  return (
    <Badge
      variant="secondary"
      className={cn("text-2xs px-1.5 py-0", cfg.className)}
      title={message ?? undefined}
    >
      {cfg.label}
    </Badge>
  );
}

const INSTANT_COURIER_RX = /grab|gojek|gosend|gokilat|lalamove/i;

function DriverSection({
  shipmentId,
  detail,
}: {
  shipmentId: string;
  detail: import("@/types/proses-pesanan/fulfillment").ShipmentDetail;
}) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [plate, setPlate] = React.useState("");
  const [bookingCode, setBookingCode] = React.useState("");
  const [shipperId, setShipperId] = React.useState("");
  const [photo, setPhoto] = React.useState<File | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const record = useRecordDriverCall();
  const update = useUpdateDriverCall();
  const { data: me } = useMe();
  const { data: usersData, isLoading: usersLoading } = useUserLookup({
    perPage: 50,
    role: SHIPPER_ROLES,
  });
  const shipperOptions = React.useMemo(
    () =>
      (usersData?.items ?? []).map((u) => ({
        id: String(u.id),
        name: u.name ?? u.email ?? String(u.id),
        hint: u.roles?.join(", "),
      })),
    [usersData?.items],
  );

  const hasDriver =
    detail.driverCallStatus && detail.driverCallStatus !== "NONE";

  const startEdit = () => {
    setName(detail.driverName ?? "");
    setPhone(detail.driverPhone ?? "");
    setPlate(detail.driverVehiclePlate ?? "");
    setBookingCode(detail.driverBookingCode ?? "");
    setShipperId(detail.shipperId ?? "");
    setPhoto(null);
    setEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      driver_name: name,
      driver_phone: phone,
      driver_vehicle_plate: plate || undefined,
      driver_booking_code: bookingCode || undefined,
      shipper_id: shipperId || undefined,
    };

    try {
      if (hasDriver) {
        await update.mutateAsync({
          shipmentId,
          data,
          idCardPhoto: photo ?? undefined,
        });
        toast.success("Data driver diperbarui.");
      } else {
        await record.mutateAsync({
          shipmentId,
          data,
          idCardPhoto: photo ?? undefined,
        });
        toast.success("Data driver berhasil dicatat.");
      }
      setEditing(false);
    } catch (err) {
      apiError(err, "Gagal menyimpan data driver.");
    }
  };

  const isPending = record.isPending || update.isPending;

  if (hasDriver && !editing) {
    return (
      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <UserIcon className="size-4 text-muted-foreground" />
              Info Driver
            </p>
            <div className="flex items-center gap-1">
              <RefreshTrackingButton shipmentId={shipmentId} />
              <Button variant="ghost" size="sm" onClick={startEdit}>
                <PencilIcon className="size-3.5 mr-1" />
                Edit
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <span className="text-xs text-muted-foreground">Nama</span>
              <p className="font-medium">{detail.driverName ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">No. HP</span>
              <p className="font-medium">{detail.driverPhone ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">
                Plat Kendaraan
              </span>
              <p className="font-medium">{detail.driverVehiclePlate ?? "—"}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">
                Kode Booking
              </span>
              <p className="font-medium">{detail.driverBookingCode ?? "—"}</p>
            </div>
          </div>
          {detail.driverIdCardUrl && (
            <div className="mt-3">
              <span className="text-xs text-muted-foreground">
                Kartu Identitas
              </span>
              <a
                href={detail.driverIdCardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block"
              >
                <Image
                  unoptimized
                  width={400}
                  height={400}
                  src={detail.driverIdCardUrl}
                  alt="Kartu identitas driver"
                  className="h-20 rounded-md border border-border object-cover"
                />
              </a>
            </div>
          )}
          {detail.shipperName && (
            <p className="mt-2 text-xs text-muted-foreground">
              Shipper:{" "}
              <span className="font-medium text-foreground">
                {detail.shipperName}
              </span>
            </p>
          )}
          {detail.driverCalledAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Dicatat:{" "}
              {new Date(detail.driverCalledAt).toLocaleString("id-ID", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              {detail.driverCalledBy ? ` oleh ${detail.driverCalledBy}` : ""}
            </p>
          )}
        </div>
      </LiquidGlass>
    );
  }

  return (
    <LiquidGlass
      radius={16}
      intensity="subtle"
      className="bg-white/40 dark:bg-white/[0.06]"
    >
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <UserIcon className="size-4 text-muted-foreground" />
            {hasDriver ? "Edit Driver" : "Catat Driver"}
          </p>
          {editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Batal
            </Button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="driver-call-shipper">Shipper</Label>
            <UserSelectById
              id="driver-call-shipper"
              value={shipperId}
              onChange={(id) => setShipperId(id)}
              options={shipperOptions}
              isLoading={usersLoading}
              currentUserId={me?.id ? String(me.id) : undefined}
              defaultToSelf
              placeholder="Pilih shipper (warehouse staff)…"
              emptyText="Tidak ada petugas."
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="driver_name">
                Nama Driver <span className="text-destructive">*</span>
              </Label>
              <Input
                id="driver_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama lengkap driver"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driver_phone">
                No. HP Driver <span className="text-destructive">*</span>
              </Label>
              <Input
                id="driver_phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driver_plate">Plat Kendaraan</Label>
              <Input
                id="driver_plate"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="B 1234 ABC"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driver_booking">Kode Booking</Label>
              <Input
                id="driver_booking"
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value)}
                placeholder="Kode booking kurir"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="driver_id_card">Foto Kartu Identitas</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <CameraIcon className="size-3.5 mr-1" />
                {photo ? "Ganti Foto" : "Pilih Foto"}
              </Button>
              {photo && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {photo.name}
                </span>
              )}
              <input
                ref={fileRef}
                id="driver_id_card"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isPending || !name.trim() || !phone.trim()}
            >
              {isPending && (
                <Loader2Icon className="size-4 animate-spin mr-1" />
              )}
              Simpan
            </Button>
          </div>
        </form>
      </div>
    </LiquidGlass>
  );
}

function RefreshTrackingButton({ shipmentId }: { shipmentId: string }) {
  const refresh = useRefreshShipmentTracking();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => refresh.mutate(shipmentId)}
      disabled={refresh.isPending}
      title="Perbarui data tracking dari kurir"
    >
      <RefreshCwIcon
        className={cn("size-3.5 mr-1", refresh.isPending && "animate-spin")}
      />
      Refresh
    </Button>
  );
}

function extractDescription(ev: {
  event_type: string;
  raw_payload?: unknown;
}): string | null {
  const raw = (ev as unknown as { raw_payload?: Record<string, unknown> })
    .raw_payload;
  if (!raw || typeof raw !== "object") return null;
  const desc = (raw as Record<string, unknown>).description;
  if (typeof desc === "string" && desc.trim()) return desc;
  const msg = (raw as Record<string, unknown>).message;
  if (typeof msg === "string" && msg.trim()) return msg;
  return null;
}

const TRACKING_EVENT_LABEL: Record<string, string> = {
  driver_assigned: "Driver ditugaskan",
  driver_arrived: "Driver tiba",
  picked_up: "Paket dijemput",
  in_transit: "Dalam perjalanan",
  delivered: "Terkirim",
  failed: "Gagal",
  tracking_number_assigned: "No. resi ter-assign",
  polled_update: "Update tracking",
};

function TrackingTimelineSection({ shipmentId }: { shipmentId: string }) {
  const { data: events, isLoading } = useShipmentTrackingEvents(shipmentId);
  const items = events ?? [];

  return (
    <LiquidGlass
      radius={16}
      intensity="subtle"
      className="bg-white/40 dark:bg-white/[0.06]"
    >
      <div className="px-4 py-4 sm:px-5">
        <p className="mb-3 text-sm font-medium flex items-center gap-1.5">
          <ClockIcon className="size-4 text-muted-foreground" />
          Riwayat Tracking Driver
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada event tracking dari kurir.
          </p>
        ) : (
          <ol className="space-y-3">
            {items.map((ev) => (
              <li
                key={String(ev.id)}
                className="rounded-xl border border-border/60 bg-background/60 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    {TRACKING_EVENT_LABEL[ev.event_type] ?? ev.event_type}
                  </span>
                  <span className="text-xs uppercase text-muted-foreground">
                    {ev.source}
                  </span>
                </div>
                {(ev.driver_name ||
                  ev.driver_phone ||
                  ev.driver_vehicle_plate) && (
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {ev.driver_name && <span>Driver: {ev.driver_name}</span>}
                    {ev.driver_phone && <span>{ev.driver_phone}</span>}
                    {ev.driver_vehicle_plate && (
                      <span>Plat: {ev.driver_vehicle_plate}</span>
                    )}
                  </div>
                )}
                {!ev.driver_name &&
                  !ev.driver_phone &&
                  !ev.driver_vehicle_plate &&
                  extractDescription(ev) && (
                    <p className="mt-1 text-xs text-muted-foreground italic">
                      {extractDescription(ev)}
                    </p>
                  )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(ev.occurred_at).toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </LiquidGlass>
  );
}

export function ShipmentDetailView({ id }: { id: string }) {
  const [barcode, setBarcode] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [latestScannedOrder, setLatestScannedOrder] =
    React.useState<ShipmentOrderItem | null>(null);
  const [removeTarget, setRemoveTarget] = React.useState<{
    orderId: string;
    orderNo: string | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<{
    orderId: string;
    orderNo: string | null;
  } | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isScanningRef = React.useRef(false);

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(20);
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const applySearch = (nextSearch?: string) => {
    const trimmed = (nextSearch ?? searchQuery).trim();
    setSearchQuery(trimmed);
    setAppliedSearch(trimmed);
    setPage(1);
  };

  const { data: detail, isLoading } = useShipmentDetail(id, !!id);
  const { data: ordersData, isFetching: isFetchingOrders } =
    useShipmentOrdersPaginated(
      id,
      { page, per_page: perPage, q: appliedSearch },
      !!id,
    );

  const scanOrder = useScanOrderToShipment();
  const removeOrder = useRemoveOrderFromShipment();

  React.useEffect(() => {
    if (!isLoading && detail && detail.status === "SCHEDULED") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isLoading, detail]);

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (detail?.status !== "SCHEDULED") return;
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
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [detail?.status]);

  const handleScan = async () => {
    primeScanAudio();
    const code = barcode.trim();
    if (!code || isScanningRef.current) return;
    isScanningRef.current = true;

    try {
      const result = await scanOrder.mutateAsync({
        shipmentId: id,
        barcode: code,
      });
      setLatestScannedOrder(result.shipmentOrder);
      setSearchQuery("");
      setAppliedSearch("");
      setPage(1);
      if (result.status === "already_added") {
        playScanFeedback("package_already_scanned");
      } else {
        playScanFeedback("ok");
      }
      toast.success(
        result.status === "already_added"
          ? `Resi ${result.shipmentOrder.trackingNumber ?? code} sudah ada di daftar pesanan.`
          : `Resi ${result.shipmentOrder.trackingNumber ?? code} ditambahkan ke daftar pesanan.`,
      );
      setBarcode("");
    } catch (err) {
      playScanFeedback(scanFeedbackFromErrorCode(err));
      apiError(err, "Gagal menambahkan pesanan.");
      setBarcode("");
    } finally {
      isScanningRef.current = false;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    primeScanAudio();
    if (e.key === "Enter") {
      e.preventDefault();
      handleScan();
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;

    try {
      await removeOrder.mutateAsync({
        shipmentId: id,
        orderIds: [removeTarget.orderId],
      });
      toast.success(
        `Pesanan ${removeTarget.orderNo ?? ""} dihapus dari pengiriman.`,
      );
    } catch (err) {
      apiError(err, "Gagal menghapus pesanan.");
    } finally {
      setRemoveTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="py-32 text-center text-sm text-muted-foreground">
        Pengiriman tidak ditemukan.
      </div>
    );
  }

  const orders = ordersData?.items ?? [];
  const filteredOrders = latestScannedOrder
    ? [
        latestScannedOrder,
        ...orders.filter((order) => order.id !== latestScannedOrder.id),
      ]
    : orders;
  const meta = ordersData?.meta;

  const isScheduled = detail.status === "SCHEDULED";
  const withResi = detail.orders.filter((o) => !!o.trackingNumber).length;
  const withoutResi = detail.orders.length - withResi;
  const totalWeight = detail.orders.reduce((sum, o) => sum + o.weightGram, 0);

  return (
    <div className="space-y-5">
      <PageTitle
        title={detail.shipmentNo}
        backHref={LIST_HREF}
        breadcrumb={[
          { label: "Proses Pesanan", href: LIST_HREF },
          { label: "Jadwal Pengiriman", href: LIST_HREF },
          { label: detail.shipmentNo },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => DocActions.manifest(id)}
          >
            <PrinterIcon className="size-4 mr-1.5" />
            Cetak Manifest
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 px-1">
        <LiquidGlass
          radius={16}
          intensity="subtle"
          className="bg-white/40 dark:bg-white/[0.06]"
        >
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TruckIcon className="size-3.5" />
              Kurir
            </div>
            <p className="text-sm font-semibold">{detail.courierName ?? "—"}</p>
          </div>
        </LiquidGlass>

        <LiquidGlass
          radius={16}
          intensity="subtle"
          className="bg-white/40 dark:bg-white/[0.06]"
        >
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <PackageIcon className="size-3.5" />
              Total Paket
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-sm font-semibold tabular-nums">
                {detail.orders.length}
              </p>
              <span className="text-xs text-muted-foreground">
                ({withResi} resi, {withoutResi} tanpa)
              </span>
            </div>
          </div>
        </LiquidGlass>

        <LiquidGlass
          radius={16}
          intensity="subtle"
          className="bg-white/40 dark:bg-white/[0.06]"
        >
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <WeightIcon className="size-3.5" />
              Total Berat
            </div>
            <p className="text-sm font-semibold tabular-nums">
              {formatWeight(totalWeight)}
            </p>
          </div>
        </LiquidGlass>

        <LiquidGlass
          radius={16}
          intensity="subtle"
          className="bg-white/40 dark:bg-white/[0.06]"
        >
          <div className="px-4 py-3">
            <div className="text-xs text-muted-foreground mb-1">Tipe</div>
            <p className="text-sm font-semibold">
              {detail.shipmentType ?? "—"}
            </p>
          </div>
        </LiquidGlass>
      </div>

      {detail.hasInstant &&
        detail.courierCode &&
        INSTANT_COURIER_RX.test(detail.courierCode) && (
          <>
            <DriverSection shipmentId={id} detail={detail} />
            <TrackingTimelineSection shipmentId={id} />
          </>
        )}

      {isScheduled && (
        <LiquidGlass
          radius={16}
          intensity="subtle"
          className="bg-white/40 dark:bg-white/[0.06]"
        >
          <div className="px-4 py-4 sm:px-5">
            <p className="text-sm font-medium mb-2">Scan Pesanan</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanBarcodeIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scan No. Pesanan / No. Resi…"
                  className="pl-9"
                  autoFocus
                />
              </div>
              <Button
                variant="primary"
                onClick={handleScan}
                disabled={!barcode.trim() || scanOrder.isPending}
              >
                {scanOrder.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  "Tambah"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Pesanan harus berstatus packed dan menggunakan kurir yang sama.
            </p>
          </div>
        </LiquidGlass>
      )}

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="px-4 py-4 sm:px-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Daftar Pesanan</p>
              <Badge>{meta?.total ?? 0}</Badge>
            </div>

            <div className="relative w-full sm:w-64">
              <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari No. Pesanan / Resi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applySearch();
                  }
                }}
                className="pl-9 pr-14 h-8 text-sm"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => applySearch()}
                className="absolute right-1 top-1/2 h-6 -translate-y-1/2 rounded-full px-2 text-xs"
              >
                Cari
              </Button>
            </div>
          </div>

          <ScrollArea className="rounded-lg border border-border">
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10 text-center">No</TableHead>
                    <TableHead>No. Pesanan</TableHead>
                    <TableHead>Tgl. Pesanan</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>No. Resi</TableHead>
                    <TableHead className="text-center">Status Ambil</TableHead>
                    <TableHead className="text-right">Berat</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {isScheduled && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isScheduled ? 9 : 8}
                        className="py-16 text-center text-sm text-muted-foreground"
                      >
                        {appliedSearch
                          ? "Pesanan tidak ditemukan."
                          : "Belum ada pesanan. Scan untuk menambahkan."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((o, idx) => (
                      <TableRow
                        key={o.id}
                        className={
                          o.id === latestScannedOrder?.id
                            ? "bg-emerald-500/5"
                            : undefined
                        }
                      >
                        <TableCell className="text-center text-xs text-muted-foreground tabular-nums">
                          {idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {o.source && <ChannelBadge source={o.source} />}
                            <span className="font-medium text-foreground text-xs">
                              {o.orderNo ?? "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatDateTime(o.transactionDate)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {o.customerName ?? "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "text-xs tabular-nums",
                              o.trackingNumber
                                ? "text-foreground"
                                : "text-muted-foreground italic",
                            )}
                          >
                            {o.trackingNumber ?? "Belum ada"}
                          </span>
                          {o.id === latestScannedOrder?.id && (
                            <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                              Baru dipindai
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <PickupBadge
                            status={o.pickupStatus}
                            message={o.pickupMessage}
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {formatWeight(o.weightGram)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {o.grandTotal.toLocaleString("id-ID")}
                        </TableCell>
                        {isScheduled && (
                          <TableCell>
                            <div className="flex items-center justify-end gap-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setRemoveTarget({
                                    orderId: o.orderId,
                                    orderNo: o.orderNo,
                                  })
                                }
                                disabled={removeOrder.isPending}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                aria-label="Keluarkan dari pengiriman"
                                title="Keluarkan dari pengiriman"
                              >
                                <XCircleIcon className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteTarget({
                                    orderId: o.orderId,
                                    orderNo: o.orderNo,
                                  })
                                }
                                className="rounded-md p-1 text-destructive transition-colors hover:bg-destructive/10"
                                aria-label="Hapus Pesanan"
                                title="Hapus Pesanan (kembalikan ke tahap sebelumnya)"
                              >
                                <Trash2Icon className="size-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {meta && (
              <div className="p-4 border-t border-border bg-muted/20">
                <SimplePagination
                  page={meta.current_page}
                  lastPage={meta.last_page}
                  perPage={meta.per_page}
                  total={meta.total}
                  isFetching={isFetchingOrders}
                  onPageChange={setPage}
                  onPerPageChange={setPerPage}
                  label="pesanan"
                />
              </div>
            )}
          </ScrollArea>
        </div>
      </LiquidGlass>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => {
          if (!o) setRemoveTarget(null);
        }}
        title="Hapus Pesanan"
        description={`Hapus pesanan ${
          removeTarget?.orderNo ?? removeTarget?.orderId ?? ""
        } dari pengiriman ini?`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={removeOrder.isPending}
        onConfirm={handleRemove}
      />

      <DeleteOrderDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        orders={
          deleteTarget?.orderId
            ? [{ id: deleteTarget.orderId, no: deleteTarget.orderNo }]
            : []
        }
      />
    </div>
  );
}
