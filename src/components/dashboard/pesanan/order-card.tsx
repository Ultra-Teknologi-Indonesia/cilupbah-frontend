"use client";

import * as React from "react";
import Image from "next/image";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  CopyIcon,
  MapPinIcon,
  UserIcon,
  CalendarIcon,
  TruckIcon,
  EyeIcon,
  PrinterIcon,
  PackageIcon,
  CheckCircleIcon,
  WarehouseIcon,
  ArrowRightIcon,
  FileTextIcon,
  ClockIcon,
  CheckIcon,
  XIcon,
  ClipboardListIcon,
  ZapIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  Trash2Icon,
  BanIcon,
  BanknoteIcon,
  StarIcon,
  CalendarClockIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { ContactBuyerDialog } from "./contact-buyer-dialog";
import { ManualCancelDialog } from "./manual-cancel-dialog";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { BuatPicklistDialog } from "@/components/dashboard/proses-pesanan/picking/buat-picklist-dialog";
import { BuatPengirimanDialog } from "@/components/dashboard/proses-pesanan/shipping/buat-pengiriman-dialog";
import { DriverCallIndicator } from "@/components/dashboard/proses-pesanan/shared/driver-call-indicator";
import { DeleteOrderDialog } from "@/components/dashboard/proses-pesanan/shared/delete-order-dialog";
import { RequestCancelDialog } from "@/components/dashboard/pesanan/request-cancel-dialog";
import { DirectCompletionDialog } from "@/components/dashboard/pesanan/direct-completion-dialog";
import { canRequestChannelCancel } from "@/lib/pesanan/cancel-eligibility";
import { DocActions } from "@/hooks/proses-pesanan/use-doc-actions";
import { isShopeeInstantOrSameDay } from "@/lib/proses-pesanan/shopee";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type Order,
  type OrderItem,
  type OrderTab,
  type SubFilter,
  CHANNEL_MAP,
  orderChannelKey,
} from "@/types/pesanan/order";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useMarkComplete,
  useRequestAwb,
  useMoveToReady,
  useAcceptCancelRequest,
  useRejectCancelRequest,
  useReleaseChannelCancel,
  useAcceptReturn,
  useRejectReturn,
  useRelocateOrder,
} from "@/hooks/pesanan/use-order-actions";
import { useLocations } from "@/hooks/manajemen-rak/use-locations";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { useCopyToClipboard } from "@/hooks/shared/use-copy-to-clipboard";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getOrderStatusBadgeStatus } from "@/lib/pesanan/status";

export const ChannelIcon = React.memo(function ChannelIcon({
  source,
  commercePlatform,
}: {
  source: string | null;
  commercePlatform?: string | null;
}) {
  const channel = orderChannelKey(source, commercePlatform);
  if (!channel) return null;
  const ch = CHANNEL_MAP[channel];
  if (!ch) return null;

  const mask = `url(${ch.icon}) center / contain no-repeat`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex h-6 items-center gap-1.5 shrink-0 rounded-xl px-1.5"
          style={{ backgroundColor: `${ch.color}10` }}
        >
          <span
            className="inline-block size-4 shrink-0"
            style={{
              backgroundColor: ch.color,
              mask,
              WebkitMask: mask,
            }}
          />
          <span className="text-xs font-semibold" style={{ color: ch.color }}>
            {ch.label}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{ch.label}</TooltipContent>
    </Tooltip>
  );
});

