"use client";

import Link from "next/link";
import { ArrowRightIcon, CircleAlertIcon, StoreIcon } from "lucide-react";

import { ChannelLogo } from "@/components/dashboard/integrasi-channel/channel-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { relativeTime } from "@/lib/format";
import type {
  DashboardIntegrationOverview,
  DashboardIntegrationStatus,
} from "@/types/dashboard/dashboard";

const STATUS_META: Record<
  DashboardIntegrationStatus,
  { label: string; variant: "success" | "warning" | "destructive" | "muted" }
> = {
  normal: { label: "Tersambung", variant: "success" },
  warning: { label: "Perlu perhatian", variant: "warning" },
  error: { label: "Bermasalah", variant: "destructive" },
  inactive: { label: "Nonaktif", variant: "muted" },
};

export function IntegrationStatus({
  overview,
  isLoading,
}: {
  overview?: DashboardIntegrationOverview;
  isLoading: boolean;
}) {
  const { can } = usePermissions();
  const canViewIntegration = can("view-integrasi-channel");

  if (isLoading) {
    return <IntegrationStatusSkeleton />;
  }

  const total = overview?.total ?? 0;
  const healthy = overview?.healthy ?? 0;
  const attention = overview?.attention ?? 0;
  const inactive = overview?.inactive ?? 0;
  const stores = overview?.stores ?? [];
  const summary =
    total === 0
      ? "Belum ada toko yang terhubung."
      : attention > 0
        ? `${attention} toko perlu diperhatikan.`
        : inactive > 0
          ? `${inactive} toko sedang nonaktif.`
          : "Semua toko terhubung dengan baik.";

  return (
    <Card size="sm" className="gap-4">
      <CardHeader className="items-center gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <StoreIcon className="size-4.5" />
          </span>
          <div className="min-w-0">
            <CardTitle>Integrasi toko</CardTitle>
            <p className="text-xs text-muted-foreground">{summary}</p>
          </div>
        </div>
        {canViewIntegration ? (
          <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
            <Link href="/dashboard/integrasi-channel">
              Kelola integrasi
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="grid gap-4 xl:grid-cols-[12rem_1fr]">
        <div className="grid grid-cols-3 gap-2 text-center xl:grid-cols-1 xl:text-left">
          <IntegrationMetric label="Toko" value={total} />
          <IntegrationMetric label="Sehat" value={healthy} tone="success" />
          <IntegrationMetric
            label="Perhatian"
            value={attention}
            tone={attention > 0 ? "warning" : undefined}
          />
        </div>

        {stores.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {stores.map((store) => {
              const status = STATUS_META[store.status];
              const channelCode = store.channel.code || "other";
              const channelName = store.channel.name || "Marketplace";

              return (
                <div
                  key={store.id}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-2.5"
                >
                  <ChannelLogo
                    code={channelCode}
                    name={channelName}
                    className="size-8 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {store.shop_name || "Tanpa nama toko"}
                    </p>
                    <p className="truncate text-2xs text-muted-foreground">
                      {relativeTime(store.last_synced_at)}
                    </p>
                  </div>
                  <Badge variant={status.variant} className="shrink-0 text-2xs">
                    {status.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-20 items-center gap-2 rounded-xl border border-dashed px-4 text-sm text-muted-foreground">
            <CircleAlertIcon className="size-4 shrink-0" />
            Status toko akan tampil setelah integrasi dihubungkan.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IntegrationMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning";
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 px-2.5 py-2">
      <p className="text-2xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "warning"
            ? "font-heading text-lg font-semibold tabular-nums text-warning"
            : tone === "success"
              ? "font-heading text-lg font-semibold tabular-nums text-success"
              : "font-heading text-lg font-semibold tabular-nums"
        }
      >
        {value}
      </p>
    </div>
  );
}

function IntegrationStatusSkeleton() {
  return (
    <Card size="sm" className="gap-4">
      <CardHeader>
        <Skeleton className="h-9 w-52" />
      </CardHeader>
      <CardContent className="grid gap-4 xl:grid-cols-[12rem_1fr]">
        <div className="grid grid-cols-3 gap-2 xl:grid-cols-1">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-15" />
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
