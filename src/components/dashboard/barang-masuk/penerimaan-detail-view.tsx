"use client";
import Image from "next/image";

import * as React from "react";
import { formatDateTimeWib, formatDateTime } from "@/lib/format";
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ImageIcon,
  PrinterIcon,
  Loader2Icon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Skeleton } from "@/components/ui/skeleton";
import { SimplePagination } from "@/components/ui/simple-pagination";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
} from "@/components/ui/table";
import { PageTitle } from "@/components/dashboard/page-title";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { InfoField } from "@/components/dashboard/shared/info-field";
import { SortableHeader } from "@/components/dashboard/shared/sortable-header";
import { CopySku } from "@/components/dashboard/shared/copy-sku";
import { InlineQtyEdit } from "@/components/dashboard/barang-masuk/inline-qty-edit";
import { DiscrepancyNoteEdit } from "@/components/dashboard/barang-masuk/discrepancy-note-edit";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { KronologiPenerimaanItem } from "@/components/dashboard/barang-masuk/kronologi-penerimaan-tab";
import {
  useFinalizeInbound,
  useInboundDetail,
  useInboundItems,
  useResetInboundAssignment,
  useSetDiscrepancyNote,
  useSetReceivedQtyBatch,
  useUnassignInbound,
  useWithdrawParticipant,
} from "@/hooks/barang-masuk/use-inbound";
import type { InboundItem } from "@/types/barang-masuk/inbound";
import {
  AssignmentLockBanner,
  MobileSessionPanel,
  ResetAssignmentDialog,
  UnassignReasonDialog,
} from "@/components/shared/channel-lock";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/auth/use-permissions";

const TYPE_LABEL: Record<string, string> = {
  PURCHASE_ORDER: "Pesanan Pembelian",
  TRANSIT_IN: "Transfer Masuk",
  SALES_RETURN: "Retur",
  CONSIGNMENT: "Konsinyasi",
};

