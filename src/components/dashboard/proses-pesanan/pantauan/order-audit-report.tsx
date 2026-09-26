"use client";

import { useState } from "react";
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  Loader2Icon,
  SearchIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SimplePagination } from "@/components/ui/simple-pagination";
import { useOrderAuditReport } from "@/hooks/proses-pesanan/use-fulfillment";
import type {
  OrderAuditMatchState,
  OrderAuditReportRow,
} from "@/types/proses-pesanan/order-audit";

const EMPTY_FILTERS = {
  search: "",
  channel: "",
  status: "",
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
    return { label: "Missing di WMS", variant: "destructive" as const, icon: AlertTriangleIcon };
  }
  if (state === "status_mismatch") {
    return { label: "Status mismatch", variant: "warning" as const, icon: AlertTriangleIcon };
  }
  return { label: "Match", variant: "success" as const, icon: CheckCircle2Icon };
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
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    danger: "bg-red-500/10 text-red-700 dark:text-red-300",
  };

  return (
    <div className={`rounded-2xl p-4 ${tones[tone]}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function OrderAuditReport() {
  const [draft, setDraft] = useState(EMPTY_FILTERS);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const query = useOrderAuditReport({ ...filters, page, perPage });
  const report = query.data;
  const summary = report?.summary;

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
    <Card className="border-border/70 shadow-sm">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="text-base font-semibold">Rekonsiliasi marketplace dan WMS</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Bandingkan order marketplace yang diterima sistem dengan order yang sudah tercatat di WMS.
          </p>
        </div>

        <form onSubmit={applyFilters} className="grid gap-2 lg:grid-cols-[minmax(220px,1.5fr)_150px_170px_150px_150px_auto]">
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
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
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
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
          >
            <option value="">Semua status</option>
            <option value="match">Match</option>
            <option value="missing">Missing di WMS</option>
            <option value="status_mismatch">Status mismatch</option>
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

        {query.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {query.error instanceof Error ? query.error.message : "Gagal memuat audit pesanan."}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <SummaryCard label="Total pesanan dari Marketplace" value={summary?.marketplaceTotal ?? 0} />
          <SummaryCard label="Total pesanan masuk WMS" value={summary?.wmsTotal ?? 0} />
          <SummaryCard label="Match" value={summary?.matchedTotal ?? 0} tone="success" />
          <SummaryCard label="Missing di WMS" value={summary?.missingTotal ?? 0} tone="danger" />
          <SummaryCard label="Status mismatch" value={summary?.statusMismatchTotal ?? 0} tone="warning" />
          <div className="rounded-2xl bg-muted/50 p-4">
            <p className="text-xs font-medium text-muted-foreground">Last sync / checked</p>
            <p className="mt-2 text-sm font-medium">{formatDate(summary?.lastSyncAt)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(summary?.lastCheckedAt)}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border/70">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/45 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Order marketplace</th>
                <th className="px-4 py-3 font-medium">Channel / toko</th>
                <th className="px-4 py-3 font-medium">Status marketplace</th>
                <th className="px-4 py-3 font-medium">Order WMS</th>
                <th className="px-4 py-3 font-medium">Status WMS</th>
                <th className="px-4 py-3 font-medium">Hasil audit</th>
                <th className="px-4 py-3 font-medium">Last received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {query.isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    <Loader2Icon className="mx-auto size-5 animate-spin" />
                  </td>
                </tr>
              ) : report?.items.length ? (
                report.items.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{row.orderReference}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium capitalize">{row.channel}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.shopName || row.shopId || "—"}</p>
                    </td>
                    <td className="px-4 py-3">{row.marketplaceStatus || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.internalOrderNo || "Belum ada"}</td>
                    <td className="px-4 py-3">{row.wmsStatus || "—"}</td>
                    <td className="px-4 py-3"><AuditStatus row={row} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(row.latestReceivedAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
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
