"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  ArrowDownIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ListChecksIcon,
  Loader2Icon,
  RotateCwIcon,
  SearchIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { SimplePagination } from "@/components/ui/simple-pagination";
import { StatusBadge } from "@/components/dashboard/shared/status-badge";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { useOrderAuditReport } from "@/hooks/proses-pesanan/use-fulfillment";
import type {
  OrderAuditMatchState,
  OrderAuditReportRow,
  OrderRecoveryBatchTarget,
  OrderRecoveryInput,
} from "@/types/proses-pesanan/order-audit";

const EMPTY_FILTERS = {
  search: "",
  channel: "",
  status: "",
  inboxStatus: "",
  dateFrom: "",
  dateTo: "",
};

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function stateMeta(state: OrderAuditMatchState) {
  if (state === "missing") {
    return { label: "Belum masuk WMS", variant: "destructive" as const, icon: AlertTriangleIcon };
  }
  if (state === "status_mismatch") {
    return { label: "Status berbeda", variant: "warning" as const, icon: AlertTriangleIcon };
  }
  return { label: "Data sesuai", variant: "success" as const, icon: CheckCircle2Icon };
}

function AuditStatus({ row }: { row: OrderAuditReportRow }) {
  const meta = stateMeta(row.match_state);
  const Icon = meta.icon;

  return (
    <Badge variant={meta.variant} className="gap-1 whitespace-nowrap">
      <Icon className="size-3.5" />
      {meta.label}
    </Badge>
  );
}