export function PenerimaanDetailView({ id }: { id: string }) {
  const { data: inbound, isLoading } = useInboundDetail(id, { pollMs: 10000 });
  const batchMutation = useSetReceivedQtyBatch(id);
  const noteMutation = useSetDiscrepancyNote(id);

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(20);
  const [search, setSearch] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [sort, setSort] = React.useState<string | undefined>(undefined);
  const [openItemId, setOpenItemId] = React.useState<string | null>(null);
  const [savingItemId, setSavingItemId] = React.useState<string | null>(null);
  const [savingNoteItemId, setSavingNoteItemId] = React.useState<string | null>(
    null,
  );

  const applySearch = (nextSearch?: string) => {
    const trimmed = (nextSearch ?? search).trim();
    setSearch(trimmed);
    setAppliedSearch(trimmed);
    setPage(1);
  };

  const { data: itemsRes, isFetching: isFetchingItems } = useInboundItems(id, {
    page,
    perPage,
    search: appliedSearch || undefined,
    sort,
  });
  const items: InboundItem[] = itemsRes?.data ?? [];
  const itemsMeta = itemsRes?.meta;

  const handleSort = (next: string | undefined) => {
    setSort(next);
    setPage(1);
  };

  const legacyAssignmentLock =
    !!inbound &&
    inbound.assigned_to != null &&
    inbound.once_received_at == null;
  const sessionLock = inbound?.edit_lock?.locked ?? false;
  const isLocked = legacyAssignmentLock || sessionLock;
  const { can } = usePermissions();
  const canEditInbound = can("edit-barang-masuk");
  const canExportInbound = can("export-barang-masuk");
  const canUnassign = canEditInbound;
  const canReset = canEditInbound;
  const canEdit =
    canEditInbound && !!inbound && inbound.status !== "CANCELLED" && !isLocked;
  const canEditReceivedQty =
    canEdit && inbound?.placement_status !== "COMPLETED";

  const [unassignOpen, setUnassignOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [finalizeOpen, setFinalizeOpen] = React.useState(false);
  const unassignMutation = useUnassignInbound(id);
  const resetMutation = useResetInboundAssignment(id);
  const withdrawMutation = useWithdrawParticipant(id);
  const finalizeMutation = useFinalizeInbound(id);

  const activeParticipants = inbound?.edit_lock?.active_participants ?? [];

  const canFinalize = React.useMemo(() => {
    if (!inbound || !canEditInbound) return false;

    if (["DRAFT", "PARTIAL"].includes(inbound.status)) return true;

    // RECEIVED dapat tercapai setelah seluruh qty diterima melalui mobile,
    // sementara sesi mobile masih aktif atau data lama belum difinalisasi.
    // Admin tetap perlu tombol ini untuk menutup sesi dan menetapkan
    // once_received_at sebelum koreksi atau penghapusan diizinkan.
    return (
      ["RECEIVED", "COMPLETED"].includes(inbound.status) &&
      (activeParticipants.length > 0 || inbound.once_received_at == null)
    );
  }, [activeParticipants.length, canEditInbound, inbound]);

  const saveReceivedQty = async (itemId: string, qty: number) => {
    if (!inbound) return;
    setSavingItemId(itemId);
    try {
      const results = await batchMutation.mutateAsync({
        items: [{ itemId, qty }],
      });
      const first = results[0];
      if (first?.ok) {
        toast.success("Berhasil menyimpan qty diterima");
      } else {
        toast.error(first?.error || "Gagal menyimpan qty diterima");
      }
    } finally {
      setSavingItemId(null);
    }
  };

  const saveDiscrepancyNote = async (itemId: string, note: string) => {
    setSavingNoteItemId(itemId);
    try {
      await noteMutation.mutateAsync({ itemId, note: note || null });
    } finally {
      setSavingNoteItemId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Detail Penerimaan"
        description={inbound ? inbound.transaction_number : "Memuat..."}
        backHref="/dashboard/barang-masuk/penerimaan"
        breadcrumb={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Barang Masuk", href: "/dashboard/barang-masuk/penerimaan" },
          { label: "Detail Penerimaan" },
        ]}
      />

      {isLoading ? (
        <LiquidGlass
          radius={20}
          intensity="subtle"
          className="bg-white/30 p-6 dark:bg-white/[0.04]"
        >
          <div className="flex flex-col gap-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        </LiquidGlass>
      ) : !inbound ? (
        <LiquidGlass
          radius={20}
          intensity="subtle"
          className="bg-white/30 p-6 dark:bg-white/[0.04]"
        >
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <p className="text-sm font-medium">Penerimaan tidak ditemukan</p>
            <Link href="/dashboard/barang-masuk/penerimaan">
              <Button variant="outline" size="sm">
                <ArrowLeftIcon className="mr-1.5 size-4" />
                Kembali
              </Button>
            </Link>
          </div>
        </LiquidGlass>
      ) : (
        <div className="flex flex-col gap-4 print:gap-2">
          <AssignmentLockBanner
            assignedToName={inbound.assignee?.name ?? null}
            assignedAt={inbound.assigned_at ?? null}
            isUnlockedOnce={inbound.once_received_at != null}
            status={inbound.status}
            onUnassign={() => setUnassignOpen(true)}
            onReset={() => setResetOpen(true)}
            canUnassign={canUnassign && !!inbound.assigned_to}
            canReset={canReset && !!inbound.assigned_to}
          />
          <MobileSessionPanel
            participants={inbound.participants ?? []}
            editLock={inbound.edit_lock}
            receivingStartedAt={inbound.receiving_started_at ?? null}
            canWithdraw={canUnassign}
            onWithdraw={(userId) => withdrawMutation.mutate({ userId })}
          />
          <div className="flex items-center justify-end gap-2 print:hidden">
            {canExportInbound && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(
                    `/dashboard/document-preview/inbound-receipt/${inbound.id}`,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                <PrinterIcon className="mr-1.5 size-4" />
                Cetak
              </Button>
            )}
            {canFinalize && (
              <Button
                size="sm"
                onClick={() => setFinalizeOpen(true)}
                disabled={finalizeMutation.isPending}
              >
                {finalizeMutation.isPending ? (
                  <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <CheckCircle2Icon className="mr-1.5 size-4" />
                )}
                Selesaikan Penerimaan
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-4 print:gap-2">
            <LiquidGlass
              radius={20}
              intensity="subtle"
              className="bg-white/30 dark:bg-white/[0.04] print:border print:border-border print:shadow-none"
            >
              <div className="px-5 py-4">
                <h3 className="mb-3 text-sm font-semibold print:text-base">
                  Informasi Penerimaan
                </h3>
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                  <InfoField
                    orientation="horizontal"
                    label="No. Penerimaan"
                    value={inbound.transaction_number}
                  />
                  <InfoField
                    orientation="horizontal"
                    label="No. Referensi"
                    value={inbound.reference_number}
                  />
                  <InfoField
                    orientation="horizontal"
                    label="Sumber"
                    value={TYPE_LABEL[inbound.type] ?? inbound.type}
                  />
                  <InfoField
                    orientation="horizontal"
                    label="Status"
                    value={
                      <StatusBadge
                        domain="inbound"
                        status={inbound.status}
                        className="text-2xs"
                      />
                    }
                  />
                  <InfoField
                    orientation="horizontal"
                    label="Lokasi"
                    value={inbound.location?.location_name}
                  />
                  <InfoField
                    orientation="horizontal"
                    label="Tgl. Diharapkan"
                    value={
                      inbound.expected_date
                        ? formatDateTimeWib(inbound.expected_date)
                        : undefined
                    }
                  />
                  <InfoField
                    orientation="horizontal"
                    label="Dibuat Oleh"
                    value={inbound.created_by}
                  />
                  <InfoField
                    orientation="horizontal"
                    label="Dibuat"
                    value={formatDateTime(inbound.created_at)}
                  />
                </div>
              </div>
            </LiquidGlass>

            <LiquidGlass
              radius={20}
              intensity="subtle"
              className="bg-white/30 dark:bg-white/[0.04] print:border print:border-border print:shadow-none"
            >
              <div className="flex flex-col gap-3 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold print:text-base">
                    Daftar Item
                  </h3>
                </div>
                <div className="relative w-full print:hidden">
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

                <Table containerClassName="rounded-xl border border-border/40">
                  <TableHeader>
                    <TableRow className="border-b border-border/60 bg-muted/30">
                      <TableHead className="px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <SortableHeader
                          label="Produk"
                          field="sku"
                          currentSort={sort}
                          onSort={handleSort}
                        />
                      </TableHead>
                      <TableHead className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <SortableHeader
                          label="Qty Diharapkan"
                          field="expected_qty"
                          currentSort={sort}
                          onSort={handleSort}
                          align="right"
                          className="w-full"
                        />
                      </TableHead>
                      <TableHead className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <SortableHeader
                          label="Qty Diterima"
                          field="received_qty"
                          currentSort={sort}
                          onSort={handleSort}
                          align="right"
                          className="w-full"
                        />
                      </TableHead>
                      <TableHead className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        <SortableHeader
                          label="Qty Putaway"
                          field="putaway_qty"
                          currentSort={sort}
                          onSort={handleSort}
                          align="right"
                          className="w-full"
                        />
                      </TableHead>
                      <TableHead className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Selisih
                      </TableHead>
                      <TableHead className="px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Catatan
                      </TableHead>
                      <TableHead className="w-40 px-3 py-2.5" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 && !isFetchingItems && (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="py-8 text-center text-sm text-muted-foreground"
                        >
                          {appliedSearch
                            ? `Tidak ada item cocok "${appliedSearch}".`
                            : "Belum ada item."}
                        </TableCell>
                      </TableRow>
                    )}
                    {items.map((item: InboundItem) => {
                      const variantOptions = item.variant?.options
                        ?.map((o) => o.value)
                        .filter(Boolean)
                        .join(", ");
                      const productName =
                        item.variant?.product?.name ??
                        item.variant?.item_name ??
                        item.variant?.name ??
                        "—";
                      const imageUrl =
                        item.variant?.media?.[0]?.url ??
                        item.variant?.product?.media?.[0]?.url;
                      const discrepancy = item.received_qty - item.expected_qty;
                      const rejectedQty = item.rejected_qty ?? 0;
                      const isOpen = openItemId === item.id;
                      return (
                        <React.Fragment key={item.id}>
                          <TableRow className="border-b border-border/20 last:border-0">
                            <TableCell className="px-3 py-2.5">
                              <div className="flex items-start gap-3">
                                <div className="size-10 shrink-0 overflow-hidden rounded-xl border bg-muted/50">
                                  {imageUrl ? (
                                    <Image
                                      unoptimized
                                      width={400}
                                      height={400}
                                      src={imageUrl}
                                      alt={productName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                                      <ImageIcon className="size-4 opacity-50" />
                                    </div>
                                  )}
                                </div>
                                <div
                                  className="flex min-w-0 flex-col gap-0.5"
                                  style={{ maxWidth: 320 }}
                                >
                                  <span className="font-medium whitespace-normal break-words text-foreground">
                                    {productName}
                                  </span>
                                  {variantOptions && (
                                    <span className="whitespace-normal break-words text-xs text-foreground">
                                      {variantOptions}
                                    </span>
                                  )}
                                  {item.variant?.sku && (
                                    <CopySku sku={item.variant.sku} />
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-right tabular-nums text-foreground">
                              {item.expected_qty}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-right tabular-nums text-foreground">
                              <div className="flex items-center justify-end">
                                <InlineQtyEdit
                                  value={item.received_qty}
                                  minQty={item.putaway_qty ?? 0}
                                  disabled={!canEditReceivedQty}
                                  saving={savingItemId === item.id}
                                  onSave={(qty) =>
                                    saveReceivedQty(item.id, qty)
                                  }
                                />
                              </div>
                              {rejectedQty > 0 && (
                                <div
                                  className="text-2xs text-destructive"
                                  title={item.rejection_note ?? undefined}
                                >
                                  {rejectedQty} ditolak
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-right tabular-nums text-foreground">
                              {item.putaway_qty}
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-right tabular-nums">
                              {discrepancy !== 0 ? (
                                <Badge
                                  variant="outline"
                                  className="border-destructive/30 text-2xs text-destructive"
                                >
                                  {discrepancy > 0 ? "+" : ""}
                                  {discrepancy}
                                </Badge>
                              ) : (
                                <span className="text-foreground">0</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[220px] px-3 py-2.5 text-xs text-foreground">
                              <DiscrepancyNoteEdit
                                note={item.discrepancy_note}
                                productName={productName}
                                disabled={!canEdit}
                                saving={savingNoteItemId === item.id}
                                onSave={(note) =>
                                  saveDiscrepancyNote(item.id, note)
                                }
                              />
                            </TableCell>
                            <TableCell className="px-3 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenItemId(isOpen ? null : item.id)
                                }
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                              >
                                {isOpen
                                  ? "Sembunyikan histori"
                                  : "Lihat histori penerimaan"}
                                <ChevronDownIcon
                                  className={cn(
                                    "size-3.5 transition-transform",
                                    isOpen && "rotate-180",
                                  )}
                                />
                              </button>
                            </TableCell>
                          </TableRow>
                          {isOpen && (
                            <TableRow className="border-b border-border/20 bg-muted/20 hover:bg-muted/20">
                              <TableCell colSpan={7} className="px-5 py-4">
                                <KronologiPenerimaanItem
                                  inboundId={inbound.id}
                                  itemId={item.id}
                                  enabled={isOpen}
                                />
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                  {itemsMeta?.totals && (
                    <TableFooter className="border-t-2 border-border/60 bg-muted/40">
                      <TableRow className="hover:bg-transparent">
                        <TableCell className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Total keseluruhan
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right font-semibold tabular-nums text-foreground">
                          {itemsMeta.totals.expected_qty}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right font-semibold tabular-nums text-foreground">
                          {itemsMeta.totals.received_qty}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right font-semibold tabular-nums text-foreground">
                          {itemsMeta.totals.putaway_qty}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-right tabular-nums">
                          {(() => {
                            const d =
                              itemsMeta.totals.received_qty -
                              itemsMeta.totals.expected_qty;
                            return d !== 0 ? (
                              <Badge
                                variant="outline"
                                className="border-destructive/30 text-2xs text-destructive"
                              >
                                {d > 0 ? "+" : ""}
                                {d}
                              </Badge>
                            ) : (
                              <span className="font-semibold text-foreground">
                                0
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="px-3 py-2.5" />
                        <TableCell className="px-3 py-2.5" />
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
                {itemsMeta && (
                  <div className="mt-3 print:hidden">
                    <SimplePagination
                      page={itemsMeta.current_page}
                      lastPage={itemsMeta.last_page}
                      onPageChange={setPage}
                      perPage={perPage}
                      onPerPageChange={setPerPage}
                      isFetching={isFetchingItems}
                      total={itemsMeta.total}
                      label="item"
                    />
                  </div>
                )}
              </div>
            </LiquidGlass>
          </div>

          {inbound.assignments && inbound.assignments.length > 0 && (
            <LiquidGlass
              radius={20}
              intensity="subtle"
              className="bg-white/30 dark:bg-white/[0.04] print:border print:border-border print:shadow-none"
            >
              <div className="px-5 py-4">
                <h3 className="mb-3 text-sm font-semibold print:text-base">
                  Riwayat Assignment
                </h3>
                <Table containerClassName="rounded-lg border border-border/40">
                  <TableHeader>
                    <TableRow className="border-b border-border/60 bg-muted/30">
                      {[
                        "Petugas",
                        "Ditugaskan Oleh",
                        "Status",
                        "Mulai",
                        "Selesai",
                        "Catatan",
                      ].map((h) => (
                        <TableHead
                          key={h}
                          className="px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inbound.assignments.map((a) => (
                      <TableRow
                        key={a.id}
                        className="border-b border-border/20 last:border-0"
                      >
                        <TableCell className="px-3 py-2.5">
                          {a.worker?.name ?? a.assigned_to}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-muted-foreground">
                          {a.assigner?.name ?? a.assigned_by}
                        </TableCell>
                        <TableCell className="px-3 py-2.5">
                          <Badge
                            variant="outline"
                            className={cn("text-2xs", {
                              "border-border text-muted-foreground":
                                a.status === "PENDING",
                              "border-warning/30 text-warning":
                                a.status === "IN_PROGRESS",
                              "border-success/30 text-success":
                                a.status === "COMPLETED",
                            })}
                          >
                            {a.status === "PENDING"
                              ? "Menunggu"
                              : a.status === "IN_PROGRESS"
                                ? "Dikerjakan"
                                : "Selesai"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-muted-foreground">
                          {a.started_at ? formatDateTime(a.started_at) : "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2.5 text-muted-foreground">
                          {a.completed_at
                            ? formatDateTime(a.completed_at)
                            : "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate whitespace-normal px-3 py-2.5 text-xs text-muted-foreground">
                          {a.notes ?? ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </LiquidGlass>
          )}
        </div>
      )}

      <UnassignReasonDialog
        open={unassignOpen}
        onOpenChange={setUnassignOpen}
        isSubmitting={unassignMutation.isPending}
        onSubmit={(payload) => unassignMutation.mutateAsync(payload)}
      />

      <ResetAssignmentDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        isSubmitting={resetMutation.isPending}
        destructiveDescription="Semua qty yang sudah diterima akan dibatalkan dan stok Bin Inbound dikembalikan ke 0. Dokumen kembali ke status DRAFT."
        onSubmit={(payload) => resetMutation.mutateAsync(payload)}
      />

      <ConfirmDialog
        open={finalizeOpen}
        onOpenChange={setFinalizeOpen}
        title="Selesaikan penerimaan?"
        description={
          activeParticipants.length > 0
            ? `Masih ada ${activeParticipants.length} staff yang sedang scan di mobile. Menyelesaikan akan menutup sesi mereka dan mencatat discrepancy antara qty diterima dan yang diharapkan. Aksi ini menandai penerimaan Selesai.`
            : "Penerimaan akan ditandai Selesai dan discrepancy tercatat. Setelah ini penerimaan tidak bisa menerima scan baru; putaway sudah bisa dijalankan."
        }
        confirmLabel="Ya, selesaikan"
        cancelLabel="Batal"
        loading={finalizeMutation.isPending}
        onConfirm={async () => {
          await finalizeMutation.mutateAsync();
          setFinalizeOpen(false);
        }}
      >
        {activeParticipants.length > 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 p-3">
            <p className="text-xs font-semibold text-warning">
              Staff yang masih aktif ({activeParticipants.length})
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {activeParticipants.map((p) => (
                <li
                  key={`${p.user_id}-${p.name}`}
                  className="rounded-full border border-warning/40 bg-background px-2 py-0.5 text-2xs text-foreground"
                >
                  {p.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
