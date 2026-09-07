"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangleIcon,
  PackageCheckIcon,
  PackageXIcon,
  XCircleIcon,
} from "lucide-react";

import { PageTitle } from "@/components/dashboard/page-title";
import { useDashboardSummary } from "@/hooks/dashboard/use-dashboard";
import { KpiRow } from "./kpi-row";
import { IntegrationStatus } from "./integration-status";
import { ActionQueueTable } from "./action-queue-table";
import {
  DashboardControls,
  PERIOD_OPTIONS,
  type PeriodValue,
} from "./dashboard-controls";

function rangeForPeriod(period: PeriodValue) {
  const days = Number(period);
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { date_from: iso(from), date_to: iso(to) };
}

export function Beranda() {
  const [period, setPeriod] = useState<PeriodValue>("30");

  const params = useMemo(() => {
    return rangeForPeriod(period);
  }, [period]);

  const { data: summary, isLoading } = useDashboardSummary(params);

  const periodLabel =
    PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? "30 hari";

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Dashboard"
        description="Pantau pesanan dan pekerjaan gudang yang perlu ditindak."
        actions={
          <DashboardControls
            period={period}
            onPeriodChange={setPeriod}
          />
        }
      />

      <KpiRow
        summary={summary}
        isLoading={isLoading}
        periodLabel={periodLabel}
      />

      <IntegrationStatus overview={summary?.integration} isLoading={isLoading} />

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">Perlu ditindak</h2>
          <p className="text-xs text-muted-foreground">
            Antrian pesanan yang menunggu tindakan operasional. Aksi cepat tanpa
            membuka detail.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <ActionQueueTable
            queue="ready-to-process"
            title="Siap diproses"
            icon={PackageCheckIcon}
            emptyMessage="Semua pesanan yang siap sudah diproses."
            viewAllHref="/dashboard/pesanan?tab=ready-to-process"
          />
          <ActionQueueTable
            queue="pending-cancel"
            title="Permintaan pembatalan"
            icon={XCircleIcon}
            emptyMessage="Tidak ada permintaan pembatalan."
            viewAllHref="/dashboard/pesanan?tab=cancellation"
          />
          <ActionQueueTable
            queue="empty-stock"
            title="Stok kosong"
            icon={PackageXIcon}
            emptyMessage="Tidak ada pesanan dengan stok kurang."
            viewAllHref="/dashboard/pesanan?tab=empty-stock"
          />
          <ActionQueueTable
            queue="failed-pick"
            title="Gagal picking"
            icon={AlertTriangleIcon}
            emptyMessage="Tidak ada pesanan gagal picking."
            viewAllHref="/dashboard/pesanan?tab=failed-pick"
          />
        </div>
      </section>
    </div>
  );
}
