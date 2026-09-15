"use client";

import {
  ChevronDownIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  Loader2Icon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { useMonitorStockExport } from "@/hooks/monitor-stok/use-monitor-stock-export";
import { apiError } from "@/lib/toast";
import type {
  MonitorStockExportParams,
  MonitorTab,
  KronologiView,
  OutOfStockMode,
} from "@/types/monitor-stok/monitor";

interface MonitorStockExportMenuProps {
  tab: MonitorTab;
  subMode: OutOfStockMode;
  kronologiView: KronologiView;
  search: string;
  locationId: string;
  categoryId: string;
  period: number;
  kronologiSource: string;
  kronologiDirection: string;
  dateFrom: string;
  dateTo: string;
}

export function MonitorStockExportMenu(props: MonitorStockExportMenuProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const { exportXlsx, exportPdf } = useMonitorStockExport();

  if (!can("export-monitor-stok")) return null;

  const buildParams = (format: "xlsx" | "pdf"): MonitorStockExportParams => ({
    format,
    tab: props.tab,
    mode: props.tab === "stok-kosong" ? props.subMode : undefined,
    kronologi_view: props.tab === "kronologi" ? props.kronologiView : undefined,
    search: props.search || undefined,
    location_id: props.locationId || undefined,
    category_id: props.categoryId || undefined,
    period: ["tidak-laku", "paling-laku", "perkiraan-habis"].includes(props.tab)
      ? props.period
      : undefined,
    kron_source:
      props.tab === "kronologi"
        ? props.kronologiSource || undefined
        : undefined,
    kron_direction:
      props.tab === "kronologi" &&
      (props.kronologiDirection === "in" || props.kronologiDirection === "out")
        ? props.kronologiDirection
        : undefined,
    date_from:
      props.tab === "kronologi" ? props.dateFrom || undefined : undefined,
    date_to: props.tab === "kronologi" ? props.dateTo || undefined : undefined,
  });

  const isPending = exportXlsx.isPending || exportPdf.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          className="h-9 gap-1.5 rounded-full"
        >
          {isPending ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <FileSpreadsheetIcon className="size-4" />
          )}
          Export
          <ChevronDownIcon className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onSelect={() => exportXlsx.mutate(buildParams("xlsx"))}
        >
          <FileSpreadsheetIcon className="size-4 text-emerald-600" />
          Export Excel
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            exportPdf.mutate(buildParams("pdf"), {
              onSuccess: (exportId) => {
                toast.success("PDF sedang disiapkan. Membuka preview…");
                router.push(
                  `/dashboard/document-preview/monitor-stock-export/${encodeURIComponent(exportId)}`,
                );
              },
              onError: (error) =>
                apiError(error, "Gagal menyiapkan preview PDF"),
            })
          }
        >
          <FileTextIcon className="size-4 text-rose-600" />
          Preview PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
