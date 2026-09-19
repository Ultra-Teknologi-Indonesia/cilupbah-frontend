"use client";
import Image from "next/image";

import * as React from "react";
import Link from "next/link";
import { ChevronDownIcon, ImageIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductStatusBadge } from "../product-status-badge";
import type { ProductStatus } from "@/types/master-produk";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useDownloadTransactionDetail,
  useDownloadFailures,
} from "@/hooks/master-produk/use-download";
import type { DownloadTransaction } from "@/hooks/master-produk/use-download";

const MASTER_FILTER: { value: string; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "master", label: "Sudah Master" },
  { value: "not_master", label: "Belum Master" },
];

export function TransactionDetailSheet({
  trx,
  open,
  onOpenChange,
}: {
  trx: DownloadTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [masterFilter, setMasterFilter] = React.useState<string>("all");

  const resetKey = open ? (trx?.trxId ?? "") : null;
  const [prevKey, setPrevKey] = React.useState<string | null>(resetKey);
  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setSearch("");
    setAppliedSearch("");
    setMasterFilter("all");
  }

  const isMaster =
    masterFilter === "all" ? undefined : masterFilter === "master";
  const applySearch = (nextSearch?: string) => {
    const trimmed = (nextSearch ?? search).trim();
    setSearch(trimmed);
    setAppliedSearch(trimmed);
  };

  const query = useDownloadTransactionDetail(
    open ? (trx?.trxId ?? null) : null,
    {
      search: appliedSearch || undefined,
      isMaster,
      perPage: 100,
    },
  );
  const detail = query.data;
  const products = detail?.products ?? [];
  const pct = Math.min(
    100,
    Math.max(0, detail?.percent ?? trx?.progressPercent ?? 0),
  );
  const showFailures = !!trx && (trx.state === "failed" || trx.isPartial);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader className="border-b border-border/60">
          <SheetDescription>Download dari toko</SheetDescription>
          <SheetTitle>
            Mendownload dari{" "}
            {trx?.storeName ?? detail?.transaction.storeName ?? "—"}
          </SheetTitle>
          <div className="mt-1 text-sm text-muted-foreground">
            No. Transaksi:{" "}
            <span className="font-medium text-foreground">
              {trx?.trxNo ?? detail?.transaction.trxNo}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-medium tabular-nums">{pct}%</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {detail ? `${detail.count} produk` : "Memuat…"}
          </div>
        </SheetHeader>

        <div className="flex flex-wrap items-center gap-2 px-6 py-3">
          <div className="relative min-w-0 flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applySearch();
                }
              }}
              placeholder="Cari nama / SKU…"
              className="h-9 pr-16"
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
            options={MASTER_FILTER}
            value={masterFilter}
            onChange={(v) => setMasterFilter(v ?? "all")}
            placeholder="Status Produk"
            searchPlaceholder="Status"
            className="h-9 w-52"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {showFailures && trx && (
            <FailureSummary
              trxId={trx.trxId}
              tone={trx.state === "failed" ? "destructive" : "warning"}
            />
          )}
          {query.isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Tidak ada produk.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {products.map((p) => (
                <div key={p.itemId} className="flex items-center gap-3 py-3">
                  <div className="size-10 shrink-0 overflow-hidden rounded-xl bg-muted/40">
                    {p.imgUrl ? (
                      <Image
                        unoptimized
                        width={400}
                        height={400}
                        src={p.imgUrl}
                        alt={p.itemName}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <ImageIcon className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      <Link
                        href={`/dashboard/produk/${p.itemId}`}
                        className="hover:text-primary hover:underline"
                      >
                        {p.itemName}
                      </Link>
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {p.itemCode ?? "—"}
                    </p>
                  </div>

                  <ProductStatusBadge
                    status={p.status as ProductStatus}
                    className="shrink-0"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FailureSummary({
  trxId,
  tone,
}: {
  trxId: string;
  tone: "destructive" | "warning";
}) {
  const { data, isLoading } = useDownloadFailures(trxId, true);
  const [showSamples, setShowSamples] = React.useState(false);

  if (isLoading) {
    return <Skeleton className="mb-4 h-24 rounded-xl" />;
  }
  if (!data || (data.reasons.length === 0 && !data.jobError)) {
    return null;
  }

  const toneCls =
    tone === "destructive"
      ? "border-destructive/30 bg-destructive/5 text-destructive"
      : "border-warning/30 bg-warning/5 text-warning";

  return (
    <div className={`mb-4 rounded-xl border p-4 ${toneCls}`}>
      <div className="flex items-center gap-2">
        <TriangleAlertIcon className="size-4 shrink-0" />
        <span className="text-sm font-semibold">
          {data.totalFailed > 0
            ? `${data.totalFailed} produk gagal diunduh`
            : "Download gagal"}
        </span>
      </div>

      {data.jobError && (
        <p className="mt-2 text-sm text-foreground/80">
          {data.jobError.reason}
        </p>
      )}

      {data.reasons.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {data.reasons.map((r) => (
            <li
              key={r.reason}
              className="flex items-center justify-between gap-3 rounded-xl bg-background/60 px-3 py-2 text-sm"
            >
              <span className="min-w-0 text-foreground/90">{r.reason}</span>
              <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
                {r.count}×
              </span>
            </li>
          ))}
        </ul>
      )}

      {data.samples.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowSamples((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-foreground/70 hover:text-foreground"
          >
            <ChevronDownIcon
              className={`size-3.5 transition-transform ${showSamples ? "rotate-180" : ""}`}
            />
            {showSamples ? "Sembunyikan contoh" : "Lihat contoh produk"}
          </button>
          {showSamples && (
            <ul className="mt-2 space-y-1.5">
              {data.samples.map((s, i) => (
                <li
                  key={`${s.externalProductId ?? "x"}-${i}`}
                  className="rounded-xl bg-background/60 px-3 py-2 text-xs"
                >
                  <p className="truncate font-medium text-foreground/90">
                    {s.title ?? s.externalProductId ?? "—"}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">{s.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
