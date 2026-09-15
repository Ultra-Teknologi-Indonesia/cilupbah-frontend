"use client";

import * as React from "react";
import {
  ClipboardListIcon,
  FileSpreadsheetIcon,
  QrCodeIcon,
  WarehouseIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarcodeReportDialog } from "./barcode-report-dialog";
import { PenyesuaianReportDialog } from "./penyesuaian-report-dialog";
import {
  InventoryRackReportDialog,
  InventoryStockReportDialog,
} from "./inventory-stock-report-dialog";

type ActiveDialog = "barcode" | "penyesuaian" | "stock" | "rack" | null;

export function LaporanPersediaanView() {
  const [active, setActive] = React.useState<ActiveDialog>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportCard
          icon={<FileSpreadsheetIcon className="size-5" />}
          title="Persediaan Barang"
          description="Export stok per lokasi atau posisi stok sampai tanggal tertentu ke Excel."
          actionLabel="Export Persediaan"
          onClick={() => setActive("stock")}
        />
        <ReportCard
          icon={<WarehouseIcon className="size-5" />}
          title="Persediaan Per Rak"
          description="Export stok per rak untuk satu gudang, lengkap dengan kode lokasi rak."
          actionLabel="Export Per Rak"
          onClick={() => setActive("rack")}
        />
        <ReportCard
          icon={<QrCodeIcon className="size-5" />}
          title="Barcode Barang"
          description="Cetak label QR per SKU atau SKU induk — tanpa harga, dengan harga, atau per toko online."
          actionLabel="Cetak Barcode"
          onClick={() => setActive("barcode")}
        />
        <ReportCard
          icon={<ClipboardListIcon className="size-5" />}
          title="Penyesuaian Stok"
          description="Daftar penyesuaian stok per SKU dalam rentang tanggal, produk, dan lokasi tertentu."
          actionLabel="Cetak Penyesuaian"
          onClick={() => setActive("penyesuaian")}
        />
      </div>

      <BarcodeReportDialog
        open={active === "barcode"}
        onOpenChange={(o) => setActive(o ? "barcode" : null)}
      />
      <PenyesuaianReportDialog
        open={active === "penyesuaian"}
        onOpenChange={(o) => setActive(o ? "penyesuaian" : null)}
      />
      <InventoryStockReportDialog
        open={active === "stock"}
        onOpenChange={(o) => setActive(o ? "stock" : null)}
      />
      <InventoryRackReportDialog
        open={active === "rack"}
        onOpenChange={(o) => setActive(o ? "rack" : null)}
      />
    </>
  );
}

interface ReportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
}

function ReportCard({
  icon,
  title,
  description,
  actionLabel,
  onClick,
}: ReportCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <CardTitle className="mt-3">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto">
        <Button variant="primary" onClick={onClick}>
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
