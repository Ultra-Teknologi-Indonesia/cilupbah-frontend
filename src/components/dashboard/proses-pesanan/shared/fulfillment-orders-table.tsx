"use client";

import * as React from "react";
import Image from "next/image";
import {
  SearchIcon,
  RefreshCwIcon,
  MoreHorizontalIcon,
  Loader2Icon,
  CopyIcon,
  UserIcon,
  CalendarIcon,
  MapPinIcon,
  TruckIcon,
  PackageIcon,
  ZapIcon,
  DownloadIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  Trash2Icon,
  PrinterIcon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  useDismissPreManifestCancel,
  useDownloadPreManifestCancelXlsx,
  useMarkComplete,
  useOrdersByStage,
  usePreManifestCancelCount,
  useReadyToShip,
  useRetryPickup,
} from "@/hooks/proses-pesanan/use-fulfillment";
import type { FulfillmentOrder } from "@/types/proses-pesanan/fulfillment";
import { useCopyToClipboard } from "@/hooks/shared/use-copy-to-clipboard";
import { CHANNEL_MAP, orderChannelKey } from "@/types/pesanan/order";
import {
  SimplePagination,
  TABLE_PAGE_SIZES,
} from "@/components/ui/simple-pagination";

import { OrderStatusBadge } from "../channel-badge";
import { BuatPicklistDialog } from "../picking/buat-picklist-dialog";
import { BuatPengirimanDialog } from "../shipping/buat-pengiriman-dialog";
import { DocActions } from "../picking/doc-actions";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  FulfillmentFilterBar,
  type FulfillmentFilterField,
  type FulfillmentFilterValue,
} from "./fulfillment-filter-bar";
import { DeleteOrderDialog } from "./delete-order-dialog";
import { usePermissions } from "@/hooks/auth/use-permissions";

export interface OrderTableActions {
  buatPicklist?: boolean;
  buatPengiriman?: boolean;
  cetakLabel?: boolean;
  cetakPicklist?: boolean;
  cetakFaktur?: boolean;
  fakturLabel?: boolean;
  suratJalan?: boolean;
  siapDikirim?: boolean;
  selesaikanPesanan?: boolean;
}

function ChannelIcon({
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
    <span
      className="inline-flex h-6 items-center gap-1.5 shrink-0 rounded-xl px-1.5"
      style={{ backgroundColor: `${ch.color}10` }}
    >
      <span
        className="inline-block size-4 shrink-0"
        style={{ backgroundColor: ch.color, mask, WebkitMask: mask }}
      />
      <span className="text-xs font-semibold" style={{ color: ch.color }}>
        {ch.label}
      </span>
    </span>
  );
}

