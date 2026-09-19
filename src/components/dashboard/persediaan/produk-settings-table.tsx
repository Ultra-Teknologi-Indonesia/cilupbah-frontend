"use client";

import * as React from "react";
import Image from "next/image";
import {
  ChevronDownIcon,
  DownloadIcon,
  Loader2Icon,
  PackageIcon,
  PencilIcon,
  UploadIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  SimplePagination,
  TABLE_PAGE_SIZES,
} from "@/components/ui/simple-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/ui/page-skeleton";
import { FilterToolbar } from "@/components/dashboard/shared/filter-toolbar";
import { CopySku } from "@/components/dashboard/shared/copy-sku";
import { useListState } from "@/hooks/use-list-state";
import {
  useExportRackAllocation,
  useInventorySettingProducts,
} from "@/hooks/persediaan/use-inventory-settings";
import type {
  ImportSettingType,
  InventorySettingProduct,
} from "@/types/persediaan/inventory-setting";

import { AlokasiRakDialog } from "./alokasi-rak-dialog";
import { EditThresholdDialog } from "./edit-threshold-dialog";
import { ImportSettingDialog } from "./import-setting-dialog";
import { RackImportDialog } from "./rack-import-dialog";

const IMPORT_ITEMS: { type: ImportSettingType; label: string; desc: string }[] =
  [
    {
      type: "safe-stock",
      label: "Import Batas Stok Aman",
      desc: "Perbarui batas stok aman dari file.",
    },
    {
      type: "min-stock",
      label: "Import Batas Stok Menipis",
      desc: "Perbarui batas stok menipis dari file.",
    },
    {
      type: "rack-allocation",
      label: "Import Alokasi Rak",
      desc: "Simpan alokasi SKU ke rak tanpa memindahkan stok.",
    },
  ];

export function ProdukSettingsTable() {
  const list = useListState<Record<string, never>>({}, { perPage: 20 });
  const { data, isLoading, isFetching } = useInventorySettingProducts({
    search: list.appliedSearch || undefined,
    page: list.page,
    perPage: list.perPage,
  });

  const [importType, setImportType] = React.useState<ImportSettingType | null>(
    null,
  );
  const [rackImportOpen, setRackImportOpen] = React.useState(false);
  const [rakItem, setRakItem] = React.useState<InventorySettingProduct | null>(
    null,
  );
  const [editItem, setEditItem] =
    React.useState<InventorySettingProduct | null>(null);
  const exportMut = useExportRackAllocation();

  const rows = data?.items ?? [];
  const meta = data?.meta;

  const handleExport = () => {
    exportMut.mutate({ search: list.appliedSearch || undefined });
  };

  const toolbar = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-2 rounded-full"
        onClick={handleExport}
        disabled={exportMut.isPending}
      >
        {exportMut.isPending ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <DownloadIcon className="size-4" />
        )}
        <span className="hidden sm:inline">Export</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="primary"
            size="sm"
            className="h-9 gap-2 rounded-full"
          >
            <UploadIcon className="size-4" />
            <span className="hidden sm:inline">Import</span>
            <ChevronDownIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {IMPORT_ITEMS.map((it) => (
            <DropdownMenuItem
              key={it.type}
              onSelect={() =>
                it.type === "rack-allocation"
                  ? setRackImportOpen(true)
                  : setImportType(it.type)
              }
              className="flex-col items-start gap-0.5"
            >
              <span className="font-medium">{it.label}</span>
              <span className="text-xs text-muted-foreground">{it.desc}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <LiquidGlass
        radius={20}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04]"
      >
        <FilterToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          onSearch={list.applySearch}
          searchPlaceholder="Cari produk, SKU, atau barcode..."
          align="end"
          trailing={toolbar}
        />

        <div className="px-4 py-3 sm:px-5">
          {isLoading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={PackageIcon}
              title="Belum ada produk"
              description="Produk tersimpan akan muncul di sini."
            />
          ) : (
            <div className="rounded-2xl border border-border">
              <Table className="min-w-[960px]">
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/40">
                    <TableHead className="px-3 py-3 text-left font-medium text-muted-foreground">
                      Produk
                    </TableHead>

                    <TableHead className="px-3 py-3 text-center font-medium text-muted-foreground">
                      Alokasi Rak
                    </TableHead>
                    <TableHead className="px-3 py-3 text-right font-medium text-muted-foreground">
                      Batas Stok Menipis
                    </TableHead>
                    <TableHead className="px-3 py-3 text-right font-medium text-muted-foreground">
                      Batas Stok Aman
                    </TableHead>
                    <TableHead className="px-3 py-3 text-right font-medium text-muted-foreground">
                      Lama Pembelian
                    </TableHead>
                    <TableHead className="px-3 py-3 text-center font-medium text-muted-foreground">
                      Stok Tak Terbatas
                    </TableHead>
                    <TableHead className="w-14 px-3 py-3" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow
                      key={p.itemId}
                      className="border-b border-border/60 last:border-0"
                    >
                      <TableCell className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          {p.thumbnail ? (
                            <Image
                              src={p.thumbnail}
                              alt=""
                              width={40}
                              height={40}
                              unoptimized
                              className="size-10 shrink-0 rounded-xl border border-border/60 object-cover"
                            />
                          ) : (
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                              <PackageIcon className="size-5 text-muted-foreground/60" />
                            </div>
                          )}
                          <div className="flex min-w-0 flex-col gap-0.5">
                            <span className="line-clamp-2 text-sm font-medium">
                              {p.productName}
                            </span>
                            {p.variationValues.length > 0 && (
                              <span className="truncate text-xs text-muted-foreground">
                                {p.variationValues
                                  .map((v) => v.value)
                                  .join(", ")}
                              </span>
                            )}
                            <CopySku sku={p.sku} />
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-2.5 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setRakItem(p)}
                        >
                          Lihat
                        </Button>
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right tabular-nums">
                        {p.minStock}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right tabular-nums">
                        {p.safeStock}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right tabular-nums">
                        {p.purchaseLeadTime > 0 ? (
                          `${p.purchaseLeadTime} hari`
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-center">
                        {p.isUnlimitedStock ? (
                          <Badge variant="secondary">Ya</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditItem(p)}
                          aria-label="Ubah batas stok"
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {meta && (
                <div className="border-t border-border px-3 py-2">
                  <SimplePagination
                    page={meta.current_page}
                    lastPage={meta.last_page}
                    perPage={meta.per_page}
                    onPageChange={list.setPage}
                    onPerPageChange={list.setPerPage}
                    pageSizeOptions={TABLE_PAGE_SIZES}
                    total={meta.total}
                    isFetching={isFetching}
                    label="produk"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </LiquidGlass>

      <ImportSettingDialog
        type={importType}
        onOpenChange={(o) => !o && setImportType(null)}
      />
      <RackImportDialog
        open={rackImportOpen}
        onOpenChange={setRackImportOpen}
      />
      <AlokasiRakDialog
        itemId={rakItem?.itemId ?? null}
        sku={rakItem?.sku}
        productName={rakItem?.productName}
        onOpenChange={(o) => !o && setRakItem(null)}
      />
      <EditThresholdDialog
        product={editItem}
        onOpenChange={(o) => !o && setEditItem(null)}
      />
    </div>
  );
}