function AuditTableSkeleton() {
  return Array.from({ length: 5 }, (_, rowIndex) => (
    <tr key={rowIndex}>
      {Array.from({ length: 12 }, (__, cellIndex) => (
        <td key={cellIndex} className="p-3">
          <Skeleton className={cellIndex === 0 ? "size-4 rounded-full" : "h-4 w-full max-w-28 rounded-xl"} />
        </td>
      ))}
    </tr>
  ));
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "bg-muted/50",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
  };

  return (
    <div className={`rounded-xl p-4 ${tones[tone]}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function OrderAuditReport({
  selected = [],
  onSelectionChange,
  onContinueSelected,
  onSyncBatch,
  syncingBatchId = null,
}: {
  selected?: OrderRecoveryInput[];
  onSelectionChange?: (items: OrderRecoveryInput[]) => void;
  onContinueSelected?: () => void;
  onSyncBatch?: (batch: OrderRecoveryBatchTarget) => void;
  syncingBatchId?: string | null;
}) {
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const query = useOrderAuditReport({ ...filters, page, perPage });
  const { can } = usePermissions();
  const canEdit = can("edit-pesanan");
  const report = query.data;
  const summary = report?.summary;
  const selectedKeys = useMemo(
    () => new Set(selected.map((item) => `${item.channel ?? ""}|${item.shopId ?? ""}|${item.reference}`.toLowerCase())),
    [selected],
  );

  function rowInput(row: OrderAuditReportRow): OrderRecoveryInput {
    return { reference: row.orderReference, channel: row.channel, shopId: row.shopId };
  }

  function rowKey(row: OrderAuditReportRow): string {
    const item = rowInput(row);
    return `${item.channel ?? ""}|${item.shopId ?? ""}|${item.reference}`.toLowerCase();
  }

  function toggleRow(row: OrderAuditReportRow, checked: boolean) {
    if (!onSelectionChange) return;
    const key = rowKey(row);
    if (checked) {
      if (selected.length >= 20 || selectedKeys.has(key)) return;
      onSelectionChange([...selected, rowInput(row)]);
      return;
    }
    onSelectionChange(selected.filter((item) => `${item.channel ?? ""}|${item.shopId ?? ""}|${item.reference}`.toLowerCase() !== key));
  }

  function applyFilters(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setPage(1);
    setFilters({ ...draft });
  }

  function handlePageChange(nextPage: number) {
    setPage(nextPage);
  }

  function handlePerPageChange(nextPerPage: number) {
    setPerPage(nextPerPage);
    setPage(1);
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-primary">Langkah 1</p>
            <h2 className="mt-1 text-base font-semibold">Cari dan pilih pesanan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Temukan pesanan yang belum masuk, statusnya berbeda, atau resi dan labelnya belum siap.
            </p>
          </div>
          <div className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            {selected.length}/20 pesanan dipilih
          </div>
        </div>

        <form onSubmit={applyFilters} className="grid gap-2 xl:grid-cols-[minmax(220px,1.5fr)_140px_160px_160px_145px_145px_auto]">
          <Input
            value={draft.search}
            onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))}
            placeholder="Cari no. order marketplace / internal / toko…"
            aria-label="Cari audit pesanan"
          />
          <select
            value={draft.channel}
            onChange={(event) => setDraft((current) => ({ ...current, channel: event.target.value }))}
            aria-label="Filter channel"
            className="h-10 rounded-full border border-input bg-background px-3 text-sm"
          >
            <option value="">Semua channel</option>
            <option value="shopee">Shopee</option>
            <option value="tiktok">TikTok Shop</option>
            <option value="lazada">Lazada</option>
            <option value="woocommerce">WooCommerce</option>
          </select>
          <select
            value={draft.status}
            onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
            aria-label="Filter status audit"
            className="h-10 rounded-full border border-input bg-background px-3 text-sm"
          >
            <option value="">Semua status</option>
            <option value="match">Data sesuai</option>
            <option value="missing">Belum masuk WMS</option>
            <option value="status_mismatch">Status berbeda</option>
          </select>
          <select
            value={draft.inboxStatus}
            onChange={(event) => setDraft((current) => ({ ...current, inboxStatus: event.target.value }))}
            aria-label="Filter status proses masuk"
            className="h-10 rounded-full border border-input bg-background px-3 text-sm"
          >
            <option value="">Semua proses masuk</option>
            <option value="received">Belum diproses</option>
            <option value="processed">Sudah diproses</option>
            <option value="failed">Gagal</option>
            <option value="skipped">Dilewati</option>
          </select>
          <label className="relative">
            <CalendarDaysIcon className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              type="date"
              value={draft.dateFrom}
              onChange={(event) => setDraft((current) => ({ ...current, dateFrom: event.target.value }))}
              aria-label="Tanggal mulai"
              className="pl-9"
            />
          </label>
          <label className="relative">
            <CalendarDaysIcon className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              type="date"
              value={draft.dateTo}
              onChange={(event) => setDraft((current) => ({ ...current, dateTo: event.target.value }))}
              aria-label="Tanggal sampai"
              className="pl-9"
            />
          </label>
          <Button type="submit" disabled={query.isFetching}>
            {query.isFetching ? <Loader2Icon className="animate-spin" /> : <SearchIcon />}
            Terapkan
          </Button>
        </form>

        {selected.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <ListChecksIcon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{selected.length} pesanan siap diperiksa</p>
                <p className="mt-1 text-xs text-muted-foreground">Pilihan tetap tersimpan saat Anda berpindah halaman tabel.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {onSelectionChange ? (
                <Button type="button" variant="ghost" onClick={() => onSelectionChange([])}>
                  Hapus pilihan
                </Button>
              ) : null}
              {onContinueSelected ? (
                <Button type="button" onClick={onContinueSelected}>
                  Lanjut perbaiki pesanan
                  <ArrowDownIcon />
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {query.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {query.error instanceof Error ? query.error.message : "Gagal memuat audit pesanan."}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <SummaryCard label="Total pesanan dari Marketplace" value={summary?.marketplaceTotal ?? 0} />
          <SummaryCard label="Total pesanan masuk WMS" value={summary?.wmsTotal ?? 0} />
          <SummaryCard label="Data sesuai" value={summary?.matchedTotal ?? 0} tone="success" />
          <SummaryCard label="Belum masuk WMS" value={summary?.missingTotal ?? 0} tone="danger" />
          <SummaryCard label="Status berbeda" value={summary?.statusMismatchTotal ?? 0} tone="warning" />
          <div className="rounded-xl bg-muted/50 p-4">
            <p className="text-xs font-medium text-muted-foreground">Terakhir diperbarui / diperiksa</p>
            <p className="mt-2 text-sm font-medium">{formatDate(summary?.lastSyncAt)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(summary?.lastCheckedAt)}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-4xl border border-border/70">
          <table className="w-full min-w-[1440px] text-sm">
            <thead className="bg-muted/45 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Pilih</th>
                <th className="px-4 py-3 font-medium">No. pesanan marketplace</th>
                <th className="px-4 py-3 font-medium">Channel / toko</th>
                <th className="px-4 py-3 font-medium">Status marketplace</th>
                <th className="px-4 py-3 font-medium">No. pesanan internal</th>
                <th className="px-4 py-3 font-medium">Status internal</th>
                <th className="px-4 py-3 font-medium">Perbandingan</th>
                <th className="px-4 py-3 font-medium">Proses masuk</th>
                <th className="px-4 py-3 font-medium">Resi</th>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Batch label</th>
                <th className="px-4 py-3 font-medium">Terakhir diterima</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {query.isLoading ? (
                <AuditTableSkeleton />
              ) : report?.items.length ? (
                report.items.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="p-3">
                      <Checkbox
                        checked={selectedKeys.has(rowKey(row))}
                        disabled={!canEdit || !onSelectionChange || (!selectedKeys.has(rowKey(row)) && selected.length >= 20)}
                        onCheckedChange={(checked) => toggleRow(row, checked === true)}
                        aria-label={`Pilih pesanan ${row.orderReference}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium">{row.orderReference}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium capitalize">{row.channel}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.shopName || row.shopId || "—"}</p>
                    </td>
                    <td className="px-4 py-3">{row.marketplaceStatus || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.internalOrderNo || "Belum ada"}</td>
                    <td className="px-4 py-3">{row.wmsStatus || "—"}</td>
                    <td className="px-4 py-3"><AuditStatus row={row} /></td>
                    <td className="px-4 py-3">
                      <StatusBadge domain="order-recovery" status={row.inbox_status} />
                      {row.error ? <p className="mt-1 max-w-52 line-clamp-2 text-xs text-destructive">{row.error}</p> : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{row.trackingNumber || "—"}</td>
                    <td className="px-4 py-3"><StatusBadge domain="order-recovery" status={row.recovery_state} /></td>
                    <td className="px-4 py-3">
                      {row.bulkLabelBatchId ? (
                        <div className="space-y-2">
                          <div>
                            <p className="font-mono text-xs font-medium" title={row.bulkLabelBatchId}>
                              Batch #{row.bulkLabelBatchId.slice(0, 8)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {row.bulkLabelBatchDone ?? 0} dari {row.bulkLabelBatchTotal ?? 0} siap
                            </p>
                            <Progress
                              className="mt-2 h-1.5"
                              value={row.bulkLabelBatchTotal
                                ? Math.round(((row.bulkLabelBatchDone ?? 0) / row.bulkLabelBatchTotal) * 100)
                                : 0}
                              aria-label={`${row.bulkLabelBatchDone ?? 0} dari ${row.bulkLabelBatchTotal ?? 0} label siap`}
                            />
                            {row.bulkLabelBatchCount > 1 ? (
                              <p className="mt-1 text-xs text-muted-foreground">Tercatat di {row.bulkLabelBatchCount} batch</p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge domain="order-recovery" status={row.bulkLabelBatchStatus} />
                            <StatusBadge domain="bulk-label-item" status={row.bulkLabelItemStatus} />
                          </div>
                          {canEdit && onSyncBatch ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={syncingBatchId !== null}
                              onClick={() => onSyncBatch({
                                id: row.bulkLabelBatchId!,
                                total: row.bulkLabelBatchTotal ?? 0,
                                done: row.bulkLabelBatchDone ?? 0,
                                failed: row.bulkLabelBatchFailed ?? 0,
                              })}
                            >
                              {syncingBatchId === row.bulkLabelBatchId ? <Loader2Icon className="animate-spin" /> : <RotateCwIcon />}
                              Perbaiki batch ini
                            </Button>
                          ) : null}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(row.latestReceivedAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                    Tidak ada order marketplace pada filter yang dipilih.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {report ? (
          <SimplePagination
            page={report.meta.current_page}
            lastPage={report.meta.last_page}
            perPage={report.meta.per_page}
            total={report.meta.total}
            label="order audit"
            onPageChange={handlePageChange}
            onPerPageChange={handlePerPageChange}
            isFetching={query.isFetching}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