function OrderCard({
  order,
  actions,
  selected,
  onToggle,
  onShip,
  onComplete,
  onBuatPengiriman,
  onRetryPickup,
  onDismissCancel,
  onDeleteOrder,
  shipPending,
  completePending,
  retryPickupPending,
  dismissPending,
}: {
  order: FulfillmentOrder;
  actions: OrderTableActions;
  selected: boolean;
  onToggle: () => void;
  onShip: (ids: string[]) => void;
  onComplete: (ids: string[]) => void;
  onBuatPengiriman?: (order: FulfillmentOrder) => void;
  onRetryPickup?: (ids: string[]) => void;
  onDismissCancel?: (orderId: string) => void;
  onDeleteOrder?: (order: FulfillmentOrder) => void;
  shipPending: boolean;
  completePending: boolean;
  retryPickupPending?: boolean;
  dismissPending?: boolean;
}) {
  const { copy } = useCopyToClipboard();
  const isCancelled = order.status === "cancelled";

  const rowActions: {
    key: string;
    asButton: React.ReactNode;
    asMenuItem: React.ReactNode;
  }[] = [];

  if (isCancelled && onDismissCancel) {
    rowActions.push({
      key: "dismiss-cancel",
      asButton: (
        <Button
          size="sm"
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={() => onDismissCancel(order.id)}
          disabled={dismissPending}
        >
          {dismissPending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <CheckCircle2Icon className="size-3.5" />
          )}
          Sudah dipisahkan
        </Button>
      ),
      asMenuItem: (
        <DropdownMenuItem
          onSelect={() => onDismissCancel(order.id)}
          disabled={dismissPending}
        >
          <CheckCircle2Icon className="size-4 mr-2" />
          Sudah dipisahkan
        </DropdownMenuItem>
      ),
    });
  }

  if (!isCancelled && actions.buatPicklist) {
    rowActions.push({
      key: "buat-picklist",
      asButton: (
        <Button size="sm" variant="primary" onClick={onToggle}>
          Buat Picklist
        </Button>
      ),
      asMenuItem: (
        <DropdownMenuItem onSelect={onToggle}>Buat Picklist</DropdownMenuItem>
      ),
    });
  }

  if (!isCancelled && actions.buatPengiriman && onBuatPengiriman) {
    rowActions.push({
      key: "buat-pengiriman",
      asButton: (
        <Button
          size="sm"
          variant="primary"
          onClick={() => onBuatPengiriman(order)}
        >
          Buat Pengiriman
        </Button>
      ),
      asMenuItem: (
        <DropdownMenuItem onSelect={() => onBuatPengiriman(order)}>
          Buat Pengiriman
        </DropdownMenuItem>
      ),
    });
  }

  if (!isCancelled && actions.siapDikirim) {
    rowActions.push({
      key: "siap-dikirim",
      asButton: (
        <Button
          size="sm"
          variant="primary"
          onClick={() => onShip([order.id])}
          disabled={shipPending}
        >
          {shipPending && <Loader2Icon className="animate-spin" />}
          Siap Dikirim
        </Button>
      ),
      asMenuItem: (
        <DropdownMenuItem
          onSelect={() => onShip([order.id])}
          disabled={shipPending}
        >
          Siap Dikirim
        </DropdownMenuItem>
      ),
    });
  }

  if (!isCancelled && actions.selesaikanPesanan) {
    rowActions.push({
      key: "selesaikan-pesanan",
      asButton: (
        <Button
          size="sm"
          variant="primary"
          onClick={() => onComplete([order.id])}
          disabled={completePending}
        >
          {completePending && <Loader2Icon className="animate-spin" />}
          Selesaikan Pesanan
        </Button>
      ),
      asMenuItem: (
        <DropdownMenuItem
          onSelect={() => onComplete([order.id])}
          disabled={completePending}
        >
          Selesaikan Pesanan
        </DropdownMenuItem>
      ),
    });
  }

  if (order.channelStatus === "RETRY_SHIP" && onRetryPickup) {
    rowActions.push({
      key: "retry-pickup",
      asButton: (
        <Button
          size="sm"
          variant="outline"
          className="border-warning/40 text-warning hover:bg-warning/10"
          onClick={() => onRetryPickup([order.id])}
          disabled={retryPickupPending}
        >
          {retryPickupPending && <Loader2Icon className="animate-spin" />}
          Atur Ulang Pickup
        </Button>
      ),
      asMenuItem: (
        <DropdownMenuItem
          onSelect={() => onRetryPickup([order.id])}
          disabled={retryPickupPending}
        >
          Atur Ulang Pickup
        </DropdownMenuItem>
      ),
    });
  }

  if (actions.cetakFaktur) {
    rowActions.push({
      key: "cetak-faktur",
      asButton: (
        <Button
          size="sm"
          variant="outline"
          onClick={() => DocActions.invoice([order.id])}
        >
          Cetak Faktur
        </Button>
      ),
      asMenuItem: (
        <DropdownMenuItem onSelect={() => DocActions.invoice([order.id])}>
          Cetak Faktur
        </DropdownMenuItem>
      ),
    });
  }

  if (actions.cetakLabel && order.source) {
    rowActions.push({
      key: "cetak-label",
      asButton: (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            DocActions.shippingLabel([{ id: order.id, source: order.source }])
          }
        >
          Cetak Label
        </Button>
      ),
      asMenuItem: (
        <DropdownMenuItem
          onSelect={() =>
            DocActions.shippingLabel([{ id: order.id, source: order.source }])
          }
        >
          Cetak Label
        </DropdownMenuItem>
      ),
    });
  }

  if (actions.cetakPicklist) {
    rowActions.push({
      key: "cetak-picklist",
      asButton: (
        <Button
          size="sm"
          variant="outline"
          onClick={() => DocActions.pickList([order.id])}
        >
          Cetak Picklist
        </Button>
      ),
      asMenuItem: (
        <DropdownMenuItem onSelect={() => DocActions.pickList([order.id])}>
          Cetak Picklist
        </DropdownMenuItem>
      ),
    });
  }

  if (actions.fakturLabel) {
    rowActions.push({
      key: "faktur-label",
      asButton: (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            DocActions.invoiceAndLabel([{ id: order.id, source: order.source }])
          }
        >
          Cetak Faktur & Label
        </Button>
      ),
      asMenuItem: (
        <DropdownMenuItem
          onSelect={() =>
            DocActions.invoiceAndLabel([{ id: order.id, source: order.source }])
          }
        >
          Cetak Faktur & Label
        </DropdownMenuItem>
      ),
    });
  }

  if (actions.suratJalan) {
    rowActions.push({
      key: "surat-jalan",
      asButton: (
        <Button
          size="sm"
          variant="outline"
          onClick={() => DocActions.suratJalanAndInvoice([order.id])}
        >
          Surat Jalan + Faktur
        </Button>
      ),
      asMenuItem: (
        <DropdownMenuItem
          onSelect={() => DocActions.suratJalanAndInvoice([order.id])}
        >
          Surat Jalan + Faktur
        </DropdownMenuItem>
      ),
    });
  }

  if (onDeleteOrder) {
    rowActions.push({
      key: "hapus-pesanan",
      asButton: (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Hapus Pesanan"
              onClick={() => onDeleteOrder(order)}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Hapus Pesanan</TooltipContent>
        </Tooltip>
      ),
      asMenuItem: (
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => onDeleteOrder(order)}
        >
          <Trash2Icon className="size-4 mr-2" />
          Hapus Pesanan
        </DropdownMenuItem>
      ),
    });
  }

  const overflowActions = rowActions.length > 3 ? rowActions.slice(3) : [];
  const visibleActions =
    overflowActions.length > 0 ? rowActions.slice(0, 3) : rowActions;

  return (
    <div
      className={cn(
        "group rounded-xl border border-border/60 bg-card transition-all hover:border-border hover:shadow-sm",
        selected && "border-primary/40 bg-primary/[0.02]",
        order.isInstant &&
          "border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20",
        isCancelled && "border-l-4 border-l-destructive bg-destructive/5",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border/40 px-4 py-2.5 sm:px-5">
        {isCancelled ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Checkbox checked={false} disabled className="mr-0.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Order ini sudah dibatalkan setelah packing. Pisahkan paket fisik
              dulu, lalu klik &ldquo;Sudah dipisahkan&rdquo;.
            </TooltipContent>
          </Tooltip>
        ) : (
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            className="mr-0.5"
          />
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => copy(order.salesorderNo)}
              className={cn(
                "inline-flex items-center gap-1.5 font-mono text-sm font-semibold hover:text-primary transition-colors",
                order.isInstant && "text-orange-700 dark:text-orange-400",
              )}
            >
              {order.salesorderNo}
              <CopyIcon className="size-3 opacity-0 group-hover:opacity-50 transition-opacity" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Klik untuk salin No. Pesanan</TooltipContent>
        </Tooltip>

        {order.channelOrderNo && (
          <>
            <span className="text-border select-none">|</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => copy(order.channelOrderNo!)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="text-2xs font-medium text-muted-foreground/70">
                    Ref:
                  </span>
                  <span className="font-mono">{order.channelOrderNo}</span>
                  <CopyIcon className="size-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
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
          commercePlatform={order.commercePlatform}
        />

        {order.isInstant && (
          <Badge
            variant="outline"
            className="border-orange-500/60 bg-orange-500/15 text-orange-700 dark:text-orange-400 text-2xs px-1.5 py-0 gap-0.5"
          >
            <ZapIcon className="h-2.5 w-2.5 fill-current" />
            INSTANT
          </Badge>
        )}
        {order.isCod && (
          <Badge
            variant="outline"
            className="border-warning/50 bg-warning/10 text-warning text-2xs px-1.5 py-0"
          >
            COD
          </Badge>
        )}
        {order.priorityFulfillment && (
          <Badge
            variant="outline"
            className="border-destructive/50 bg-destructive/10 text-destructive text-2xs px-1.5 py-0"
          >
            Prioritas
          </Badge>
        )}
        {isCancelled && (
          <Badge className="bg-destructive text-white hover:bg-destructive/90 text-2xs px-1.5 py-0 gap-1">
            <AlertTriangleIcon className="h-2.5 w-2.5" />
            BATAL — Pisahkan Paket
          </Badge>
        )}

        <div className="ml-auto flex items-center gap-3 text-sm text-foreground">
          <span className="inline-flex items-center gap-1.5">
            <UserIcon className="size-3.5" />
            <span className="max-w-[180px] truncate font-medium text-foreground">
              {order.customerName || "—"}
            </span>
          </span>
          {order.transactionDate && (
            <>
              <span className="hidden text-border select-none sm:inline">
                |
              </span>
              <span className="hidden items-center gap-1.5 sm:inline-flex">
                <CalendarIcon className="size-3.5" />
                {formatDateTime(order.transactionDate)}
              </span>
            </>
          )}
        </div>
      </div>

      {order.items.length > 0 && (
        <div className="border-b border-border/40 px-4 py-2.5 sm:px-5">
          <div className="flex flex-col gap-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 text-sm">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.description || item.sku}
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded-xl border border-border/60 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/50">
                    <PackageIcon className="size-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {item.description || item.sku}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    SKU: {item.sku}
                  </p>
                </div>
                <span className="shrink-0 font-medium tabular-nums">
                  ×{item.qty}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-3.5 sm:grid-cols-4 sm:px-5">
        <div>
          <OrderStatusBadge status={order.status} />
          {order.totalQty != null && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <PackageIcon className="size-3" />
              {order.totalQty} item · {order.totalSku ?? 0} SKU
            </p>
          )}
        </div>

        <div className="min-w-0">
          <p className="mb-0.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground/70">
            Lokasi
          </p>
          <p className="flex items-start gap-1 text-sm">
            <MapPinIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span className="line-clamp-2">{order.locationName || "—"}</span>
          </p>
        </div>

        <div>
          <p className="mb-0.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground/70">
            Total
          </p>
          <p className="text-sm font-bold tabular-nums">
            {formatCurrency(order.grandTotal)}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {order.isPaid ? (
              <span className="text-success">Dibayar</span>
            ) : (
              "Belum dibayar"
            )}
          </p>
        </div>

        <div className="min-w-0">
          <p className="mb-0.5 text-2xs font-medium uppercase tracking-wider text-muted-foreground/70">
            Kurir
          </p>
          {order.shippingProvider ? (
            <div className="flex items-start gap-1 text-sm">
              <TruckIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="font-medium">{order.shippingProvider}</p>
                {order.trackingNumber && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => copy(order.trackingNumber!)}
                        className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {order.trackingNumber}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Klik untuk salin resi</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border/40 px-4 py-2.5 sm:px-5">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {visibleActions.map((a) => (
            <React.Fragment key={a.key}>{a.asButton}</React.Fragment>
          ))}
        </div>
        {overflowActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Aksi lainnya">
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              {overflowActions.map((a, i) => (
                <React.Fragment key={a.key}>
                  {a.key === "hapus-pesanan" && i > 0 && (
                    <DropdownMenuSeparator />
                  )}
                  {a.asMenuItem}
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

export function FulfillmentOrdersTable({
  stage,
  actions,
  searchPlaceholder = "Cari no. pesanan, resi, SKU…",
  filterFields,
  channelStatusOptions,
  excludeTransit,
}: {
  stage: string;
  actions: OrderTableActions;
  searchPlaceholder?: string;
  filterFields?: FulfillmentFilterField[];

  channelStatusOptions?: { value: string; label: string }[];
  excludeTransit?: boolean;
}) {
  const { can, canAny } = usePermissions();
  const canViewOrder = can("view-pesanan");
  const canViewPicking = can("view-picking");
  const canViewShipping = canAny([
    "view-pengiriman",
    "view-pesanan",
    "view-packing",
    "view-picking",
  ]);
  const canCreatePicking = can("create-picking");
  const canCreateShipping = can("create-pengiriman");
  const canEditOrder = can("edit-pesanan");
  const canDeleteOrder = can("delete-pesanan");
  const canEditShipping = can("edit-pengiriman");

  const permittedActions = React.useMemo<OrderTableActions>(
    () => ({
      buatPicklist: actions.buatPicklist && canCreatePicking,
      buatPengiriman: actions.buatPengiriman && canCreateShipping,
      cetakLabel: actions.cetakLabel && canViewShipping,
      cetakPicklist: actions.cetakPicklist && canViewPicking,
      cetakFaktur: actions.cetakFaktur && canViewOrder,
      fakturLabel: actions.fakturLabel && canViewOrder && canViewShipping,
      suratJalan: actions.suratJalan && canViewOrder,
      siapDikirim: actions.siapDikirim && canEditOrder,
      selesaikanPesanan: actions.selesaikanPesanan && canEditOrder,
    }),
    [
      actions,
      canCreatePicking,
      canCreateShipping,
      canEditOrder,
      canViewOrder,
      canViewPicking,
      canViewShipping,
    ],
  );
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(20);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [picklistOpen, setPicklistOpen] = React.useState(false);
  const [pengirimanOpen, setPengirimanOpen] = React.useState(false);
  const [singlePengirimanOrder, setSinglePengirimanOrder] =
    React.useState<FulfillmentOrder | null>(null);
  const [deleteTarget, setDeleteTarget] =
    React.useState<FulfillmentOrder | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<FulfillmentFilterValue>({});

  const [prevStage, setPrevStage] = React.useState(stage);
  if (stage !== prevStage) {
    setPrevStage(stage);
    setSelected(new Set());
    setPage(1);
    setSearch("");
    setDebounced("");
    setFilter({});
  }

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const [prevFilter, setPrevFilter] = React.useState(filter);
  if (filter !== prevFilter) {
    setPrevFilter(filter);
    setPage(1);
  }

  const params = React.useMemo(
    () => ({
      q: debounced || undefined,
      page,
      per_page: perPage,
      shipping_provider: filter.shipping_provider || undefined,
      location_id: filter.location_id || undefined,
      source: filter.source || undefined,
      channel_shop_id: filter.channel_shop_id || undefined,
      label_printed: (filter.label_printed || undefined) as
        "yes" | "no" | undefined,
      date_from: filter.date_from || undefined,
      date_to: filter.date_to || undefined,
      payment: (filter.payment || undefined) as "cod" | "noncod" | undefined,
      courier_type: (filter.courier_type || undefined) as
        "regular" | "instant" | undefined,
      channel_status: filter.channel_status || undefined,
      exclude_transit: excludeTransit ? ("1" as const) : undefined,
    }),
    [debounced, page, perPage, filter, excludeTransit],
  );
  const { data, isLoading, isFetching, refetch } = useOrdersByStage(
    stage,
    params,
  );
  const readyToShip = useReadyToShip();
  const retryPickup = useRetryPickup();
  const markComplete = useMarkComplete();
  const dismissCancel = useDismissPreManifestCancel();
  const downloadCancelXlsx = useDownloadPreManifestCancelXlsx();
  const preManifestCancelCount = usePreManifestCancelCount();

  const orders = React.useMemo(() => data?.items ?? [], [data?.items]);
  const meta = data?.meta ?? {
    current_page: 1,
    last_page: 1,
    per_page: perPage,
    total: 0,
  };

  // Progressive streaming render for large datasets (> 30 items) to prevent UI thread freezing
  const [renderedCount, setRenderedCount] = React.useState(() =>
    orders.length > 40 ? 30 : orders.length,
  );

  React.useEffect(() => {
    if (renderedCount < orders.length) {
      const handle = requestAnimationFrame(() => {
        setRenderedCount((prev) => Math.min(prev + 40, orders.length));
      });
      return () => cancelAnimationFrame(handle);
    }
  }, [renderedCount, orders.length]);

  const visibleOrders = orders.slice(
    0,
    orders.length > 40 ? Math.min(renderedCount, orders.length) : orders.length,
  );

  const selectableOrders = orders.filter((o) => o.status !== "cancelled");
  const pageIds = selectableOrders.map((o) => o.id);
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = pageIds.some((id) => selected.has(id));
  const selectedIds = React.useMemo(() => Array.from(selected), [selected]);

  const clearSelection = () => setSelected(new Set());
  const toggleAll = () =>
    allSelected ? clearSelection() : setSelected(new Set(pageIds));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDismissCancel = async (orderId: string) => {
    const target = orders.find((o) => o.id === orderId);
    try {
      await dismissCancel.mutateAsync(orderId);
      toast.success(
        `Order ${target?.salesorderNo ?? ""} ditandai sudah dipisahkan.`,
      );
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Gagal menandai order sudah dipisahkan.";
      toast.error(msg);
    }
  };

  const selectedOrders = orders.filter((o) => selected.has(o.id));
  const distinctLocations = Array.from(
    new Set(selectedOrders.map((o) => o.locationId).filter(Boolean)),
  );
  const picklistLocationId = distinctLocations[0] ?? null;
  const picklistLocationName =
    selectedOrders.find((o) => o.locationId === picklistLocationId)
      ?.locationName ?? null;

  const handleShip = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      const results = await readyToShip.mutateAsync(ids);
      const ok = results.filter((r) => r.status === "success").length;
      const failed = results.filter((r) => r.status === "failed");
      const skipped = results.filter((r) => r.status === "skipped");
      if (failed.length) {
        toast.error(
          `${ok} berhasil, ${failed.length} gagal${skipped.length ? `, ${skipped.length} dilewati` : ""}.` +
            (failed[0].message ? ` (${failed[0].message})` : ""),
        );
      } else if (ok === 0 && skipped.length) {
        toast.warning(
          `${skipped.length} pesanan dilewati.` +
            (skipped[0].message ? ` (${skipped[0].message})` : ""),
        );
      } else {
        toast.success(
          `${ok} pesanan diteruskan "Siap Dikirim"${skipped.length ? `, ${skipped.length} dilewati` : ""}.`,
        );
      }
      clearSelection();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Gagal memproses Siap Dikirim.";
      toast.error(msg);
    }
  };

  const handleComplete = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      const n = await markComplete.mutateAsync(ids);
      toast.success(`${n} pesanan diselesaikan.`);
      clearSelection();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Gagal menyelesaikan pesanan.";
      toast.error(msg);
    }
  };

  const handleRetryPickup = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      const results = await retryPickup.mutateAsync(ids);
      const ok = results.filter((r) => r.status === "success").length;
      const failed = results.filter((r) => r.status === "failed");
      const skipped = results.filter((r) => r.status === "skipped");
      if (failed.length) {
        toast.error(
          `${ok} berhasil, ${failed.length} gagal atur ulang pickup.` +
            (failed[0].message ? ` (${failed[0].message})` : ""),
        );
      } else if (ok === 0 && skipped.length) {
        toast.warning(
          `${skipped.length} pesanan dilewati.` +
            (skipped[0].message ? ` (${skipped[0].message})` : ""),
        );
      } else {
        toast.success(
          `${ok} pesanan berhasil diatur ulang pickup${skipped.length ? `, ${skipped.length} dilewati` : ""}.`,
        );
      }
      clearSelection();
    } catch (err) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : "Gagal mengatur ulang pickup.";
      toast.error(msg);
    }
  };

  return (
    <div>
      {filterFields && filterFields.length > 0 ? (
        <>
          <FulfillmentFilterBar
            value={filter}
            onChange={setFilter}
            fields={filterFields}
            channelStatusOptions={channelStatusOptions}
            excludeTransit={excludeTransit}
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            searchPlaceholder={searchPlaceholder}
          />
          <div className="flex items-center justify-end gap-3 px-4 py-2 text-sm text-muted-foreground sm:px-5">
            {actions.buatPengiriman && can("export-pengiriman") && (
              <UnduhBatalButton
                count={preManifestCancelCount.data ?? 0}
                onDownload={(range) => downloadCancelXlsx.mutate(range)}
                pending={downloadCancelXlsx.isPending}
              />
            )}
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full p-1.5 transition-colors hover:bg-muted"
              aria-label="Muat ulang"
            >
              <RefreshCwIcon
                className={cn("size-4", isFetching && "animate-spin")}
              />
            </button>
            <span className="flex items-center gap-1.5">
              Total <Badge>{meta.total}</Badge>
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="relative w-full max-w-xs">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {actions.buatPengiriman && can("export-pengiriman") && (
              <UnduhBatalButton
                count={preManifestCancelCount.data ?? 0}
                onDownload={(range) => downloadCancelXlsx.mutate(range)}
                pending={downloadCancelXlsx.isPending}
              />
            )}
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full p-1.5 transition-colors hover:bg-muted"
              aria-label="Muat ulang"
            >
              <RefreshCwIcon
                className={cn("size-4", isFetching && "animate-spin")}
              />
            </button>
            <span className="flex items-center gap-1.5">
              Total <Badge>{meta.total}</Badge>
            </span>
          </div>
        </div>
      )}

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-y border-primary/20 bg-primary/5 px-4 py-2.5 sm:px-5">
          <Checkbox
            checked={
              allSelected ? true : someSelected ? "indeterminate" : false
            }
            onCheckedChange={toggleAll}
          />
          <span className="mr-1 text-sm font-medium">
            {selected.size} pesanan dipilih
          </span>
          {permittedActions.buatPicklist && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setPicklistOpen(true)}
            >
              Buat Picklist
            </Button>
          )}
          {permittedActions.buatPengiriman && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setPengirimanOpen(true)}
            >
              Buat Pengiriman
            </Button>
          )}
          {permittedActions.cetakFaktur && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => DocActions.invoice(selectedIds)}
            >
              Cetak Faktur
            </Button>
          )}
          {permittedActions.cetakLabel && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() =>
                DocActions.shippingLabel(
                  selectedOrders
                    .filter(
                      (o) => (o.source ?? "").toLowerCase() !== "woocommerce",
                    )
                    .map((o) => ({ id: o.id, source: o.source })),
                )
              }
            >
              <PrinterIcon className="size-4" />
              Cetak Label
            </Button>
          )}
          {permittedActions.cetakPicklist && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => DocActions.pickList(selectedIds)}
            >
              Cetak Picklist
            </Button>
          )}
          {permittedActions.fakturLabel && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                DocActions.invoiceAndLabel(
                  selectedOrders.map((o) => ({ id: o.id, source: o.source })),
                )
              }
            >
              Faktur & Label
            </Button>
          )}
          {permittedActions.suratJalan && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => DocActions.suratJalanAndInvoice(selectedIds)}
            >
              Surat Jalan + Faktur
            </Button>
          )}
          {permittedActions.siapDikirim && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleShip(selectedIds)}
              disabled={readyToShip.isPending}
            >
              {readyToShip.isPending && (
                <Loader2Icon className="animate-spin" />
              )}
              Siap Dikirim
            </Button>
          )}
          {permittedActions.selesaikanPesanan && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleComplete(selectedIds)}
              disabled={markComplete.isPending}
            >
              {markComplete.isPending && (
                <Loader2Icon className="animate-spin" />
              )}
              Selesaikan Pesanan
            </Button>
          )}
          {canDeleteOrder && (
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2Icon className="size-4" />
              Hapus
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={clearSelection}
            className="ml-auto"
          >
            Batal
          </Button>
        </div>
      )}

      <div className="px-4 py-3 sm:px-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={PackageIcon}
            title="Tidak ada pesanan."
            className="py-16"
          />
        ) : (
          <div className="flex flex-col gap-3">
            {selected.size === 0 && orders.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <Checkbox
                  checked={
                    allSelected ? true : someSelected ? "indeterminate" : false
                  }
                  onCheckedChange={toggleAll}
                />
                <span className="text-xs text-muted-foreground">
                  Pilih semua
                </span>
              </div>
            )}

            {visibleOrders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                actions={permittedActions}
                selected={selected.has(o.id)}
                onToggle={() => toggleOne(o.id)}
                onShip={handleShip}
                onComplete={handleComplete}
                onBuatPengiriman={
                  permittedActions.buatPengiriman
                    ? (order) => {
                        setSinglePengirimanOrder(order);
                      }
                    : undefined
                }
                onRetryPickup={canEditOrder ? handleRetryPickup : undefined}
                onDismissCancel={
                  canEditShipping ? handleDismissCancel : undefined
                }
                onDeleteOrder={canDeleteOrder ? setDeleteTarget : undefined}
                shipPending={readyToShip.isPending}
                completePending={markComplete.isPending}
                retryPickupPending={retryPickup.isPending}
                dismissPending={
                  dismissCancel.isPending && dismissCancel.variables === o.id
                }
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-4 sm:px-5">
        <SimplePagination
          page={meta.current_page}
          lastPage={meta.last_page}
          onPageChange={setPage}
          perPage={perPage}
          onPerPageChange={(s) => {
            setPerPage(s);
            setPage(1);
          }}
          pageSizeOptions={TABLE_PAGE_SIZES}
          isFetching={isFetching}
          label="pesanan"
          total={meta.total}
        />
      </div>

      {permittedActions.buatPicklist && (
        <BuatPicklistDialog
          open={picklistOpen}
          onOpenChange={setPicklistOpen}
          orderIds={selectedIds}
          locationId={picklistLocationId}
          locationName={picklistLocationName}
          multiLocation={distinctLocations.length > 1}
          onCreated={clearSelection}
        />
      )}

      {permittedActions.buatPengiriman &&
        (() => {
          const bulkSources = Array.from(
            new Set(selectedOrders.map((o) => o.source).filter(Boolean)),
          );
          const bulkSource = bulkSources.length === 1 ? bulkSources[0] : null;
          const bulkProviders = Array.from(
            new Set(
              selectedOrders.map((o) => o.shippingProvider).filter(Boolean),
            ),
          );
          const bulkProvider =
            bulkProviders.length === 1 ? bulkProviders[0] : null;
          return (
            <BuatPengirimanDialog
              open={pengirimanOpen}
              onOpenChange={setPengirimanOpen}
              orderIds={selectedIds}
              locationId={picklistLocationId}
              locationName={picklistLocationName}
              multiLocation={distinctLocations.length > 1}
              onCreated={clearSelection}
              marketplaceSource={bulkSource}
              shippingProvider={bulkProvider}
            />
          );
        })()}

      {canDeleteOrder && (
        <DeleteOrderDialog
          open={bulkDeleteOpen || !!deleteTarget}
          onOpenChange={(open) => {
            if (!open) {
              setBulkDeleteOpen(false);
              setDeleteTarget(null);
            }
          }}
          orders={
            bulkDeleteOpen
              ? selectedOrders.map((o) => ({ id: o.id, no: o.salesorderNo }))
              : deleteTarget
                ? [{ id: deleteTarget.id, no: deleteTarget.salesorderNo }]
                : []
          }
          onDeleted={clearSelection}
        />
      )}

      {singlePengirimanOrder && (
        <BuatPengirimanDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setSinglePengirimanOrder(null);
          }}
          orderIds={[singlePengirimanOrder.id]}
          locationId={singlePengirimanOrder.locationId}
          locationName={singlePengirimanOrder.locationName}
          multiLocation={false}
          onCreated={() => setSinglePengirimanOrder(null)}
          marketplaceSource={singlePengirimanOrder.source}
          shippingProvider={singlePengirimanOrder.shippingProvider}
        />
      )}
    </div>
  );
}

