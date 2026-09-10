"use client";

import { DetailSkeleton } from "@/components/ui/page-skeleton";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Loader2Icon,
  PackageIcon,
  ScanBarcodeIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { formatPickingDuration } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header";
import { PageTitle } from "@/components/dashboard/page-title";
import {
  usePicklistDetail,
  usePicklistItems,
  useStartPicklist,
  usePickItem,
  useScanForPick,
  useCompletePicklist,
  useUnassignPicklist,
  useResetPicklistAssignment,
} from "@/hooks/proses-pesanan/use-fulfillment";
import {
  AssignmentLockBanner,
  ResetAssignmentDialog,
  UnassignReasonDialog,
} from "@/components/shared/channel-lock";
import { useMe } from "@/hooks/auth/use-auth";
import { useListState } from "@/hooks/use-list-state";
import { DeleteOrderDialog } from "@/components/dashboard/proses-pesanan/shared/delete-order-dialog";
import type {
  FulfillmentListParams,
  PicklistItem,
} from "@/types/proses-pesanan/fulfillment";
import { ScanAutoflowBar } from "@/components/dashboard/shared/scan-autoflow-bar";
import { useScanDeltaQueue } from "@/hooks/proses-pesanan/use-scan-delta-queue";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { QtyConfirmInput } from "@/components/ui/qty-confirm-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserLookup } from "@/hooks/pengaturan/use-users";
import { playScanFeedback } from "@/lib/scan-feedback";
import { matchesKnownBin } from "@/lib/validators/bin-code";
import { apiError, apiSuccess } from "@/lib/toast";
import { usePermissions } from "@/hooks/auth/use-permissions";

const LIST_HREF = "/dashboard/proses-pesanan/picking";

type ApiErrorShape = {
  status?: number;
  message?: string | null;
  errors?: Record<string, unknown> | null;
};

function isItemAlreadyFull(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const body = err as ApiErrorShape;
  return body.status === 409 && body.errors?.code === "ITEM_ALREADY_FULL";
}

