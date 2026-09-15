"use client";

import Link from "next/link";
import {
  CalendarDaysIcon,
  CalendarRangeIcon,
  HourglassIcon,
  PackageCheckIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOutboundMonitoring } from "@/hooks/proses-pesanan/use-fulfillment";
import type {
  OutboundMonitoringPeriod,
  OutboundMonitoringSummary,
} from "@/types/proses-pesanan/fulfillment";
import {
  DAY_TERM_LABEL,
  PANTAUAN_COLUMNS,
  pantauanDetailHref,
} from "@/types/proses-pesanan/pantauan-drilldown";

type Tone = "default" | "success" | "warning" | "info";

const TONE_STYLES: Record<Tone, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  info: "bg-primary/10 text-primary",
};

interface Delta {
  dir: "up" | "down" | "flat";
  pct: number;
}

function computeDelta(current: number, previous: number): Delta | null {
  if (previous <= 0) return null;
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.005) return { dir: "flat", pct: 0 };
  return { dir: change > 0 ? "up" : "down", pct: Math.abs(change) };
}

function formatPct(pct: number): string {
  return `${pct.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;
}

interface KpiCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: Tone;
  delta?: Delta | null;
  comparisonLabel: string;
  comparisonValue: number;
  isLoading: boolean;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  delta,
  comparisonLabel,
  comparisonValue,
  isLoading,
}: KpiCardProps) {
  return (
    <Card size="sm" className="h-full justify-center gap-0">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-sm font-medium text-muted-foreground">
              {label}
            </span>
            {isLoading ? (
              <Skeleton className="mt-1 h-8 w-24" />
            ) : (
              <span className="font-heading text-3xl font-semibold tabular-nums tracking-tight">
                {formatNumber(value)}
              </span>
            )}
          </div>
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl",
              TONE_STYLES[tone],
            )}
          >
            <Icon className="size-4.5" />
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border/60 pt-2.5">
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {comparisonLabel}
          </span>
          {isLoading ? (
            <Skeleton className="h-4 w-14" />
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs tabular-nums">
              <span className="font-semibold text-foreground">
                {formatNumber(comparisonValue)}
              </span>
              {delta ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold",
                    delta.dir === "up" && "bg-success/10 text-success",
                    delta.dir === "down" &&
                      "bg-destructive/10 text-destructive",
                    delta.dir === "flat" && "bg-muted text-muted-foreground",
                  )}
                >
                  {delta.dir === "up" ? (
                    <TrendingUpIcon className="size-3.5" />
                  ) : delta.dir === "down" ? (
                    <TrendingDownIcon className="size-3.5" />
                  ) : null}
                  {formatPct(delta.pct)}
                </span>
              ) : null}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NumberCell({ value, href }: { value: number; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex justify-end px-1 font-medium tabular-nums text-primary underline-offset-4 transition-colors hover:underline",
        value === 0 && "font-normal text-primary/50",
      )}
    >
      {formatNumber(value)}
    </Link>
  );
}

function PeriodTable({
  periods,
  isLoading,
}: {
  periods: OutboundMonitoringPeriod[];
  isLoading: boolean;
}) {
  const rows: OutboundMonitoringPeriod[] = isLoading
    ? Array.from({ length: 5 }, (_, i) => ({
        dayTerm: i,
        readyToProcess: 0,
        pick: 0,
        pending: 0,
        pack: 0,
        readyToShip: 0,
        waitingShip: 0,
      }))
    : periods;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-full min-w-[120px]">Periode</TableHead>
            {PANTAUAN_COLUMNS.map((col) => (
              <TableHead
                key={col.slug}
                className="min-w-[112px] text-right whitespace-nowrap"
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.dayTerm}>
              <TableCell className="font-medium whitespace-nowrap">
                {DAY_TERM_LABEL[row.dayTerm] ?? `${row.dayTerm} Hari`}
              </TableCell>
              {PANTAUAN_COLUMNS.map((col) => (
                <TableCell key={col.slug} className="text-right">
                  {isLoading ? (
                    <Skeleton className="ml-auto h-4 w-10" />
                  ) : (
                    <NumberCell
                      value={row[col.monitoringField]}
                      href={pantauanDetailHref(col.slug, row.dayTerm)}
                    />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function buildKpis(summary: OutboundMonitoringSummary): KpiCardProps[] {
  return [
    {
      label: "Hari ini",
      value: summary.today,
      icon: CalendarDaysIcon,
      tone: "info",
      delta: computeDelta(summary.today, summary.yest),
      comparisonLabel: "Kemarin di jam yang sama",
      comparisonValue: summary.yest,
      isLoading: false,
    },
    {
      label: "Bulan ini",
      value: summary.mtd,
      icon: CalendarRangeIcon,
      tone: "info",
      delta: computeDelta(summary.mtd, summary.prevMonth),
      comparisonLabel: "Bulan lalu di tanggal yang sama",
      comparisonValue: summary.prevMonth,
      isLoading: false,
    },
    {
      label: "Siap diproses",
      value: summary.readyToProcess,
      icon: HourglassIcon,
      tone: "warning",
      delta: null,
      comparisonLabel: "Pending Dari 2 Hari Lalu",
      comparisonValue: summary.pendingFromTwoDaysAgo,
      isLoading: false,
    },
    {
      label: "Terproses hari ini",
      value: summary.pickedToday,
      icon: PackageCheckIcon,
      tone: "success",
      delta: computeDelta(summary.pickedToday, summary.pickedYest),
      comparisonLabel: "Kemarin",
      comparisonValue: summary.pickedYest,
      isLoading: false,
    },
  ];
}

const EMPTY_SUMMARY: OutboundMonitoringSummary = {
  today: 0,
  yest: 0,
  mtd: 0,
  prevMonth: 0,
  readyToProcess: 0,
  pendingFromTwoDaysAgo: 0,
  pickedToday: 0,
  pickedYest: 0,
};

export function PantauanView() {
  const { data, isLoading, isError, refetch } = useOutboundMonitoring();

  const summary = data?.summary ?? EMPTY_SUMMARY;
  const kpis = buildKpis(summary);

  if (isError) {
    return (
      <LiquidGlass
        radius={24}
        intensity="default"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            Gagal memuat data pantauan.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted/60"
          >
            Coba lagi
          </button>
        </div>
      </LiquidGlass>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} isLoading={isLoading} />
        ))}
      </div>

      <LiquidGlass
        radius={24}
        intensity="default"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="border-b border-border/60 px-5 py-4 sm:px-6 sm:py-5">
          <h2 className="text-base font-semibold">Antrean per Periode</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Jumlah pesanan di tiap tahap fulfillment berdasarkan umur pesanan.
          </p>
        </div>
        <PeriodTable periods={data?.periods ?? []} isLoading={isLoading} />
      </LiquidGlass>
    </div>
  );
}