function UnduhBatalButton({
  count,
  onDownload,
  pending,
}: {
  count: number;
  onDownload: (range?: { date_from?: string; date_to?: string }) => void;
  pending: boolean;
}) {
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10"
          disabled={pending}
        >
          {pending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <DownloadIcon className="size-3.5" />
          )}
          Unduh Batal
          {count > 0 && (
            <Badge className="ml-1 bg-destructive text-white hover:bg-destructive/90 h-4 min-w-4 px-1 text-2xs tabular-nums">
              {count}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuItem onSelect={() => onDownload()}>
          Hari ini
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <p className="mb-1.5 text-2xs font-medium text-muted-foreground">
            Rentang tanggal
          </p>
          <div className="flex flex-col gap-1.5">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              variant="primary"
              disabled={!dateFrom || !dateTo || pending}
              onClick={() =>
                onDownload({ date_from: dateFrom, date_to: dateTo })
              }
            >
              Unduh
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const ORDER_ACTION_PRESET = {
  pickingBelum: {
    buatPicklist: true,
    cetakLabel: true,
    cetakPicklist: true,
    siapDikirim: true,
  },
  docSet: {
    cetakFaktur: true,
    cetakLabel: true,
    fakturLabel: true,
    suratJalan: true,
    siapDikirim: true,
  },
  shippingSiapKirim: {
    buatPengiriman: true,
    cetakLabel: true,
    cetakFaktur: true,
  },
  sudahDikirim: { selesaikanPesanan: true, cetakLabel: true },
  selesai: { cetakFaktur: true, cetakLabel: true },
} satisfies Record<string, OrderTableActions>;
