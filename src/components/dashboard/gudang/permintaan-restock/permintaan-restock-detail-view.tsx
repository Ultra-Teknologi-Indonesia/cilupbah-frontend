"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArrowRightIcon,
  CheckIcon,
  ExternalLinkIcon,
  FilterXIcon,
  ImageIcon,
  PackageIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
  UserIcon,
  XIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { PageTitle } from "@/components/dashboard/page-title";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { CopySku } from "@/components/dashboard/shared/copy-sku";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Textarea } from "@/components/ui/textarea";
import {
  SimplePagination,
  TABLE_PAGE_SIZES,
} from "@/components/ui/simple-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatDateTimeFull } from "@/lib/format";
import {
  useRejectReplenishment,
  useRemoveReplenishmentItem,
  useStockReplenishmentItemFilters,
  useStockReplenishmentDetail,
  useStockReplenishmentItems,
} from "@/hooks/gudang/use-stock-replenishment";
import type {
  StockReplenishmentItem,
  StockReplenishmentItemsParams,
} from "@/types/gudang/stock-replenishment";
import { AcceptReplenishmentDialog } from "./accept-replenishment-dialog";
import { EditReplenishmentItemDialog } from "./edit-replenishment-item-dialog";

interface Props {
  id: string;
}

export function PermintaanRestockDetailView({ id }: Props) {
  const { data: req, isLoading } = useStockReplenishmentDetail(id);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [channel, setChannel] = useState("");
  const [shopId, setShopId] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [editItem, setEditItem] = useState<StockReplenishmentItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<StockReplenishmentItem | null>(
    null,
  );
  const rejectMut = useRejectReplenishment();
  const removeItemMut = useRemoveReplenishmentItem();
  const applySearch = (nextSearch?: string) => {
    const trimmed = (nextSearch ?? search).trim();
    setSearch(trimmed);
    setAppliedSearch(trimmed);
    setPage(1);
  };
  const itemParams = useMemo<StockReplenishmentItemsParams>(
    () => ({
      page,
      per_page: perPage,
      search: appliedSearch || undefined,
      channel: channel || undefined,
      shop_id: shopId || undefined,
    }),
    [channel, appliedSearch, page, perPage, shopId],
  );
  const {
    data: itemData,
    isLoading: itemsLoading,
    isFetching: itemsFetching,
  } = useStockReplenishmentItems(id, itemParams);
  const { data: itemFilters } = useStockReplenishmentItemFilters(id);
  const hasItemFilters = Boolean(search || channel || shopId);
  const channelOptions = useMemo(
    () => [
      { value: "", label: "Semua channel" },
      ...(itemFilters?.channels ?? []),
    ],
    [itemFilters?.channels],
  );
  const shopOptions = useMemo(
    () => [
      { value: "", label: "Semua toko" },
      ...(itemFilters?.shops ?? []).map((shop) => ({
        value: shop.value,
        label: shop.channel ? `${shop.label} · ${shop.channel}` : shop.label,
      })),
    ],
    [itemFilters?.shops],
  );

  const resetItemFilters = () => {
    setSearch("");
    setAppliedSearch("");
    setChannel("");
    setShopId("");
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <PageTitle
          title="Detail Permintaan"
          backHref="/dashboard/permintaan-restock"
        />
        <LiquidGlass
          radius={16}
          intensity="subtle"
          className="bg-white/40 dark:bg-white/[0.06]"
        >
          <div className="py-16 text-center text-sm text-muted-foreground">
            Memuat…
          </div>
        </LiquidGlass>
      </div>
    );
  }

  if (!req) {
    return (
      <div className="flex flex-col gap-5">
        <PageTitle
          title="Detail Permintaan"
          backHref="/dashboard/permintaan-restock"
        />
        <LiquidGlass
          radius={16}
          intensity="subtle"
          className="bg-white/40 dark:bg-white/[0.06]"
        >
          <div className="py-16 text-center text-sm text-muted-foreground">
            Permintaan tidak ditemukan.
          </div>
        </LiquidGlass>
      </div>
    );
  }

  const items = (itemData?.items ?? []) as StockReplenishmentItem[];
  const totalQty = req.items_qty ?? 0;
  const editable =
    req.status === "PENDING" && req.source !== "AUTO";

  return (
    <div className="flex flex-col gap-5">
      <PageTitle
        title="Detail Permintaan Pengisian Stok"
        backHref="/dashboard/permintaan-restock"
        breadcrumb={[
          { label: "Gudang" },
          {
            label: "Permintaan Pengisian Stok",
            href: "/dashboard/permintaan-restock",
          },
          { label: "Detail" },
        ]}
      />

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <StatusBadge domain="stock-replenishment" status={req.status} />
            <span className="font-mono text-xs text-muted-foreground">
              #{req.id.slice(0, 8)}
            </span>
          </div>
          {req.status === "PENDING" && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectReason("");
                  setRejectOpen(true);
                }}
                disabled={rejectMut.isPending}
              >
                <XIcon className="mr-1 size-4 text-destructive" />
                Tolak
              </Button>
              <Button variant="primary" onClick={() => setAcceptOpen(true)}>
                <CheckIcon className="mr-1 size-4" />
                Terima
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-5 px-5 py-5 md:grid-cols-2 lg:grid-cols-3">
          <InfoField label="Diminta Oleh">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              <UserIcon className="size-4" />
              {req.requested_by_name ?? "Sistem"}
            </span>
          </InfoField>
          <InfoField label="Diminta Pada">
            {formatDateTimeFull(req.requested_at)}
          </InfoField>
          <InfoField label="Rute">
            <span className="inline-flex items-center gap-2 text-sm">
              <span className="font-medium">
                {req.from_location_name ?? "—"}
              </span>
              <ArrowRightIcon className="size-3.5 text-muted-foreground" />
              <span className="font-medium">{req.to_location_name ?? "—"}</span>
            </span>
          </InfoField>

          <InfoField label="Assignee">{req.assignee_name ?? "—"}</InfoField>
          <InfoField label="Disetujui Pada">
            {req.accepted_at ? formatDateTime(req.accepted_at) : "—"}
          </InfoField>
          <InfoField label="Ditolak Pada">
            {req.rejected_at ? formatDateTime(req.rejected_at) : "—"}
          </InfoField>
          <InfoField label="Ditolak Oleh">
            {req.rejected_by_name ?? "—"}
          </InfoField>

          <InfoField label="Transfer Keluar">
            {req.transfer_out_number ? (
              <Link
                href={`/dashboard/barang-keluar?transfer=${req.transfer_out_id}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLinkIcon className="size-3.5" />
                {req.transfer_out_number}
                {req.transfer_out_status && (
                  <span className="text-xs text-muted-foreground">
                    · {req.transfer_out_status}
                  </span>
                )}
              </Link>
            ) : (
              "—"
            )}
          </InfoField>
          <InfoField label="Selesai Pada">
            {req.done_at ? formatDateTime(req.done_at) : "—"}
          </InfoField>
          <InfoField label="Alasan Ditolak">
            {req.reject_reason ?? "—"}
          </InfoField>

          <div className="md:col-span-2 lg:col-span-3">
            <InfoField label="Catatan">{req.note ?? "—"}</InfoField>
          </div>
        </div>
      </LiquidGlass>

      <LiquidGlass
        radius={16}
        intensity="subtle"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <PackageIcon className="size-4" />
            Produk
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {req.items_count ?? 0} SKU · {totalQty} qty
            </span>
            {editable && (
              <span className="text-xs text-muted-foreground">
                SKU baru ditambahkan dari Monitor Stok
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-3">
          <div className="relative min-w-0 flex-1 basis-full sm:basis-64">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applySearch();
                }
              }}
              placeholder="Cari SKU atau nama produk…"
              aria-label="Cari SKU atau nama produk"
              className="pl-9 pr-16"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => applySearch()}
              className="absolute right-1 top-1/2 h-7 -translate-y-1/2 rounded-full px-2.5 text-xs"
            >
              Cari
            </Button>
          </div>
          <Combobox
            options={channelOptions}
            value={channel}
            onChange={(value) => {
              setChannel(value ?? "");
              setPage(1);
            }}
            placeholder="Semua channel"
            searchPlaceholder="Cari channel"
            className="w-full sm:w-48"
          />
          <Combobox
            options={shopOptions}
            value={shopId}
            onChange={(value) => {
              setShopId(value ?? "");
              setPage(1);
            }}
            placeholder="Semua toko"
            searchPlaceholder="Cari toko"
            className="w-full sm:w-56"
          />
          {hasItemFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetItemFilters}
              className="gap-1.5"
            >
              <FilterXIcon className="size-4" />
              Reset
            </Button>
          )}
        </div>

        <div className="w-full overflow-hidden">
          <Table className="w-full table-fixed" scrollContainer={false}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[44%]">Produk</TableHead>
                <TableHead className="w-20 text-right">Qty</TableHead>
                <TableHead className="w-[36%]">Alasan</TableHead>
                {editable && (
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={editable ? 4 : 3}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Memuat produk…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={editable ? 4 : 3}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Tidak ada item pada permintaan ini.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="max-w-0 whitespace-normal align-top">
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
                          {it.thumbnail_url ? (
                            <Image
                              src={it.thumbnail_url}
                              alt={it.product_name ?? it.sku}
                              width={44}
                              height={44}
                              className="size-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                                e.currentTarget.nextElementSibling?.classList.remove(
                                  "hidden",
                                );
                              }}
                            />
                          ) : null}
                          <ImageIcon
                            className={cn(
                              "size-4 text-muted-foreground",
                              it.thumbnail_url && "hidden",
                            )}
                          />
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span
                            className="line-clamp-2 break-words text-sm font-medium"
                            title={it.product_name ?? it.sku}
                          >
                            {it.product_name ?? "—"}
                          </span>
                          <CopySku sku={it.sku} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {it.qty}
                    </TableCell>
                    <TableCell className="max-w-0 whitespace-normal align-top text-xs text-muted-foreground">
                      <ReasonSummary item={it} />
                    </TableCell>
                    {editable && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setEditItem(it)}
                            aria-label="Ubah item"
                          >
                            <PencilIcon className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteItem(it)}
                            aria-label="Hapus item"
                          >
                            <Trash2Icon className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {itemData?.meta && itemData.meta.total > 0 && (
          <div className="px-5 pb-4">
            <SimplePagination
              page={itemData.meta.current_page}
              lastPage={itemData.meta.last_page}
              onPageChange={setPage}
              perPage={itemData.meta.per_page}
              onPerPageChange={(size) => {
                setPerPage(size);
                setPage(1);
              }}
              pageSizeOptions={TABLE_PAGE_SIZES}
              isFetching={itemsFetching}
              total={itemData.meta.total}
              label="SKU"
            />
          </div>
        )}
      </LiquidGlass>

      <AcceptReplenishmentDialog
        open={acceptOpen}
        onOpenChange={setAcceptOpen}
        request={req}
      />

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) setRejectReason("");
        }}
        title="Tolak permintaan pengisian stok?"
        description="Alasan penolakan wajib diisi dan akan tersimpan di histori request."
        confirmLabel="Tolak"
        variant="destructive"
        loading={rejectMut.isPending}
        confirmDisabled={rejectReason.trim().length < 3}
        onConfirm={async () => {
          await rejectMut.mutateAsync({
            id: req.id,
            reason: rejectReason.trim(),
          });
          setRejectOpen(false);
          setRejectReason("");
        }}
      >
        <div className="space-y-2">
          <Textarea
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="Contoh: Qty terlalu kecil, digabung dengan request berikutnya."
            maxLength={500}
            rows={4}
            autoFocus
            aria-label="Alasan penolakan"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Minimal 3 karakter.</span>
            <span>{rejectReason.length}/500</span>
          </div>
        </div>
      </ConfirmDialog>

      <EditReplenishmentItemDialog
        requestId={req.id}
        item={editItem}
        open={!!editItem}
        onOpenChange={(v) => !v && setEditItem(null)}
      />

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(v) => !v && setDeleteItem(null)}
        title="Hapus item ini?"
        description={
          deleteItem
            ? `${deleteItem.product_name ?? deleteItem.sku} akan dihapus dari permintaan.`
            : ""
        }
        confirmLabel="Hapus"
        onConfirm={async () => {
          if (!deleteItem) return;
          await removeItemMut.mutateAsync({
            id: req.id,
            itemId: deleteItem.id,
          });
          setDeleteItem(null);
        }}
      />
    </div>
  );
}

function InfoField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function ReasonSummary({ item }: { item: StockReplenishmentItem }) {
  const detail = item.reason_detail;

  if (!detail) {
    return (
      <span className="line-clamp-2 break-words" title={item.reason ?? "—"}>
        {item.reason ?? "—"}
      </span>
    );
  }

  const isAutoFill = detail.type === "auto_safe_stock";

  return (
    <div className="min-w-0 space-y-1">
      <p className="truncate font-medium text-foreground" title={detail.label}>
        {detail.label}
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] leading-4">
        <span>
          <span className="text-muted-foreground/75">
            {isAutoFill ? "Batas aman" : "Kebutuhan"}
          </span>{" "}
          <strong className="font-semibold tabular-nums text-foreground">
            {detail.demand_qty}
          </strong>
        </span>
        <span>
          <span className="text-muted-foreground/75">Tersedia</span>{" "}
          <strong
            className={cn(
              "font-semibold tabular-nums",
              detail.available_qty <= 0
                ? "text-destructive"
                : "text-foreground",
            )}
          >
            {detail.available_qty}
          </strong>
        </span>
        <span>
          <span className="text-muted-foreground/75">Dikirim</span>{" "}
          <strong className="font-semibold tabular-nums text-foreground">
            {detail.in_flight_qty}
          </strong>
        </span>
        <span>
          <span className="text-muted-foreground/75">
            {isAutoFill ? "Target isi" : "Disarankan"}
          </span>{" "}
          <strong className="font-semibold tabular-nums text-foreground">
            {detail.suggested_qty}
          </strong>
        </span>
      </div>
    </div>
  );
}