const ItemRow = React.memo(function ItemRow({ item }: { item: OrderItem }) {
  return (
    <div className="flex items-center gap-3">
      {item.image_url ? (
        <Image
          src={item.image_url}
          alt={item.description || item.sku}
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-xl border border-border/60 object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
          <PackageIcon className="size-5 text-muted-foreground/60" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {item.description || item.sku}
        </p>
        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
      </div>
      <span className="shrink-0 text-sm text-foreground tabular-nums">
        x {item.qty_in_base}
      </span>
    </div>
  );
});

function RelocateDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [locationId, setLocationId] = React.useState("");
  const { data: locationsData } = useLocations({ perPage: 50 });
  const relocate = useRelocateOrder();

  const locations = React.useMemo(() => {
    const items = locationsData?.items ?? [];
    return items.filter((l) => l.id !== order.location_id);
  }, [locationsData, order.location_id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ubah Gudang Pengambilan</DialogTitle>
          <DialogDescription>
            Pilih gudang baru untuk pesanan {order.salesorder_no}
          </DialogDescription>
        </DialogHeader>
        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger>
            <SelectValue placeholder="Pilih gudang..." />
          </SelectTrigger>
          <SelectContent>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.locationName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={!locationId || relocate.isPending}
            onClick={() => {
              relocate.mutate(
                { orderId: order.id, locationId },
                { onSuccess: () => onOpenChange(false) },
              );
            }}
          >
            {relocate.isPending ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OrderActions({
  order,
  tab,
  subFilter,
}: {
  order: Order;
  tab: OrderTab;
  subFilter: SubFilter;
}) {
  const [completeOpen, setCompleteOpen] = React.useState(false);
  const [relocateOpen, setRelocateOpen] = React.useState(false);
  const [contactOpen, setContactOpen] = React.useState(false);
  const [pengirimanOpen, setPengirimanOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [requestCancelOpen, setRequestCancelOpen] = React.useState(false);
  const [manualCancelOpen, setManualCancelOpen] = React.useState(false);

  const markComplete = useMarkComplete();
  const requestAwb = useRequestAwb();
  const moveToReady = useMoveToReady();
  const acceptCancel = useAcceptCancelRequest();
  const rejectCancel = useRejectCancelRequest();
  const releaseCancel = useReleaseChannelCancel();
  const acceptReturn = useAcceptReturn();
  const rejectReturn = useRejectReturn();

  const isMarketplace = !!order.source && order.source !== "manual" && order.source !== "offline";
  const canManualCancel = !isMarketplace;
  const { can, canAny } = usePermissions();
  const canEditOrder = can("edit-pesanan");
  const canDeleteOrder = can("delete-pesanan");
  const canViewOrder = can("view-pesanan");
  const canViewShipping = canAny([
    "view-pengiriman",
    "view-pesanan",
    "view-packing",
    "view-picking",
  ]);
  const canEditReturn = can("edit-retur-penjualan");

  const canRequestCancel = canRequestChannelCancel(order);

  const handlePrintLabel = () => {
    if (isMarketplace) {
      DocActions.shippingLabel([{ id: order.id, source: order.source }]);
    } else {
      toast.info("Cetak resi hanya tersedia untuk pesanan marketplace");
    }
  };

  const handlePrintInvoice = () => {
    window.open(
      `/dashboard/document-preview/invoice/${order.id}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const busy =
    markComplete.isPending ||
    requestAwb.isPending ||
    moveToReady.isPending ||
    acceptCancel.isPending ||
    rejectCancel.isPending ||
    acceptReturn.isPending ||
    rejectReturn.isPending;

  if (
    order.channel_cancel_status === "pending" &&
    !order.is_canceled &&
    tab !== "channel-cancel"
  ) {
    return (
      <span className="text-xs font-medium text-warning">
        Menunggu konfirmasi pembatalan marketplace
      </span>
    );
  }

  if (tab === "unpaid") return <OrderCancelMenu order={order} />;

  if (tab === "ready-to-process") {
    return (
      <>
        {canEditOrder && <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setRelocateOpen(true)}
        >
          <WarehouseIcon className="size-3.5" />
          Edit Gudang
        </Button>}
        {canEditOrder && !order.shipping?.tracking_number && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={busy}
            onClick={() => requestAwb.mutate({ orderId: order.id })}
          >
            <TruckIcon className="size-3.5" />
            Atur Pengiriman
          </Button>
        )}
        {canViewShipping && order.shipping?.tracking_number && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={busy}
            onClick={handlePrintLabel}
          >
            <PrinterIcon className="size-3.5" />
            Cetak Label
          </Button>
        )}
        {canEditOrder && <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={busy}
          onClick={() => setCompleteOpen(true)}
        >
          <CheckCircleIcon className="size-3.5" />
          Selesaikan
        </Button>}
        {canEditOrder && <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={busy}
          onClick={() => moveToReady.mutate([order.id])}
        >
          <ArrowRightIcon className="size-3.5" />
          {moveToReady.isPending ? "Memproses..." : "Proses Pesanan"}
        </Button>}
        {canEditOrder && <DirectCompletionDialog
          open={completeOpen}
          onOpenChange={setCompleteOpen}
          orderIds={[order.id]}
        />}
        {canEditOrder && <RelocateDialog
          order={order}
          open={relocateOpen}
          onOpenChange={setRelocateOpen}
        />}
        <OrderCancelMenu order={order} />
      </>
    );
  }

  if (tab === "in-transit") {
    return (
      <>
        {canViewOrder && <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handlePrintInvoice}
        >
          <FileTextIcon className="size-3.5" />
          Cetak Faktur
        </Button>}
        {canEditOrder && <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={busy}
          onClick={() => setCompleteOpen(true)}
        >
          <CheckCircleIcon className="size-3.5" />
          {markComplete.isPending ? "Memproses..." : "Selesaikan"}
        </Button>}
        <ConfirmDialog
          open={completeOpen}
          onOpenChange={setCompleteOpen}
          title="Selesaikan pesanan ini?"
          description={`Pesanan ${order.salesorder_no} akan ditandai selesai.`}
          confirmLabel="Ya, Selesaikan"
          cancelLabel="Batal"
          onConfirm={() => {
            setCompleteOpen(false);
            markComplete.mutate([order.id]);
          }}
        />
      </>
    );
  }

  if (tab === "completed") {
    return (
      <>
        {canViewOrder && <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handlePrintInvoice}
        >
          <FileTextIcon className="size-3.5" />
          Cetak Faktur
        </Button>}
      </>
    );
  }

  if (tab === "empty-stock" || tab === "failed-pick") {
    return (
      <>
        {tab === "failed-pick" &&
          (order.pick_failed_by || order.pick_fail_reason) && (
            <p className="basis-full text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Dihapus oleh:</span>{" "}
              {order.pick_failed_by ?? "—"}
              {order.pick_fail_reason ? (
                <>
                  {" · "}
                  <span className="text-warning">{order.pick_fail_reason}</span>
                </>
              ) : null}
            </p>
          )}
        {tab === "empty-stock" && canEditOrder && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={busy}
            onClick={() => setContactOpen(true)}
          >
            <MessageCircleIcon className="size-3.5" />
            {order.contacted_at ? "Ubah Konfirmasi" : "Catat Konfirmasi"}
          </Button>
        )}

        {canEditOrder && <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={busy}
          onClick={() => moveToReady.mutate([order.id])}
        >
          <ArrowRightIcon className="size-3.5" />
          {moveToReady.isPending
            ? "Memindahkan..."
            : "Pindahkan ke Siap Proses"}
        </Button>}
        {tab === "empty-stock" && canEditOrder && (
          <ContactBuyerDialog
            open={contactOpen}
            onOpenChange={setContactOpen}
            orderId={order.id}
            orderNo={order.salesorder_no}
            defaultChannel={order.contact_channel ?? undefined}
            defaultDecision={order.customer_decision ?? undefined}
            defaultNote={order.contact_note ?? undefined}
          />
        )}
        <OrderCancelMenu order={order} />
      </>
    );
  }

  if (tab === "cancellation") {
    if (
      subFilter === "cancelled" ||
      subFilter === "accepted" ||
      subFilter === "rejected" ||
      order.status === "cancelled"
    )
      return null;

    if (!canEditOrder) return null;

    return (
      <>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={busy}
          onClick={() => acceptCancel.mutate(order.id)}
        >
          <CheckIcon className="size-3.5" />
          {acceptCancel.isPending ? "Memproses..." : "Terima"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={busy}
          onClick={() => rejectCancel.mutate(order.id)}
        >
          <XIcon className="size-3.5" />
          {rejectCancel.isPending ? "Memproses..." : "Tolak"}
        </Button>
      </>
    );
  }

  if (tab === "channel-cancel") {
    const st = order.channel_cancel_status;
    return (
      <>
        {st === "pending" && (
          <span className="text-xs font-medium text-warning">
            Menunggu konfirmasi marketplace
          </span>
        )}
        {st === "failed" && (
          <span className="text-xs font-medium text-destructive">
            Ditolak marketplace
            {order.channel_cancel_error
              ? `: ${order.channel_cancel_error}`
              : ""}
          </span>
        )}
        {st === "accepted" && (
          <span className="text-xs font-medium text-success">
            Dibatalkan di marketplace
          </span>
        )}
        {canEditOrder && (st === "pending" || st === "failed") && !order.is_canceled && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={releaseCancel.isPending}
            onClick={() => releaseCancel.mutate(order.id)}
          >
            <ArrowRightIcon className="size-3.5" />
            {releaseCancel.isPending ? "Memproses..." : "Lanjutkan Proses"}
          </Button>
        )}
      </>
    );
  }

  if (tab === "returned") {
    if (subFilter === "accepted" || subFilter === "rejected") {
      if (!canViewOrder) return null;
      return (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handlePrintInvoice}
        >
          <FileTextIcon className="size-3.5" />
          Cetak Faktur
        </Button>
      );
    }

    return (
      <>
        {canEditReturn && <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={busy}
          onClick={() => acceptReturn.mutate(order.id)}
        >
          <CheckIcon className="size-3.5" />
          {acceptReturn.isPending ? "Memproses..." : "Terima"}
        </Button>}
        {canEditReturn && <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={busy}
          onClick={() => rejectReturn.mutate({ returnId: order.id })}
        >
          <XIcon className="size-3.5" />
          {rejectReturn.isPending ? "Memproses..." : "Tolak"}
        </Button>}
        {canViewOrder && <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handlePrintInvoice}
        >
          <FileTextIcon className="size-3.5" />
          Cetak Faktur
        </Button>}
      </>
    );
  }

  if (tab === "all") {
    const inWarehouseProcessing =
      !!order.handed_to_warehouse_at &&
      order.status !== "shipped" &&
      order.status !== "cancelled" &&
      !order.cancel_requested_at;
    if (inWarehouseProcessing) return null;

    const secondaryActions: React.ReactNode[] = [];
    let primaryAction: React.ReactNode = null;

    const canPrintInAll =
      isMarketplace &&
      Boolean(order.shipping?.tracking_number) &&
      !order.is_canceled &&
      !["shipped", "completed", "cancelled", "returned"].includes(
        order.status,
      ) &&
      ![
        "SHIPPED",
        "COMPLETED",
        "CANCELLED",
        "DELIVERED",
        "TO_CONFIRM_RECEIVE",
      ].includes(order.channel_status?.toUpperCase() ?? "");

    if (canPrintInAll && canViewShipping) {
      secondaryActions.push(
        <Button
          key="print-resi"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={busy}
          onClick={handlePrintLabel}
        >
          <PrinterIcon className="size-3.5" />
          Cetak Resi
        </Button>,
      );
    }

    if (canEditOrder && order.status === "packed" && !order.is_canceled) {
      const isShopeeInstant = isShopeeInstantOrSameDay({
        source: order.source,
        shippingProvider: order.shipping?.provider,
        isInstant: order.is_instant,
      });
      primaryAction = (
        <Button
          key="ship"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={busy}
          onClick={() => {
            if (isShopeeInstant) {
              setPengirimanOpen(true);
            } else {
              requestAwb.mutate({ orderId: order.id });
            }
          }}
        >
          <TruckIcon className="size-3.5" />
          {requestAwb.isPending ? "Memproses..." : "Kirim"}
        </Button>
      );
    } else if (canEditOrder && order.status === "reserved" && !order.is_canceled) {
      primaryAction = (
        <Button
          key="process"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={busy}
          onClick={() => moveToReady.mutate([order.id])}
        >
          <ArrowRightIcon className="size-3.5" />
          {moveToReady.isPending ? "Memproses..." : "Proses Pesanan"}
        </Button>
      );
    }

    return (
      <>
        {secondaryActions}
        {primaryAction}
        {!order.is_canceled &&
          ((canRequestCancel && canEditOrder) ||
            (canManualCancel && canEditOrder) ||
            canDeleteOrder) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Aksi lainnya">
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              {canRequestCancel && canEditOrder && (
                <DropdownMenuItem onSelect={() => setRequestCancelOpen(true)}>
                  <BanIcon className="size-4 mr-2" />
                  Ajukan Pembatalan
                </DropdownMenuItem>
              )}
              {canManualCancel && canEditOrder && (
                <DropdownMenuItem variant="destructive" onSelect={() => setManualCancelOpen(true)}>
                  <BanIcon className="size-4 mr-2" />
                  Batalkan Pesanan
                </DropdownMenuItem>
              )}
              {canDeleteOrder && (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => setDeleteOpen(true)}
                >
                  <Trash2Icon className="size-4 mr-2" />
                  Hapus Pesanan
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {canEditOrder && <BuatPengirimanDialog
          open={pengirimanOpen}
          onOpenChange={setPengirimanOpen}
          orderIds={[order.id]}
          locationId={order.location_id}
          locationName={order.location_name}
          marketplaceSource={order.source ?? undefined}
          shippingProvider={order.shipping?.provider ?? undefined}
          shippingType={
            isShopeeInstantOrSameDay({
              source: order.source,
              shippingProvider: order.shipping?.provider,
              isInstant: order.is_instant,
            })
              ? "INSTANT"
              : undefined
          }
        />}
        {canDeleteOrder && <DeleteOrderDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          orders={[{ id: order.id, no: order.salesorder_no }]}
        />}
        {canRequestCancel && canEditOrder && <RequestCancelDialog
          open={requestCancelOpen}
          onOpenChange={setRequestCancelOpen}
          order={order}
        />}
        {canManualCancel && canEditOrder && <ManualCancelDialog
          open={manualCancelOpen}
          onOpenChange={setManualCancelOpen}
          order={order}
        />}
      </>
    );
  }

  return null;
}

function OrderCancelMenu({ order }: { order: Order }) {
  const [open, setOpen] = React.useState(false);
  const { can } = usePermissions();
  if (!can("edit-pesanan") || !canRequestChannelCancel(order)) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Aksi lainnya">
            <MoreHorizontalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            <BanIcon className="size-4 mr-2" />
            Ajukan Pembatalan
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RequestCancelDialog open={open} onOpenChange={setOpen} order={order} />
    </>
  );
}

function ShipByDeadline({
  date,
  status,
  channelStatus,
  isCanceled,
}: {
  date?: string | null;
  status?: string | null;
  channelStatus?: string | null;
  isCanceled?: boolean;
}) {
  const isFinished =
    isCanceled ||
    ["shipped", "completed", "cancelled", "returned"].includes(status ?? "") ||
    [
      "SHIPPED",
      "COMPLETED",
      "CANCELLED",
      "DELIVERED",
      "TO_CONFIRM_RECEIVE",
    ].includes(channelStatus?.toUpperCase() ?? "");

  if (isFinished || !date) {
    const displayLabel =
      isCanceled || status === "cancelled"
        ? "Dibatalkan"
        : status === "completed" || channelStatus?.toUpperCase() === "COMPLETED"
          ? "Selesai"
          : status === "shipped" || channelStatus?.toUpperCase() === "SHIPPED"
            ? "Sudah Dikirim"
            : status === "returned"
              ? "Diretur"
              : "—";

    return (
      <div className="min-w-0">
        <p className="mb-0.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground/70">
          Status Kirim
        </p>
        <div className="flex items-start gap-1 text-sm">
          <ClockIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="font-medium text-muted-foreground">{displayLabel}</p>
        </div>
      </div>
    );
  }

  const deadline = new Date(date);
  if (Number.isNaN(deadline.getTime())) {
    return (
      <div className="min-w-0">
        <p className="mb-0.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground/70">
          Batas Kirim
        </p>
        <div className="flex items-start gap-1 text-sm">
          <ClockIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <p className="font-medium text-muted-foreground">—</p>
        </div>
      </div>
    );
  }

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const diffMs = deadline.getTime() - now;
  const isOverdue = diffMs < 0;
  const absDiff = Math.abs(diffMs);

  const totalMinutes = Math.floor(absDiff / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  let label: string;
  if (days > 0) {
    label = remainingHours > 0 ? `${days}h ${remainingHours}j` : `${days} hari`;
  } else if (hours > 0) {
    label = `${hours}j ${minutes}m`;
  } else {
    label = `${minutes} menit`;
  }

  const colorClass = isOverdue
    ? "text-destructive"
    : hours < 12
      ? "text-warning"
      : "text-success";

  return (
    <div className="min-w-0">
      <p className="mb-0.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground/70">
        Batas Kirim
      </p>
      <div className="flex items-start gap-1 text-sm">
        <ClockIcon className={cn("mt-0.5 size-3.5 shrink-0", colorClass)} />
        <div className="min-w-0">
          <p className="font-medium">
            {format(deadline, "dd MMM HH:mm", { locale: idLocale })}
          </p>
          <p className={cn("text-xs font-semibold", colorClass)}>
            {isOverdue ? `Terlambat ${label}` : `${label} lagi`}
          </p>
        </div>
      </div>
    </div>
  );
}

export type OrderCardVariant = "sales" | "outbound-ready";

export function OutboundReadyActions({ order }: { order: Order }) {
  const [picklistOpen, setPicklistOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const { can } = usePermissions();
  const canDeleteOrder = can("delete-pesanan");
  const isMarketplace = !!order.source && order.source !== "manual";

  const handlePrintLabel = () => {
    if (isMarketplace) {
      DocActions.shippingLabel([{ id: order.id, source: order.source }]);
    } else {
      toast.info("Cetak label hanya tersedia untuk pesanan marketplace");
    }
  };

  const hasTracking = !!order.shipping?.tracking_number;
  const cetakLabelBtn = (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-1.5 text-xs"
      disabled={!hasTracking}
      onClick={handlePrintLabel}
    >
      <PrinterIcon className="size-3.5" />
      Cetak Label
    </Button>
  );

  return (
    <>
      {hasTracking ? (
        cetakLabelBtn
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{cetakLabelBtn}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Belum ada AWB dari marketplace, coba beberapa saat lagi atau klik
            Proses Pesanan ulang untuk request manual
          </TooltipContent>
        </Tooltip>
      )}
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => setPicklistOpen(true)}
      >
        <ClipboardListIcon className="size-3.5" />
        Buat Picklist
      </Button>
      {canDeleteOrder && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2Icon className="size-3.5" />
          Hapus
        </Button>
      )}
      <BuatPicklistDialog
        open={picklistOpen}
        onOpenChange={setPicklistOpen}
        orderIds={[order.id]}
        locationId={order.location_id ?? null}
        locationName={order.location_name ?? null}
        multiLocation={false}
        onCreated={() => setPicklistOpen(false)}
      />
      <DeleteOrderDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        orders={[{ id: order.id, no: order.salesorder_no }]}
        outcomeDescription="Pilih alasan penghapusan. Pesanan akan dipindahkan ke Gagal Picking agar dapat ditindaklanjuti."
        outcomeLabel="dipindahkan ke Gagal Picking"
      />
    </>
  );
}

function ContactBadges({ order, tab }: { order: Order; tab: OrderTab }) {
  if (tab !== "empty-stock") return null;

  const decisionColor: Record<string, string> = {
    waiting:
      "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300",
    cancel:
      "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
    replace:
      "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300",
  };

  return (
    <>
      {order.contacted_at ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-1.5 py-0.5 text-2xs font-medium text-success">
              <CheckIcon className="h-2.5 w-2.5" />
              Sudah dihubungi
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {formatDateTime(order.contacted_at)}
            {order.contact_note ? ` · ${order.contact_note}` : ""}
          </TooltipContent>
        </Tooltip>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-2xs font-medium text-warning">
          <ClockIcon className="h-2.5 w-2.5" />
          Belum dihubungi
        </span>
      )}
      {order.customer_decision && (
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-1.5 py-0.5 text-2xs font-medium",
            decisionColor[order.customer_decision],
          )}
        >
          {order.customer_decision === "waiting" && "Menunggu"}
          {order.customer_decision === "cancel" && "Batal"}
          {order.customer_decision === "replace" && "Ganti Barang"}
        </span>
      )}
    </>
  );
}

export function OrderCard({
  order,
  tab = "all",
  subFilter = null,
  selected,
  onSelectedChange,
  variant = "sales",
}: {
  order: Order;
  tab?: OrderTab;
  subFilter?: SubFilter;
  selected?: boolean;
  onSelectedChange?: (v: boolean) => void;
  variant?: OrderCardVariant;
}) {
  const { copy } = useCopyToClipboard();
  const isCancelView =
    tab === "cancellation" || tab === "channel-cancel" || order.is_canceled;
  const groupedItems = React.useMemo(() => {
    const map = new Map<string, OrderItem>();
    for (const item of order.items) {
      const key = `${item.channel_product_id ?? ""}|${item.sku}|${item.price}`;
      const existing = map.get(key);
      if (existing) {
        map.set(key, {
          ...existing,
          qty_in_base: existing.qty_in_base + item.qty_in_base,
          disc_amount: existing.disc_amount + item.disc_amount,
          tax_amount: existing.tax_amount + item.tax_amount,
          amount: existing.amount + item.amount,
        });
      } else {
        map.set(key, { ...item });
      }
    }
    return Array.from(map.values());
  }, [order.items]);

  const shipDeadline = order.ship_by_date ? new Date(order.ship_by_date) : null;
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const msToDeadline =
    shipDeadline && !Number.isNaN(shipDeadline.getTime())
      ? shipDeadline.getTime() - now
      : null;
  const isInstantUrgent =
    !!order.is_instant &&
    msToDeadline !== null &&
    msToDeadline < 60 * 60 * 1000;

  const isFinished =
    order.is_canceled ||
    ["shipped", "completed", "cancelled", "returned"].includes(order.status) ||
    [
      "SHIPPED",
      "COMPLETED",
      "CANCELLED",
      "DELIVERED",
      "TO_CONFIRM_RECEIVE",
    ].includes(order.channel_status?.toUpperCase() ?? "");

  const isShipToday = React.useMemo(() => {
    if (!order.ship_by_date || isFinished) return false;
    const deadline = new Date(order.ship_by_date);
    if (Number.isNaN(deadline.getTime())) return false;
    const today = new Date();
    return (
      deadline.getFullYear() === today.getFullYear() &&
      deadline.getMonth() === today.getMonth() &&
      deadline.getDate() === today.getDate()
    );
  }, [order.ship_by_date, isFinished]);

  return (
    <div
      className={cn(
        "group rounded-xl border border-border/60 bg-card transition-colors",
        selected && "border-primary/40 bg-primary/[0.02]",
        order.is_instant &&
          "border-orange-400/60 bg-orange-50/40 dark:border-orange-500/40 dark:bg-orange-950/15",
        isInstantUrgent &&
          "border-destructive/60 bg-destructive/[0.04] dark:border-destructive/50",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/40 px-4 py-2.5 sm:px-5">
        {onSelectedChange && (
          <Checkbox
            checked={selected}
            onCheckedChange={onSelectedChange}
            className="mr-0.5"
          />
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => copy(order.salesorder_no)}
              className={cn(
                "inline-flex items-center gap-1.5 font-mono text-sm font-semibold hover:text-primary transition-colors",
                order.is_instant && "text-orange-700 dark:text-orange-400",
              )}
            >
              {order.salesorder_no}
              <CopyIcon className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Klik untuk salin No. Pesanan</TooltipContent>
        </Tooltip>

        {order.is_shadow && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <StatusBadge domain="order-origin" status="shadow" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Order pembanding migrasi. Tidak difulfill & tidak memotong stok di
              sistem ini.
            </TooltipContent>
          </Tooltip>
        )}

        {/* Badge Prioritas (Gold / Amber) */}
        {order.priority_fulfillment && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex size-6 items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400">
                <StarIcon className="size-3.5 fill-current" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Pesanan Prioritas (Next-Day Delivery / Priority Fulfillment)
            </TooltipContent>
          </Tooltip>
        )}

        {/* Badge Instan (Orange / Urgent Red) */}
        {order.is_instant && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  "inline-flex size-6 items-center justify-center rounded-lg border transition-colors",
                  isInstantUrgent
                    ? "border-destructive/60 bg-destructive/15 text-destructive animate-pulse"
                    : "border-orange-500/40 bg-orange-500/10 text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-400",
                )}
              >
                <ZapIcon className="size-3.5 fill-current" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {isInstantUrgent
                ? "Pengiriman Instan Sangat Mendesak (< 1 jam atau terlambat)"
                : "Pengiriman Instan / Same Day"}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Badge Kirim Hari Ini (Sky Blue) */}
        {isShipToday && order.is_paid && tab !== "unpaid" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex size-6 items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-600 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-400">
                <CalendarClockIcon className="size-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Wajib Kirim Hari Ini (Batas SLA:{" "}
              {format(new Date(order.ship_by_date!), "dd MMM HH:mm", {
                locale: idLocale,
              })}
              )
            </TooltipContent>
          </Tooltip>
        )}

        {/* Badge COD (Emerald Green) */}
        {order.is_cod && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex size-6 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-400">
                <BanknoteIcon className="size-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Bayar di Tempat (COD / Cash on Delivery)
            </TooltipContent>
          </Tooltip>
        )}

        {isShopeeInstantOrSameDay({
          source: order.source,
          shippingProvider: order.shipping?.provider,
          shippingType: order.shipping_type,
          isInstant: order.is_instant,
        }) && order.driver_call_status ? (
          <DriverCallIndicator
            orderId={order.id}
            status={order.driver_call_status}
            message={order.driver_call_message}
            attemptedAt={order.driver_call_attempted_at}
          />
        ) : null}

        {order.channel_order_no && (
          <>
            <span className="text-border select-none">|</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => copy(order.channel_order_no!)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="text-2xs font-medium text-muted-foreground/70">
                    Ref:
                  </span>
                  <span className="font-mono">{order.channel_order_no}</span>
                  <CopyIcon className="h-2.5 w-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Klik untuk salin No. Referensi Channel
              </TooltipContent>
            </Tooltip>
          </>
        )}

        <span className="text-border select-none">|</span>
        <ChannelIcon
          source={order.source}
          commercePlatform={order.commerce_platform}
        />
        {order.shop_name && (
          <span className="truncate text-xs text-foreground max-w-[160px]">
            {order.shop_name}
          </span>
        )}

        <ContactBadges order={order} tab={tab} />

        <div className="ml-auto flex items-center gap-3 text-sm text-foreground">
          <span className="inline-flex items-center gap-1.5">
            <UserIcon className="size-3.5" />
            <span className="max-w-[180px] truncate font-medium text-foreground">
              {order.customer_name || "—"}
            </span>
          </span>
          {order.transaction_date && (
            <>
              <span className="hidden text-border select-none sm:inline">
                |
              </span>
              <span className="hidden items-center gap-1.5 sm:inline-flex">
                <CalendarIcon className="size-3.5" />
                {formatDateTime(order.transaction_date)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 py-3.5 sm:px-5 lg:flex-row lg:gap-6">
        <div className="flex-1 space-y-2.5 lg:max-w-[360px]">
          {groupedItems.length > 0 ? (
            groupedItems.map((item) => <ItemRow key={item.id} item={item} />)
          ) : (
            <span className="text-sm text-muted-foreground">
              Tidak ada item
            </span>
          )}
        </div>

        <div
          className={cn(
            "grid flex-1 grid-cols-2 gap-x-6 gap-y-3 lg:items-start",
            isCancelView
              ? "sm:grid-cols-3 xl:grid-cols-4"
              : "sm:grid-cols-3 xl:grid-cols-5",
          )}
        >
          <div className="min-w-0">
            <p className="mb-0.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Status SuperApps
            </p>
            <StatusBadge
              domain="sales-order"
              status={getOrderStatusBadgeStatus(order)}
              label={order.status_label}
              className="text-xs font-semibold whitespace-nowrap"
            />
            {order.channel_status && (
              <div className="mt-1.5 flex flex-col items-start gap-0.5">
                <span className="text-2xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                  Status Channel
                </span>
                <StatusBadge
                  domain="channel-status"
                  status={order.channel_status}
                  className="text-2xs font-medium whitespace-nowrap"
                />
              </div>
            )}
            {order.cancel_requested_at && !order.is_canceled && (
              <p className="mt-1 text-2xs font-medium text-warning">
                Pembatalan diminta
              </p>
            )}
          </div>

          <div className="min-w-0">
            <p className="mb-0.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground/70">
              Lokasi Pengambilan
            </p>
            <p className="flex items-start gap-1 text-sm">
              <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="line-clamp-2">{order.location_name || "—"}</span>
            </p>
          </div>

          <div>
            <p className="text-sm font-bold tabular-nums">
              {formatCurrency(order.grand_total)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {order.is_paid
                ? order.payment_method_name || "Dibayar"
                : "Belum dibayar"}
            </p>
          </div>

          {isCancelView ? (
            <div className="col-span-2 min-w-0 sm:col-span-1">
              <p className="mb-0.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground/70">
                Alasan Pembatalan
              </p>
              {(order.cancel_request_reason ?? order.cancel_reason) ? (
                <p className="flex items-start gap-1 text-sm">
                  <BanIcon className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                  <span className="line-clamp-3 font-medium text-foreground">
                    {order.cancel_request_reason ?? order.cancel_reason}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
          ) : (
            <>
              <div className="min-w-0">
                <p className="mb-0.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  Pengiriman
                </p>
                {order.shipping?.provider ? (
                  <div className="flex items-start gap-1 text-sm">
                    <TruckIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="font-medium">{order.shipping.provider}</p>
                      {order.shipping.tracking_number ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() =>
                                copy(order.shipping.tracking_number!)
                              }
                              className="mt-1 inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-2xs font-semibold text-foreground tabular-nums hover:bg-muted transition-colors"
                            >
                              <span className="text-muted-foreground">
                                AWB:
                              </span>
                              {order.shipping.tracking_number}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Klik untuk salin resi</TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>

              {tab !== "unpaid" && order.is_paid && (
                <ShipByDeadline
                  date={order.ship_by_date}
                  status={order.status}
                  channelStatus={order.channel_status}
                  isCanceled={order.is_canceled}
                />
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border/40 px-4 py-2 sm:px-5">
        <Button
          variant="link"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          asChild
        >
          <Link href={`/dashboard/pesanan/${order.id}`}>
            <EyeIcon className="size-3.5" />
            Lihat Detail
          </Link>
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {variant === "sales" && (
            <OrderActions order={order} tab={tab} subFilter={subFilter} />
          )}
          {variant === "outbound-ready" && (
            <OutboundReadyActions order={order} />
          )}
        </div>
      </div>
    </div>
  );
}
