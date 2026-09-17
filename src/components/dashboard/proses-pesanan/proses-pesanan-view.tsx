"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  PackageIcon,
  PlusIcon,
  ScanBarcodeIcon,
  FileTextIcon,
  DownloadIcon,
} from "lucide-react";

function InvoiceLinkCell({
  orderId,
  invoiceNo,
}: {
  orderId: string;
  invoiceNo?: string | null;
}) {
  const displayNo = invoiceNo || "Lihat Faktur";
  return (
    <Link
      href={`/dashboard/document-preview/invoice/${orderId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs font-medium text-primary hover:underline"
      title="Buka Faktur Penjualan"
    >
      <FileTextIcon className="size-3.5 text-muted-foreground" />
      <span>{displayNo}</span>
    </Link>
  );
}

import { useUrlTab } from "@/hooks/use-url-tab";
import { usePermissions } from "@/hooks/auth/use-permissions";

import { Button } from "@/components/ui/button";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  useFulfillmentCounts,
  useExportProcessOrdersCsv,
} from "@/hooks/proses-pesanan/use-fulfillment";
import {
  STAGE_CONFIG,
  defaultSubFor,
  stageConfig,
  type FulfillmentStage,
} from "@/types/proses-pesanan/fulfillment";

import { StageTabs } from "./stage-tabs";
import { PantauanView } from "./pantauan/pantauan-view";
import { SubStatusTabs } from "./sub-status-pills";
import { PicklistTable } from "./picking/picklist-table";
import { ReadyToProcessCardList } from "./picking/ready-to-process-card-list";
import { PacklistTable } from "./packing/packlist-table";
import { PreManifestCancelTable } from "./shipping/pre-manifest-cancel-table";
import { ShipmentTable } from "./shipping/shipment-table";
import { BuatPengirimanDialog } from "./shipping/buat-pengiriman-dialog";
import { CompletedShipmentTable } from "./shipping/completed-shipment-table";
import { FulfillmentCardList } from "./shared/completed-order-card-list";
import { PicklistLinkCell } from "./shared/picklist-link-cell";

export function ProsesPesananView({ stage }: { stage: FulfillmentStage }) {
  return (
    <div className="flex flex-col gap-4">
      <StageTabs />
      {stage === "pantauan" ? (
        <PantauanView />
      ) : (
        <FulfillmentBoard stage={stage} />
      )}
    </div>
  );
}

function FulfillmentBoard({ stage }: { stage: FulfillmentStage }) {
  const subs = useMemo(() => stageConfig(stage)?.subs ?? [], [stage]);

  const [subValue, handleSubChange] = useUrlTab(
    "sub",
    defaultSubFor(stage) ?? "",
    { validValues: subs.map((s) => s.key) },
  );
  const sub: string | null = subValue || null;
  const countsEnabled =
    stage === "picking" || stage === "packing" || stage === "shipping";
  const { data: boardCounts } = useFulfillmentCounts(countsEnabled);
  const { can } = usePermissions();
  const exportProcessOrders = useExportProcessOrdersCsv();

  const countsMap =
    stage === "picking"
      ? boardCounts?.picking
      : stage === "packing"
        ? boardCounts?.packing
        : stage === "shipping"
          ? boardCounts?.shipping
          : undefined;

  const stageLabel = STAGE_CONFIG.find((s) => s.key === stage)?.label ?? "";
  const canExportActiveQueue =
    can("export-pesanan") &&
    (stage === "picking" || stage === "packing" || stage === "shipping") &&
    sub !== null;

  function renderContent() {
    if (stage === "picking") {
      if (sub === "belum") return <ReadyToProcessCardList />;
      if (sub === "diproses") return <PicklistTable />;
      return (
        <FulfillmentCardList
          stage="finish-pick"
          tab="all"
          emptyTitle="Belum ada pesanan selesai pick"
          emptyDescription="Pesanan yang sudah selesai dipick akan muncul di sini."
          searchPlaceholder="Cari no. pesanan, resi, SKU, picklist, ekspedisi…"
          filterFields={[
            "courier",
            "location",
            "channel",
            "store",
            "label_printed",
            "date",
          ]}
          extraColumns={[
            {
              key: "picklist_no",
              header: "No. Picklist",
              cell: (o) => (
                <PicklistLinkCell
                  picklistId={o.picklist_id}
                  picklistNo={o.picklist_no}
                />
              ),
            },
            {
              key: "invoice_no",
              header: "No. Faktur",
              cell: (o) => (
                <InvoiceLinkCell orderId={o.id} invoiceNo={o.invoice_no} />
              ),
            },
            {
              key: "picker",
              header: "Picker",
              cell: (o) => (
                <span className="block max-w-[140px] truncate text-sm">
                  {o.picker_name?.trim() || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
              ),
            },
          ]}
        />
      );
    }
    if (stage === "packing") {
      if (sub === "belum")
        return (
          <FulfillmentCardList
            stage="finish-pick"
            tab="all"
            emptyTitle="Belum ada pesanan siap packing"
            emptyDescription="Pesanan yang sudah selesai dipick akan muncul di sini."
            searchPlaceholder="Cari no. pesanan, resi, SKU, picklist, ekspedisi…"
            filterFields={["courier", "date", "label_printed"]}
            extraColumns={[
              {
                key: "picklist_no",
                header: "No. Picklist",
                cell: (o) => (
                  <PicklistLinkCell
                    picklistId={o.picklist_id}
                    picklistNo={o.picklist_no}
                  />
                ),
              },
              {
                key: "invoice_no",
                header: "No. Faktur",
                cell: (o) => (
                  <InvoiceLinkCell orderId={o.id} invoiceNo={o.invoice_no} />
                ),
              },
            ]}
          />
        );
      if (sub === "diproses") return <PacklistTable />;
      return (
        <FulfillmentCardList
          stage="finish-pack"
          tab="all"
          emptyTitle="Belum ada pesanan selesai packing"
          emptyDescription="Pesanan yang sudah selesai dipacking akan muncul di sini."
          searchPlaceholder="Cari no. pesanan, resi, SKU, ekspedisi…"
          filterFields={["courier", "date", "label_printed"]}
          extraColumns={[
            {
              key: "invoice_no",
              header: "No. Faktur",
              cell: (o) => (
                <InvoiceLinkCell orderId={o.id} invoiceNo={o.invoice_no} />
              ),
            },
            {
              key: "packer",
              header: "Packer",
              cell: (o) => (
                <span className="block max-w-[140px] truncate text-sm">
                  {o.packer_name?.trim() || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
              ),
            },
          ]}
        />
      );
    }
    if (stage === "shipping") {
      if (sub === "jadwal") return <ShipmentTable />;
      if (sub === "batal") return <PreManifestCancelTable />;
      return (
        <FulfillmentCardList
          stage="finish-pack"
          tab="all"
          emptyTitle="Belum ada pesanan siap kirim"
          emptyDescription="Pesanan yang sudah dipacking akan muncul di sini."
          searchPlaceholder="Cari no. pesanan, resi, SKU, ekspedisi…"
          filterFields={[
            "courier",
            "location",
            "courier_type",
            "awb",
            "payment",
            "date",
          ]}
          allowShipmentCreation
        />
      );
    }
    if (stage === "delivered") return <CompletedShipmentTable />;
    if (stage === "done")
      return (
        <FulfillmentCardList
          stage="shipped"
          tab="completed"
          emptyTitle="Belum ada pesanan selesai"
          emptyDescription="Pesanan yang sudah terkirim akan muncul di sini."
          searchPlaceholder="Cari no. pesanan, resi, SKU, ekspedisi…"
          filterFields={["courier", "status", "date"]}
          channelStatusOptions={[
            { value: "COMPLETED", label: "Selesai" },
            { value: "LOST,TO_RETURN", label: "Paket Hilang" },
          ]}
        />
      );
    return null;
  }

  const [showTambahPengiriman, setShowTambahPengiriman] = useState(false);

  const showAdHocPickingButton = stage === "picking" && sub === "diproses";
  const showPackingButton = stage === "packing" && sub === "belum";
  const showTambahPengirimanButton =
    stage === "shipping" && sub === "siap-kirim" && can("create-pengiriman");

  return (
    <>
      <LiquidGlass
        radius={24}
        intensity="default"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">{stageLabel}</h2>
            </div>
            {subs.length > 0 && (
              <div className="mt-3">
                <SubStatusTabs
                  subs={subs}
                  active={sub}
                  onChange={handleSubChange}
                  counts={countsMap}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div
              id="proses-pesanan-filter-portal"
              className="flex flex-wrap items-center gap-2"
            />
            {canExportActiveQueue && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                onClick={() => {
                  if (sub === null) return;
                  exportProcessOrders.mutate({ stage, sub });
                }}
                disabled={exportProcessOrders.isPending}
                title={`Export pesanan aktif pada ${stageLabel} - ${sub}`}
              >
                <DownloadIcon
                  className={
                    exportProcessOrders.isPending
                      ? "size-4 animate-pulse"
                      : "size-4"
                  }
                />
                Export Pesanan
              </Button>
            )}
            {showAdHocPickingButton && (
              <Button asChild variant="primary" size="sm" className="h-9">
                <Link href="/dashboard/proses-pesanan/picking/proses-pesanan">
                  <ScanBarcodeIcon className="size-4" /> Proses Picking
                </Link>
              </Button>
            )}
            {showPackingButton && (
              <Button asChild variant="primary" size="sm" className="h-9">
                <Link href="/dashboard/proses-pesanan/packing/proses-packing">
                  <PackageIcon className="size-4" /> Mulai Packing
                </Link>
              </Button>
            )}
            {showTambahPengirimanButton && (
              <Button
                variant="primary"
                size="sm"
                className="h-9"
                onClick={() => setShowTambahPengiriman(true)}
              >
                <PlusIcon className="size-4" /> Buat Pengiriman
              </Button>
            )}
          </div>
        </div>

        <div key={`${stage}-${sub}`}>{renderContent()}</div>
      </LiquidGlass>

      <BuatPengirimanDialog
        open={showTambahPengiriman}
        onOpenChange={setShowTambahPengiriman}
      />
    </>
  );
}