function readApiMessage(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  return (err as ApiErrorShape).message?.trim() || null;
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

function getItemStatus(
  picked: number,
  ordered: number,
  s: string | null | undefined,
) {
  if (s === "SHORT" || s === "REJECTED") return s;
  if (s === "PROCESSED_EXTERNALLY") return s;
  if (picked >= ordered && ordered > 0) return "COMPLETED";
  if (picked > 0) return "PARTIAL";
  if (s === "PICKED") return "COMPLETED";
  return "PENDING";
}

function isFailedStatus(s: string | null | undefined) {
  return s === "SHORT" || s === "REJECTED";
}

function PickingDurationLive({
  startedAt,
  completedAt,
  status,
}: {
  startedAt: string | null;
  completedAt: string | null;
  status: string;
}) {
  const [, forceTick] = React.useReducer((c: number) => c + 1, 0);

  React.useEffect(() => {
    if (status !== "IN_PROGRESS" || completedAt) return;
    const t = setInterval(forceTick, 60_000);
    return () => clearInterval(t);
  }, [status, completedAt]);

  return <>{formatPickingDuration(startedAt, completedAt, status)}</>;
}

export function PickingProsesView({ id }: { id: string }) {
  const router = useRouter();

  const binScanRef = React.useRef<HTMLInputElement>(null);
  const qtyInputRef = React.useRef<HTMLInputElement>(null);

  const [skuRefocusKey, setSkuRefocusKey] = React.useState(0);
  const [binScan, setBinScan] = React.useState("");
  const [scannedBinCode, setScannedBinCode] = React.useState<string | null>(
    null,
  );
  const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
  const [pickQty, setPickQty] = React.useState("");

  const [activePickMax, setActivePickMax] = React.useState(0);
  const [activeCandidates, setActiveCandidates] = React.useState<
    Array<{ bin_id: string; bin_code: string; on_hand: number }>
  >([]);
  const [activeChosenBinCode, setActiveChosenBinCode] = React.useState<
    string | null
  >(null);

  const {
    data: pl,
    isLoading: isPicklistLoading,
    isError,
  } = usePicklistDetail(id);

  const { data: me } = useMe();
  const { can } = usePermissions();
  const canEditPicking = can("edit-picking");
  const canDeletePicking = can("delete-picking");
  const canDeleteOrder = can("delete-pesanan");
  const canUnassign = canEditPicking;
  const canReset = canDeletePicking;

  const [unassignOpen, setUnassignOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const unassignMutation = useUnassignPicklist(id);
  const resetMutation = useResetPicklistAssignment(id);

  const staffQuery = useUserLookup({
    role: "picker",
    perPage: 50,
  }, canEditPicking || canDeletePicking);
  const staffOptions = React.useMemo(
    () =>
      (staffQuery.data?.items ?? [])
        .filter((u) => u.id !== pl?.pickerId)
        .map((u) => ({ id: u.id, name: u.name })),
    [staffQuery.data, pl?.pickerId],
  );
  const list = useListState(
    {},
    {
      perPage: 1000,
      namespace: "items",
    },
  );

  const params = React.useMemo(() => {
    return {
      page: list.page,
      per_page: list.perPage,
      sort_by: list.sorting[0]?.id,
      sort_dir: list.sorting[0]?.desc ? "desc" : "asc",
    } as FulfillmentListParams;
  }, [list.page, list.perPage, list.sorting]);

  const itemsQuery = usePicklistItems(id, params, {
    live: pl?.status === "IN_PROGRESS" || pl?.status === "DRAFT",
  });

  const isLoading = isPicklistLoading || itemsQuery.isLoading;
  const startPicklist = useStartPicklist();
  const pickItem = usePickItem();
  const scanForPick = useScanForPick();
  const completePicklist = useCompletePicklist();
  const [deleteOrderTarget, setDeleteOrderTarget] = React.useState<{
    orderId: string;
    orderNo: string | null;
  } | null>(null);

  const items = React.useMemo(
    () => itemsQuery.data?.data ?? [],
    [itemsQuery.data?.data],
  );

  const itemsRef = React.useRef(items);
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const pickBinRef = React.useRef<Map<string, string>>(new Map());
  const commitPick = React.useCallback(
    async (itemId: string, deltaQty: number) => {
      const binCode = pickBinRef.current.get(itemId);
      if (!binCode) throw new Error("Rak belum dipilih.");
      try {
        await pickItem.mutateAsync({
          picklistId: id,
          itemId,
          qtyDelta: deltaQty,
          binCode,
        });
      } catch (e) {
        if (isItemAlreadyFull(e)) {
          playScanFeedback("error");
          toast.info(readApiMessage(e) ?? "Barang ini sudah lengkap.");
          void itemsQuery.refetch();
          return;
        }
        throw e;
      }
    },
    [pickItem, id, itemsQuery],
  );
  const { bump: bumpPick } = useScanDeltaQueue(commitPick, {
    onSuccess: (res, _itemId) => {
      if (
        res &&
        typeof res === "object" &&
        res.status === "success" &&
        res.already_shipped
      ) {
        apiSuccess(res, "Sukses");
      }
    },
    onGiveUp: (itemId, lostQty, error) => {
      const item = itemsRef.current.find((i) => i.id === itemId);
      playScanFeedback("error");
      apiError(
        error,
        `Gagal menyimpan ${lostQty} scan ${item?.sku ?? ""} — scan ulang barang ini.`,
      );
    },
  });

  const totalOrdered = items.reduce((s, i) => s + i.qtyOrdered, 0);
  const totalPicked = items.reduce((s, i) => s + i.qtyPicked, 0);
  const failedCount = items.filter((i) => isFailedStatus(i.itemStatus)).length;
  const completedCount = items.filter(
    (i) =>
      (i.qtyPicked >= i.qtyOrdered && !isFailedStatus(i.itemStatus)) ||
      i.itemStatus === "PROCESSED_EXTERNALLY",
  ).length;
  const allResolved =
    items.length > 0 &&
    items.every(
      (i) =>
        i.qtyPicked >= i.qtyOrdered ||
        isFailedStatus(i.itemStatus) ||
        i.itemStatus === "PROCESSED_EXTERNALLY",
    );
  const isTerminal = pl
    ? ["COMPLETED", "FAILED", "CANCELLED"].includes(pl.status)
    : false;

  const editable = !!pl && !isTerminal && canEditPicking;

  React.useEffect(() => {
    if (pl && pl.status === "COMPLETED") {
      toast.info(`Picklist ${pl.picklistNo} sudah selesai.`);
    }
  }, [pl]);

  const didAutoStart = React.useRef(false);
  React.useEffect(() => {
    if (!pl || didAutoStart.current) return;
    if (pl.status === "DRAFT" && canEditPicking) {
      didAutoStart.current = true;
      startPicklist.mutate(id, {
        onSuccess: () =>
          toast.success(`Picking dimulai untuk ${pl.picklistNo}.`),
        onError: (e) => apiError(e, "Gagal memulai picking."),
      });
    }
  }, [pl, id, startPicklist, canEditPicking]);

  const [completeDialogDismissed, setCompleteDialogDismissed] =
    React.useState(false);
  const completeDialogOpen =
    !!pl && editable && allResolved && !completeDialogDismissed;

  const redirectToInvoicePreview = () => {
    const orderIds = Array.from(
      new Set(items.map((it) => it.orderId).filter(Boolean)),
    ) as string[];

    if (orderIds.length === 1) {
      router.push(`/dashboard/document-preview/invoice/${orderIds[0]}`);
    } else if (orderIds.length > 1) {
      router.push(
        `/dashboard/document-preview/invoice-bulk/${orderIds.join(",")}`,
      );
    } else {
      router.push(LIST_HREF);
    }
  };

  const handleCompletePicking = () => {
    completePicklist.mutate(id, {
      onSuccess: () => {
        toast.success("Picking selesai. Membuka preview faktur...");
        setCompleteDialogDismissed(true);
        redirectToInvoicePreview();
      },
      onError: (e) => apiError(e, "Gagal menyelesaikan picking."),
    });
  };

  const activeItem = activeItemId
    ? (items.find((i) => i.id === activeItemId) ?? null)
    : null;

  const handleScanSku = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;
    if (!editable) return;
    const knownBins = [
      scannedBinCode,
      activeChosenBinCode,
      ...activeCandidates.map((c) => c.bin_code),
      ...Array.from(pickBinRef.current.values()),
    ];
    if (matchesKnownBin(code, knownBins)) {
      playScanFeedback("error");
      toast.error(`"${code}" adalah kode rak, bukan SKU produk.`);
      setSkuRefocusKey((k) => k + 1);
      return;
    }

    try {
      const res = await scanForPick.mutateAsync({
        picklistId: id,
        sku: code,
        binCode: null,
        hintActiveBinCode: scannedBinCode,
      });
      setScannedBinCode(res.bin_code);

      if ((res.candidates?.length ?? 0) > 1) {
        playScanFeedback("ok");
        setActiveItemId(res.item_id);
        setActivePickMax(res.max_pickable);
        setPickQty(String(res.max_pickable));
        setActiveCandidates(res.candidates ?? []);
        setActiveChosenBinCode(res.bin_code);
        toast.info(
          `SKU ada di ${res.candidates.length} rak. Default ambil dari ${res.bin_code}. Ganti kalau perlu.`,
        );
        setTimeout(() => qtyInputRef.current?.focus(), 50);
        return;
      }

      const item = itemsRef.current.find((i) => i.id === res.item_id);

      if (item && item.qtyPicked >= item.qtyOrdered) {
        playScanFeedback("error");
        toast.info(`${item.sku} sudah lengkap.`);
        setSkuRefocusKey((k) => k + 1);
        return;
      }
      pickBinRef.current.set(res.item_id, res.bin_code);
      playScanFeedback("ok");
      bumpPick({ itemId: res.item_id, delta: 1 });
      setSkuRefocusKey((k) => k + 1);
    } catch (e) {
      playScanFeedback("error");
      apiError(e, `SKU "${code}" tidak bisa diambil.`);
      setSkuRefocusKey((k) => k + 1);
    }
  };

  const handleConfirmPick = () => {
    const binCodeForCommit = activeChosenBinCode ?? scannedBinCode;
    if (!activeItem || !binCodeForCommit) return;
    const qty = Number.parseInt(pickQty, 10);
    if (Number.isNaN(qty) || qty <= 0) {
      playScanFeedback("error");
      toast.error("Masukkan qty yang valid.");
      return;
    }
    pickItem.mutate(
      {
        picklistId: id,
        itemId: activeItem.id,
        qtyDelta: qty,
        binCode: binCodeForCommit,
      },
      {
        onSuccess: () => {
          playScanFeedback("ok");
          toast.success(
            `Stok terpotong: ${activeItem.sku} × ${qty} @ ${binCodeForCommit}.`,
          );
          setScannedBinCode(binCodeForCommit);
          setActiveItemId(null);
          setPickQty("");
          setActiveCandidates([]);
          setActiveChosenBinCode(null);
          setSkuRefocusKey((k) => k + 1);
        },
        onError: (e) => {
          playScanFeedback("error");
          if (isItemAlreadyFull(e)) {
            toast.info(readApiMessage(e) ?? `${activeItem.sku} sudah lengkap.`);
            void itemsQuery.refetch();
            setActiveItemId(null);
            setPickQty("");
            return;
          }
          apiError(e, `Gagal pick ${activeItem.sku}.`);
        },
      },
    );
  };

  const handleCancelPick = () => {
    setActiveItemId(null);
    setPickQty("");
    setActivePickMax(0);
    setActiveCandidates([]);
    setActiveChosenBinCode(null);
    setSkuRefocusKey((k) => k + 1);
  };

  const handleScanBin = () => {
    const code = binScan.trim();
    if (!code) return;
    const isSku = items.some((i) => i.sku.toLowerCase() === code.toLowerCase());
    if (isSku) {
      playScanFeedback("error");
      toast.error(`"${code}" adalah SKU produk, bukan kode rak.`);
      setBinScan("");
      binScanRef.current?.focus();
      return;
    }
    setBinScan("");
    setScannedBinCode(code);
    playScanFeedback("ok");
    toast.success(`Rak ${code} aktif.`);
    setSkuRefocusKey((k) => k + 1);
  };

  const handleComplete = () => {
    completePicklist.mutate(id, {
      onSuccess: () => {
        toast.success("Picking selesai. Membuka preview faktur...");
        redirectToInvoicePreview();
      },
      onError: (e) => apiError(e, "Gagal menyelesaikan picking."),
    });
  };

  const columns = React.useMemo<ColumnDef<PicklistItem>[]>(
    () => [
      {
        id: "produk",
        accessorFn: (row) => row.name ?? row.sku,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Produk" />
        ),
        cell: ({ row }) => {
          const it = row.original;
          return (
            <div className="flex items-start gap-3 py-1">
              <ItemImage src={it.imageUrl} alt={it.name ?? it.sku} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="whitespace-normal break-words font-medium text-foreground">
                  {it.name ?? it.sku}
                </span>
                <span className="whitespace-normal break-all font-mono text-xs text-foreground/70">
                  {it.sku}
                </span>
                {it.variantName && (
                  <span className="whitespace-normal break-words text-xs text-muted-foreground">
                    {it.variantName}
                  </span>
                )}
              </div>
            </div>
          );
        },
        size: 320,
      },
      {
        id: "qty_ordered",
        accessorKey: "qtyOrdered",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Qty Pesan" />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums text-foreground">
            {row.original.qtyOrdered}
          </span>
        ),
      },
      {
        id: "bin_code",
        accessorKey: "binCode",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Kode Rak" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-foreground">
            {row.original.binCode ?? "—"}
          </span>
        ),
      },
      {
        id: "qty_picked",
        accessorFn: (row) => row.qtyPicked,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Qty Ambil / Pesan" />
        ),
        cell: ({ row }) => {
          const it = row.original;
          const done = it.qtyPicked >= it.qtyOrdered;
          return (
            <div className="space-y-0.5">
              <span
                className={cn(
                  "inline-flex h-6 min-w-10 items-center justify-center rounded-xl px-2 text-xs font-medium tabular-nums",
                  done
                    ? "bg-success/10 text-success"
                    : it.qtyPicked > 0
                      ? "bg-warning/10 text-warning"
                      : "text-muted-foreground",
                )}
              >
                {it.qtyPicked} / {it.qtyOrdered}
              </span>
              {it.lastPickedByName && (
                <div className="text-[11px] text-muted-foreground">
                  oleh {it.lastPickedByName}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "order_no",
        accessorKey: "orderNo",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Pesanan" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-foreground">
            {row.original.orderNo ?? "—"}
          </span>
        ),
      },
      {
        id: "package_no",
        accessorKey: "packageNo",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Paket" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-foreground">
            {row.original.packageNo ?? "—"}
          </span>
        ),
      },
      {
        id: "item_status",
        accessorFn: (row) =>
          getItemStatus(row.qtyPicked, row.qtyOrdered, row.itemStatus),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const itemStatus = getItemStatus(
            row.original.qtyPicked,
            row.original.qtyOrdered,
            row.original.itemStatus,
          );
          return <StatusBadge domain="picking-item" status={itemStatus} />;
        },
      },
      {
        id: "tracking_number",
        accessorKey: "trackingNumber",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="No. Resi" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-foreground">
            {row.original.trackingNumber ?? "—"}
          </span>
        ),
      },
      {
        id: "aksi",
        header: () => <span className="flex justify-end pr-2">Aksi</span>,
        cell: ({ row }) => {
          const it = row.original;
          const done = it.qtyPicked >= it.qtyOrdered;
          if (!editable || !canDeleteOrder) {
            return (
              <div className="flex justify-end pr-2">
                <span className="text-xs text-muted-foreground">—</span>
              </div>
            );
          }
          return (
            <div className="flex items-center justify-end gap-1 pr-2">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Hapus pesanan dari picking"
                title={
                  done
                    ? "Item sudah selesai"
                    : "Hapus pesanan (gagalkan picking)"
                }
                disabled={done}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!it.orderId) return;
                  setDeleteOrderTarget({
                    orderId: it.orderId,
                    orderNo: it.orderNo,
                  });
                }}
              >
                <Trash2Icon className="size-4 text-destructive" />
              </Button>
            </div>
          );
        },
        size: 100,
      },
    ],
    [editable, canDeleteOrder],
  );

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={pl ? `Picking - ${pl.picklistNo}` : "Proses Picking"}
        backHref={LIST_HREF}
        breadcrumb={[
          { label: "Gudang" },
          { label: "Proses Pesanan", href: LIST_HREF },
          { label: "Picking", href: LIST_HREF },
          { label: "Proses Picking" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={handleComplete}
              disabled={!editable || !allResolved || completePicklist.isPending}
            >
              {completePicklist.isPending && (
                <Loader2Icon className="animate-spin" />
              )}
              Selesaikan Picking
            </Button>
          </div>
        }
      />

      {pl && (
        <AssignmentLockBanner
          mode="collaborative"
          assignedToName={pl.pickerName ?? null}
          assignedAt={pl.assignedAt ?? null}
          isUnlockedOnce={pl.completedAt != null}
          status={pl.status}
          onUnassign={() => setUnassignOpen(true)}
          onReset={() => setResetOpen(true)}
          canUnassign={canUnassign && !!pl.pickerId}
          canReset={canReset && !!pl.pickerId}
        />
      )}

      {isLoading ? (
        <DetailSkeleton />
      ) : isError || !pl ? (
        <div className="py-24 text-center text-sm text-destructive">
          Gagal memuat picklist.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  No Picklist
                </span>
                <StatusBadge domain="picklist" status={pl.status} />
              </div>
              <div className="mt-1 font-mono text-sm font-semibold text-foreground">
                {pl.picklistNo}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Lokasi</span>
                <span className="font-medium text-foreground">
                  {pl.locationName ?? "—"}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Picker</span>
                <span className="font-medium text-foreground">
                  {pl.pickerName ?? "—"}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>Durasi Picking</span>
                <span className="font-medium tabular-nums text-foreground">
                  <PickingDurationLive
                    startedAt={pl.startedAt}
                    completedAt={pl.completedAt}
                    status={pl.status}
                  />
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span className="font-semibold tabular-nums text-foreground">
                  {totalPicked} / {totalOrdered}
                </span>
              </div>
              <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all",
                    allResolved && failedCount === 0
                      ? "bg-success"
                      : "bg-primary",
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
              {failedCount > 0 && (
                <div className="mt-1 text-xs text-warning">
                  Gagal: {failedCount}
                </div>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-xs text-muted-foreground">
                Kode Rak Aktif
              </div>
              <div className="mt-1 font-mono text-base font-semibold text-foreground">
                {scannedBinCode ?? "—"}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <ScanBarcodeIcon className="size-4 text-muted-foreground" />
                <div className="text-sm font-medium">Ganti Rak (opsional)</div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Scan bila mau memaksa ambil dari rak tertentu. Bila kosong,
                sistem otomatis memilih rak berdasarkan stok.
              </p>
              <div className="mt-3 flex h-20 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30">
                <ScanBarcodeIcon className="size-8 text-muted-foreground/60" />
              </div>
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
                disabled={!editable}
              />
            </div>
          </aside>

          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
              <div className="flex-1 min-w-[240px]">
                <label className="text-xs text-muted-foreground">
                  Scan SKU / Barcode
                </label>
                <div className="mt-1.5">
                  <ScanAutoflowBar
                    lines={[]}
                    onResolve={() => {}}
                    onUnmatched={handleScanSku}
                    disabled={
                      !editable || pickItem.isPending || scanForPick.isPending
                    }
                    autoFocus
                    refocusKey={skuRefocusKey}
                    scanPlaceholder="Scan SKU / barcode barang…"
                    hint={
                      scannedBinCode
                        ? `Rak aktif: ${scannedBinCode}. Scan SKU = ambil +1; multi-rak minta konfirmasi.`
                        : "Scan SKU = ambil +1. Kalau ada beberapa rak, muncul pilihan rak."
                    }
                    sound={false}
                  />
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 pl-1">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {totalPicked} / {totalOrdered}
                </span>
              </div>
            </div>

            <Dialog
              open={!!activeItem}
              onOpenChange={(open) => {
                if (!open) handleCancelPick();
              }}
            >
              <DialogContent
                className="sm:max-w-md"
                onOpenAutoFocus={(e) => {
                  e.preventDefault();
                  setTimeout(() => qtyInputRef.current?.focus(), 50);
                }}
              >
                {activeItem && (
                  <>
                    <DialogHeader>
                      <DialogTitle>Konfirmasi Pick</DialogTitle>
                      <DialogDescription>
                        Masukkan jumlah yang diambil dari rak{" "}
                        <span className="font-semibold">
                          {activeChosenBinCode ?? scannedBinCode ?? "—"}
                        </span>
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-start gap-4 py-2">
                      <ItemImage
                        src={activeItem.imageUrl}
                        alt={activeItem.name ?? activeItem.sku}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-foreground">
                          {activeItem.name ?? activeItem.sku}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {activeItem.sku}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Pesanan</span>
                          <span className="font-medium text-foreground">
                            {activeItem.orderNo ?? "—"}
                          </span>
                          <span>Qty dipesan</span>
                          <span className="font-medium text-foreground">
                            {activeItem.qtyOrdered}
                          </span>
                          <span>Sudah pick</span>
                          <span className="font-medium text-foreground">
                            {activeItem.qtyPicked}
                          </span>
                          <span>Sisa</span>
                          <span className="font-semibold text-primary">
                            {activeItem.qtyOrdered - activeItem.qtyPicked}
                          </span>
                        </div>
                        {activeItem.orderId && canDeleteOrder && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                              const orderId = activeItem.orderId;
                              if (!orderId) return;
                              setDeleteOrderTarget({
                                orderId,
                                orderNo: activeItem.orderNo,
                              });
                              handleCancelPick();
                            }}
                          >
                            <Trash2Icon className="size-3.5" />
                            Hapus Pesanan
                          </Button>
                        )}
                      </div>
                    </div>
                    {activeCandidates.length > 1 && (
                      <div className="flex items-center gap-3 pt-2">
                        <label className="shrink-0 text-sm font-medium text-foreground">
                          Ambil dari rak
                        </label>
                        <Select
                          value={activeChosenBinCode ?? ""}
                          onValueChange={(v) => {
                            setActiveChosenBinCode(v);
                            const picked = activeCandidates.find(
                              (c) => c.bin_code === v,
                            );
                            if (picked) {
                              const nextMax = Math.min(
                                picked.on_hand,
                                activeItem.qtyOrdered - activeItem.qtyPicked,
                              );
                              setActivePickMax(nextMax);
                              setPickQty(String(nextMax));
                            }
                          }}
                          disabled={pickItem.isPending}
                        >
                          <SelectTrigger className="h-10 flex-1">
                            <SelectValue placeholder="Pilih rak" />
                          </SelectTrigger>
                          <SelectContent>
                            {activeCandidates.map((c) => (
                              <SelectItem key={c.bin_id} value={c.bin_code}>
                                {c.bin_code} · tersedia {c.on_hand}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex flex-col gap-1 pt-2">
                      <div className="flex items-center gap-3">
                        <label className="shrink-0 text-sm font-medium text-foreground">
                          Qty ambil
                        </label>
                        <QtyConfirmInput
                          inputRef={qtyInputRef}
                          min={1}
                          max={activePickMax}
                          expected={activePickMax}
                          warnOnly
                          value={pickQty === "" ? "" : Number(pickQty)}
                          onChange={(v) =>
                            setPickQty(v === "" ? "" : String(v))
                          }
                          onEnter={handleConfirmPick}
                          placeholder={`maks ${activePickMax}`}
                          className="h-10"
                          disabled={pickItem.isPending}
                        />
                      </div>
                      {(() => {
                        const q = Number.parseInt(pickQty, 10);
                        return Number.isFinite(q) && q > activePickMax ? (
                          <p className="text-amber-600 text-xs">
                            Melebihi data sistem (tersedia: {activePickMax}) —
                            akan tercatat minus
                          </p>
                        ) : null;
                      })()}
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        variant="ghost"
                        onClick={handleCancelPick}
                        disabled={pickItem.isPending}
                      >
                        Batal
                      </Button>
                      <Button
                        onClick={handleConfirmPick}
                        disabled={pickItem.isPending || !pickQty.trim()}
                      >
                        {pickItem.isPending && (
                          <Loader2Icon className="size-4 animate-spin" />
                        )}
                        Konfirmasi Pick
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>

            <DataTable
              columns={columns}
              data={items}
              hideToolbar
              hidePagination
              manualPagination={true}
              manualSorting={true}
              sorting={list.sorting}
              onSortingChange={list.setSorting}
              tableContainerClassName="rounded-lg border border-border bg-card shadow-sm"
              className="min-w-full"
              getRowClassName={(row) =>
                cn(
                  "border-b border-border/60 last:border-0",
                  row.qtyPicked >= row.qtyOrdered && "bg-success/[0.04]",
                  activeItemId === row.id &&
                    "bg-primary/[0.06] ring-1 ring-inset ring-primary/20",
                )
              }
              emptyState={
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Tidak ada item dalam picklist ini.
                </div>
              }
            />
          </section>
        </div>
      )}

      <Dialog
        open={completeDialogOpen}
        onOpenChange={(open) => {
          if (!open && !completePicklist.isPending) {
            setCompleteDialogDismissed(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selesaikan Picking?</DialogTitle>
            <DialogDescription>
              Ringkasan picklist {pl?.picklistNo ?? ""}:
              <br />• Item selesai:{" "}
              <span className="font-semibold">{completedCount}</span>
              <br />• Item gagal (Kurang / Ditolak):{" "}
              <span className="font-semibold">{failedCount}</span>
              {failedCount > 0 && (
                <>
                  <br />
                  <span className="text-xs">
                    Item gagal tidak ikut ke packing dan akan dikembalikan ke
                    daftar order untuk penanganan lanjut.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setCompleteDialogDismissed(true)}
              disabled={completePicklist.isPending}
            >
              Nanti Saja
            </Button>
            <Button
              onClick={handleCompletePicking}
              disabled={completePicklist.isPending}
            >
              {completePicklist.isPending && (
                <Loader2Icon className="size-4 animate-spin" />
              )}
              Selesaikan Picking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canDeleteOrder && <DeleteOrderDialog
        open={!!deleteOrderTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteOrderTarget(null);
        }}
        orders={
          deleteOrderTarget?.orderId
            ? [{ id: deleteOrderTarget.orderId, no: deleteOrderTarget.orderNo }]
            : []
        }
        onDeleted={() => {
          const deletedOrderId = deleteOrderTarget?.orderId;
          const remainingOrderIds = new Set(
            items
              .filter((i) => i.orderId && i.orderId !== deletedOrderId)
              .map((i) => i.orderId),
          );
          if (remainingOrderIds.size === 0) {
            router.replace(LIST_HREF);
          }
        }}
      />}

      <UnassignReasonDialog
        open={unassignOpen}
        onOpenChange={setUnassignOpen}
        isSubmitting={unassignMutation.isPending}
        onSubmit={(payload) => unassignMutation.mutateAsync(payload)}
        staff={staffOptions}
        staffLoading={staffQuery.isLoading}
        currentUserId={me?.id}
        assigneeHint="Kosongkan kalau picklist mau dikembalikan ke antrian tanpa penanggung jawab."
      />

      <ResetAssignmentDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        isSubmitting={resetMutation.isPending}
        destructiveDescription="Semua alokasi pick akan dilepas dan qty picked kembali 0. Dokumen kembali antrian bersih."
        onSubmit={(payload) => resetMutation.mutateAsync(payload)}
        staff={staffOptions}
        staffLoading={staffQuery.isLoading}
        currentUserId={me?.id}
        assigneeHint="Kosongkan kalau picklist mau dikembalikan ke antrian tanpa penanggung jawab."
      />
    </div>
  );
}
