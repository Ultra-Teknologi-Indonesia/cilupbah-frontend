"use client";

import {
  ChevronDownIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  Loader2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePermissions } from "@/hooks/auth/use-permissions";
import { useStockPositionExport } from "@/hooks/persediaan/use-stock-position-export";
import type { StockPositionExportParams } from "@/types/persediaan/stock";

interface StockPositionExportMenuProps {
  search: string;
  sort?: string;
  isBundle?: "0" | "1";
  channel?: string;
  visibleLocationIds: string[];
}

export function StockPositionExportMenu({
  search,
  sort,
  isBundle,
  channel,
  visibleLocationIds,
}: StockPositionExportMenuProps) {
  const { can } = usePermissions();
  const { exportCsv, exportPdf } = useStockPositionExport();

  if (!can("export-laporan-persediaan")) return null;

  const buildParams = (
    format: StockPositionExportParams["format"],
  ): StockPositionExportParams => ({
    format,
    search: search || undefined,
    sort,
    is_bundle: isBundle,
    channel: channel || undefined,
    visible_location_ids: visibleLocationIds,
  });

  const isPending = exportCsv.isPending || exportPdf.isPending;

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
          onSelect={() => exportCsv.mutate(buildParams("csv"))}
        >
          <FileSpreadsheetIcon className="size-4 text-emerald-600" />
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => exportPdf.mutate(buildParams("pdf"))}
        >
          <FileTextIcon className="size-4 text-rose-600" />
          Export PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
