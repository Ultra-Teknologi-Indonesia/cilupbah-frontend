"use client";
import Image from "next/image";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PackageIcon,
  SearchIcon,
  Trash2Icon,
  ImageIcon,
  SquarePenIcon,
  HistoryIcon,
  RotateCcwIcon,
  Loader2Icon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RiwayatPesananPembelianDialog } from "./riwayat-pesanan-pembelian-dialog";

import { PageTitle } from "@/components/dashboard/page-title";
import {
  usePurchaseOrderDetail,
  usePurchaseOrderItems,
  useDeletePurchaseOrder,
  useRecreateInboundForPO,
} from "@/hooks/transaksi-pembelian/use-purchase-orders";
import { SimplePagination } from "@/components/ui/simple-pagination";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { InfoField } from "@/components/dashboard/shared/info-field";
import { SortableHeader } from "@/components/dashboard/shared/sortable-header";
import { SectionTitle } from "@/components/dashboard/shared/section-title";
import {
  formatCurrency,
  formatDateLong,
  formatDateTimeWib,
} from "@/lib/format";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return <InfoField orientation="horizontal" label={label} value={value} />;
}

export function PesananDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data: po, isLoading } = usePurchaseOrderDetail(id);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sort, setSort] = useState<string | undefined>(undefined);

  const applySearch = (nextSearch?: string) => {
    const trimmed = (nextSearch ?? search).trim();
    setSearch(trimmed);
    setAppliedSearch(trimmed);
    setPage(1);
  };

  const { data: itemsRes, isFetching: isFetchingItems } = usePurchaseOrderItems(
    id,
    { page, perPage, search: appliedSearch || undefined, sort },
  );
  const items = itemsRes?.data ?? [];
  const itemsMeta = itemsRes?.meta;

  const handleSort = (next: string | undefined) => {
    setSort(next);
    setPage(1);
  };
  const deleteMut = useDeletePurchaseOrder();
  const recreateInboundMut = useRecreateInboundForPO();

  const [confirmAction, setConfirmAction] = useState<"delete" | null>(null);
  const [riwayatOpen, setRiwayatOpen] = useState(false);

  function handleDelete() {
    if (!po) return;
    deleteMut.mutate(po.id, {
      onSuccess: () => {
        setConfirmAction(null);
        router.push("/dashboard/transaksi-pembelian");
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <PackageIcon className="size-10" />
        <p className="text-sm">Pesanan tidak ditemukan.</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/transaksi-pembelian">Kembali</Link>
        </Button>
      </div>
    );
  }

  const _isDraft = po.status === "DRAFT";

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        title={po.po_number}
        backHref="/dashboard/transaksi-pembelian"
        breadcrumb={[
          { label: "Pembelian" },
          {
            label: "Transaksi Pembelian",
            href: "/dashboard/transaksi-pembelian",
          },
          { label: "Pesanan", href: "/dashboard/transaksi-pembelian" },
          { label: po.po_number },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge
              domain="purchase-order"
              status={po.status}
              className="text-xs"
            />
            {(po.status === "OPEN" || po.status === "PARTIAL_RECEIVED") &&
              !po.active_inbound && (
                <Button
                  size="sm"
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  disabled={recreateInboundMut.isPending}
                  onClick={() => recreateInboundMut.mutate(po.id)}
                >
                  {recreateInboundMut.isPending ? (
                    <Loader2Icon className="mr-2 size-4 animate-spin" />
                  ) : (
                    <RotateCcwIcon className="mr-2 size-4" />
                  )}
                  Buat ulang penerimaan barang
                </Button>
              )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRiwayatOpen(true)}
            >
              <HistoryIcon className="mr-2 size-4" />
              Riwayat
            </Button>
            <Button size="sm" asChild>
              <Link
                href={`/dashboard/transaksi-pembelian/pesanan/${po.id}/edit`}
              >
                <SquarePenIcon className="mr-2 size-4" />
                Edit
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmAction("delete")}
            >
              <Trash2Icon className="mr-2 size-4" />
              Hapus
            </Button>
          </div>
        }
      />

      {po.has_cancelled_inbound_only && !po.active_inbound && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <RotateCcwIcon className="size-4 shrink-0" />
            <span>
              Dokumen penerimaan barang untuk PO ini sebelumnya telah dibatalkan
              atau dihapus. Klik tombol{" "}
              <strong>&quot;Buat ulang penerimaan barang&quot;</strong> untuk
              menerbitkan kembali dokumen penerimaan baru ke gudang.
            </span>
          </div>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            disabled={recreateInboundMut.isPending}
            onClick={() => recreateInboundMut.mutate(po.id)}
          >
            {recreateInboundMut.isPending ? (
              <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <RotateCcwIcon className="mr-1.5 size-3.5" />
            )}
            Buat ulang penerimaan barang
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <LiquidGlass
            radius={16}
            intensity="subtle"
            className="bg-white/30 dark:bg-white/[0.04] p-5"
          >
            <SectionTitle className="mb-4">Informasi Pesanan</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Pemasok" value={po.contact?.name} />
              <DetailRow label="Lokasi" value={po.location?.location_name} />
              <DetailRow
                label="Tanggal Pesanan"
                value={formatDateLong(po.order_date)}
              />
              <DetailRow label="No. Referensi" value={po.ref_no} />
              {po.active_inbound && (
                <DetailRow
                  label="No. Penerimaan"
                  value={
                    <Link
                      href={`/dashboard/barang-masuk/penerimaan/${po.active_inbound.id}`}
                      className="font-medium text-blue-600 dark:text-blue-400 underline hover:text-blue-700 inline-flex items-center gap-1"
                    >
                      {po.active_inbound.transaction_number}
                    </Link>
                  }
                />
              )}
              <DetailRow
                label="Termin Pembayaran"
                value={po.payment_term ? `${po.payment_term} hari` : null}
              />
              <DetailRow label="Keterangan" value={po.notes} />
            </div>
          </LiquidGlass>

          <LiquidGlass
            radius={16}
            intensity="subtle"
            className="bg-white/30 dark:bg-white/[0.04] p-5"
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SectionTitle>Daftar Produk</SectionTitle>
              <div className="relative w-full sm:w-72">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applySearch();
                    }
                  }}
                  placeholder="Cari SKU atau nama produk..."
                  className="pl-8 pr-16"
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
            </div>
            <div className="overflow-x-auto rounded-lg border border-border/40">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="border-b border-border/60 bg-muted/30">
                    <TableHead className="whitespace-nowrap w-12 text-muted-foreground"></TableHead>
                    <TableHead className="whitespace-nowrap text-muted-foreground">
                      <SortableHeader
                        label="Produk"
                        field="sku"
                        currentSort={sort}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right text-muted-foreground">
                      Harga
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right text-muted-foreground">
                      <SortableHeader
                        label="Qty"
                        field="qty"
                        currentSort={sort}
                        onSort={handleSort}
                        align="right"
                        className="w-full"
                      />
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right text-muted-foreground">
                      <SortableHeader
                        label="Diterima"
                        field="received_qty"
                        currentSort={sort}
                        onSort={handleSort}
                        align="right"
                        className="w-full"
                      />
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right text-muted-foreground">
                      Ditolak
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right text-muted-foreground">
                      Diskon
                    </TableHead>
                    <TableHead className="whitespace-nowrap text-right text-muted-foreground">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const variantName = item.variant?.options?.length
                      ? item.variant.options.map((o) => o.value).join(", ")
                      : item.variant?.name;
                    const productDisplayName =
                      item.product?.name ?? item.description ?? "—";
                    const imageUrl =
                      item.variant?.media?.[0]?.url ??
                      (item.variant as { thumbnail?: string | null })
                        ?.thumbnail ??
                      item.product?.media?.[0]?.url ??
                      item.product?.image_url;
                    return (
                      <TableRow
                        key={item.id}
                        className="border-b border-border/20 last:border-0"
                      >
                        <TableCell className="px-3 py-2.5">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border bg-muted/50">
                            {imageUrl ? (
                              <Image
                                unoptimized
                                width={400}
                                height={400}
                                src={imageUrl}
                                alt={productDisplayName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                                <ImageIcon className="size-4 opacity-50" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
                          <div
                            className="flex min-w-0 flex-col gap-0.5"
                            style={{ maxWidth: 280 }}
                          >
                            <span className="font-medium whitespace-normal break-words text-foreground">
                              {productDisplayName}
                            </span>
                            {variantName && (
                              <span className="whitespace-normal break-words text-xs text-foreground">
                                {variantName}
                              </span>
                            )}
                            {item.product?.sku && (
                              <span className="font-mono text-2xs text-foreground/80">
                                {item.product.sku}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right tabular-nums text-foreground">
                          <div className="flex flex-col items-end gap-0.5">
                            <span>{formatCurrency(item.unit_price)}</span>
                            {(Number(item.shipping_cost ?? 0) > 0 ||
                              Number(item.disc_amount ?? 0) > 0) && (
                              <span className="text-2xs text-foreground">
                                {Number(item.shipping_cost ?? 0) > 0 &&
                                  `Ongkos: ${formatCurrency(Number(item.shipping_cost))}`}
                                {Number(item.shipping_cost ?? 0) > 0 &&
                                  Number(item.disc_amount ?? 0) > 0 &&
                                  " · "}
                                {Number(item.disc_amount ?? 0) > 0 &&
                                  `Diskon: ${formatCurrency(Number(item.disc_amount))}`}
                              </span>
                            )}
                            {item.landed_cost_per_unit !== undefined &&
                              Number(item.landed_cost_per_unit) !==
                                Number(item.unit_price) && (
                                <span className="text-2xs text-foreground">
                                  Landed:{" "}
                                  {formatCurrency(
                                    Number(item.landed_cost_per_unit),
                                  )}
                                  /unit
                                </span>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right tabular-nums text-foreground">
                          {item.qty}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right tabular-nums">
                          {(() => {
                            const acceptedQty =
                              item.accepted_qty ?? item.received_qty;
                            return (
                              <span
                                className={cn(
                                  acceptedQty >= item.qty
                                    ? "text-success"
                                    : acceptedQty > 0
                                      ? "text-warning"
                                      : "text-foreground",
                                )}
                              >
                                {acceptedQty}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right tabular-nums">
                          {(item.rejected_qty ?? 0) > 0 ? (
                            <Badge
                              variant="outline"
                              className="border-destructive/30 text-2xs text-destructive"
                              title={
                                item.rejection_notes?.length
                                  ? item.rejection_notes.join("; ")
                                  : undefined
                              }
                            >
                              {item.rejected_qty}
                            </Badge>
                          ) : (
                            <span className="text-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right tabular-nums text-foreground">
                          {item.disc > 0 ? `${item.disc}%` : "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right font-medium tabular-nums text-foreground">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        {appliedSearch
                          ? `Tidak ada produk cocok "${appliedSearch}".`
                          : "Belum ada produk."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {itemsMeta && (
                <div className="px-4 py-3 border-t border-border/20">
                  <SimplePagination
                    page={itemsMeta.current_page}
                    lastPage={itemsMeta.last_page}
                    onPageChange={setPage}
                    perPage={perPage}
                    onPerPageChange={setPerPage}
                    isFetching={isFetchingItems}
                    total={itemsMeta.total}
                    label="produk"
                  />
                </div>
              )}
            </div>
          </LiquidGlass>
        </div>

        <div className="flex flex-col gap-4">
          <LiquidGlass
            radius={16}
            intensity="subtle"
            className="bg-white/30 dark:bg-white/[0.04] p-5 sticky top-4"
          >
            <SectionTitle className="mb-4">Rincian</SectionTitle>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jumlah Produk</span>
                <span className="font-medium">{itemsMeta?.total ?? 0}</span>
              </div>
              {po.qc_summary &&
                (po.qc_summary.total_accepted > 0 ||
                  po.qc_summary.total_rejected > 0) && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Lolos QC</span>
                      <span className="font-medium text-success">
                        {po.qc_summary.total_accepted}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Tidak Lolos QC
                      </span>
                      <span
                        className={cn(
                          "font-medium",
                          po.qc_summary.total_rejected > 0
                            ? "text-destructive"
                            : "text-foreground",
                        )}
                      >
                        {po.qc_summary.total_rejected}
                      </span>
                    </div>
                    {po.qc_summary.total_rejected > 0 && (
                      <p className="text-2xs text-muted-foreground">
                        Arahkan kursor ke badge &ldquo;Ditolak&rdquo; pada tabel
                        produk untuk melihat alasan penolakan.
                      </p>
                    )}
                  </>
                )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">
                  {formatCurrency(po.sub_total)}
                </span>
              </div>
              {po.total_disc > 0 && (
                <div className="flex justify-between text-warning">
                  <span>Diskon</span>
                  <span className="tabular-nums">
                    -{formatCurrency(po.total_disc)}
                  </span>
                </div>
              )}
              {po.total_tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pajak</span>
                  <span className="tabular-nums">
                    {formatCurrency(po.total_tax)}
                  </span>
                </div>
              )}
              <div className="border-t border-border/40 pt-3">
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatCurrency(po.total_amount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-border/40 pt-4 text-xs text-muted-foreground">
              <p>Dibuat oleh: {po.created_by}</p>
              <p>Pada: {formatDateTimeWib(po.created_at)}</p>
            </div>
          </LiquidGlass>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction === "delete"}
        onOpenChange={(v) => !v && setConfirmAction(null)}
        title="Hapus Pesanan"
        description={`Apakah Anda yakin ingin menghapus pesanan "${po.po_number}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={deleteMut.isPending}
        onConfirm={handleDelete}
      />

      <RiwayatPesananPembelianDialog
        poId={po.id}
        poNumber={po.po_number}
        open={riwayatOpen}
        onOpenChange={setRiwayatOpen}
      />
    </div>
  );
}
