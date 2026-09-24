"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  LayoutGridIcon,
  TableIcon,
  PlusIcon,
  UploadIcon,
  ChevronDownIcon,
  PackageIcon,
  LayersIcon,
  Loader2Icon,
  DownloadIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
} from "@/lib/master-produk/constants";
import { useCategoryTree } from "@/hooks/master-produk/use-master-data";
import type { useProductListQuery } from "@/hooks/master-produk/use-product-list-query";
import type { ImportBatchType } from "@/hooks/master-produk/use-import";
import { Can } from "@/components/auth/can";
import { CategoryPicker } from "./buat/category-picker";
import { FilterToolbar } from "./filter-toolbar";
import { ImportDialog } from "./import/import-dialog";
import { ProductTable } from "./product-table";
import { ProductCardView } from "./product-card-view";
import { useAsyncExport } from "@/hooks/laporan/use-async-export";
import {
  ProductListService,
  type ProductCatalogExportParams,
} from "@/services/master-produk/product-list.service";

type View = "card" | "table";
type Query = ReturnType<typeof useProductListQuery>;

export function ProductExplorer({ query }: { query: Query }) {
  const router = useRouter();
  const [view, setView] = React.useState<View>("card");
  const [importType, setImportType] = React.useState<ImportBatchType | null>(
    null,
  );
  const { data: categoryTree = [] } = useCategoryTree();
  const catalogExport = useAsyncExport<ProductCatalogExportParams>(
    (params) => ProductListService.exportCatalog(params),
    { autoDownload: true },
  );

  const items = query.result.data?.items ?? [];
  const total = query.result.data?.meta?.total ?? 0;
  const isLoading = query.result.isLoading;
  const isFetching = query.result.isFetching;

  const syncFilters = {
    ...(query.search ? { search: query.search } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.category?.id ? { category_id: query.category.id } : {}),
    ...(query.type ? { type: query.type } : {}),
  };

  const catalogFilters = React.useMemo<ProductCatalogExportParams>(
    () => ({
      search: query.search || undefined,
      status: query.status || undefined,
      categoryId: query.category?.id || undefined,
      type: query.type || undefined,
      sort: query.sorting[0]
        ? `${query.sorting[0].desc ? "-" : ""}${query.sorting[0].id === "itemName" ? "name" : "updated_at"}`
        : undefined,
    }),
    [query.search, query.status, query.category, query.type, query.sorting],
  );

  const exportCatalog = React.useCallback(
    (productIds: string[] = []) => {
      catalogExport.mutate({
        ...catalogFilters,
        productIds: productIds.length ? productIds : undefined,
      });
    },
    [catalogExport, catalogFilters],
  );

  const viewProps = {
    items,
    total,
    isLoading,
    isFetching,
    sorting: query.sorting,
    onSortingChange: query.setSorting,
    pagination: query.pagination,
    onPaginationChange: query.setPagination,
    syncFilters,
    onExport: exportCatalog,
  };

  const toggleBtn = (
    target: View,
    label: string,
    Icon: typeof LayoutGridIcon,
  ) => (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(
        "size-7 rounded-full",
        view === target
          ? "bg-background text-foreground shadow-sm hover:bg-background"
          : "text-muted-foreground hover:bg-transparent hover:text-foreground",
      )}
      onClick={() => setView(target)}
      aria-label={label}
      aria-pressed={view === target}
    >
      <Icon className="size-4" />
    </Button>
  );

  return (
    <>
      <LiquidGlass
        radius={24}
        intensity="default"
        className="bg-white/40 dark:bg-white/[0.06]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-medium">Daftar Produk</h2>
              {isFetching && (
                <Loader2Icon className="size-3.5 animate-spin text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isLoading && items.length === 0 ? "Memuat…" : `${total} produk`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-full bg-black/[0.06] p-1 ring-1 ring-border/60 dark:bg-white/10">
              {toggleBtn("card", "Tampilan kartu", LayoutGridIcon)}
              {toggleBtn("table", "Tampilan tabel", TableIcon)}
            </div>
            <Can permission="export-produk">
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                disabled={catalogExport.isPending}
                onClick={() => exportCatalog()}
              >
                {catalogExport.isPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <DownloadIcon className="size-4" />
                )}
                <span className="hidden sm:inline">Ekspor Katalog</span>
              </Button>
            </Can>
            <Can permission="import-produk">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <UploadIcon className="size-4" />
                    <span className="hidden sm:inline">Impor</span>
                    <ChevronDownIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem
                    onSelect={() => setImportType("single")}
                    className="flex-col items-start gap-0.5"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <PackageIcon className="size-4" />
                      Import Produk Satuan
                    </span>
                    <span className="pl-6 text-xs text-muted-foreground">
                      Buat/update produk dari file Excel.
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setImportType("bundle")}
                    className="flex-col items-start gap-0.5"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <LayersIcon className="size-4" />
                      Import Produk Bundle
                    </span>
                    <span className="pl-6 text-xs text-muted-foreground">
                      Atur komposisi bundle dari file Excel.
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Can>
            <Can permission="create-produk">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="primary" size="sm" className="h-9 gap-2">
                    <PlusIcon className="size-4" />
                    <span className="hidden sm:inline">Buat Produk</span>
                    <ChevronDownIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem
                    onSelect={() => router.push("/dashboard/produk/buat")}
                    className="flex-col items-start gap-0.5"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <PackageIcon className="size-4" />
                      Buat Produk Satuan
                    </span>
                    <span className="pl-6 text-xs text-muted-foreground">
                      Produk dengan varian, harga, dan media.
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() =>
                      router.push("/dashboard/produk/buat-bundle")
                    }
                    className="flex-col items-start gap-0.5"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <LayersIcon className="size-4" />
                      Buat Produk Bundle
                    </span>
                    <span className="pl-6 text-xs text-muted-foreground">
                      Gabungkan beberapa produk jadi satu SKU.
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Can>
          </div>
        </div>

        <FilterToolbar
          search={query.search}
          onSearchChange={query.setSearch}
          onSearch={query.applySearch}
          searchPlaceholder="Cari nama / SKU…"
          onReset={query.hasFilter ? query.reset : undefined}
          hasFilter={query.hasFilter}
          activeCount={
            [query.status, query.category, query.type].filter(Boolean).length
          }
          align="end"
          gridCols={3}
        >
          <Combobox
            options={PRODUCT_STATUS_OPTIONS}
            value={query.status}
            onChange={query.setStatus}
            placeholder="Semua status"
            searchPlaceholder="Cari status"
            className="h-9 bg-background"
          />
          <CategoryPicker
            value={query.category}
            onChange={query.setCategory}
            tree={categoryTree}
            triggerClassName="h-9 bg-background"
          />
          <Combobox
            options={PRODUCT_TYPE_OPTIONS}
            value={query.type}
            onChange={query.setType}
            placeholder="Semua tipe"
            searchPlaceholder="Cari tipe"
            className="h-9 bg-background"
          />
        </FilterToolbar>

        <div className="px-5 py-5 sm:px-6">
          {view === "card" ? (
            <ProductCardView {...viewProps} />
          ) : (
            <ProductTable {...viewProps} />
          )}
        </div>
      </LiquidGlass>

      {importType && (
        <ImportDialog
          type={importType}
          open={!!importType}
          onOpenChange={(o) => !o && setImportType(null)}
        />
      )}
    </>
  );
}
