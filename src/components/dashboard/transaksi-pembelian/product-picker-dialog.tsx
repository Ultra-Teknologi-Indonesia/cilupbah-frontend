"use client";

import * as React from "react";
import Image from "next/image";
import { ImageIcon, Loader2Icon, SearchIcon, SearchXIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { SimplePagination } from "@/components/ui/simple-pagination";
import { usePickerProducts } from "@/hooks/master-produk/use-master-products";
import { useAggregatedStocksByIds } from "@/hooks/persediaan/use-stock-position";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface PickedProduct {
  itemId: string;
  sku: string;
  name: string;
  variantLabel: string;
  thumbnail: string | null;
  sellPrice: number | null;
}

interface ProductPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (products: PickedProduct[]) => void;
  excludeIds?: string[];
  excludeBundles?: boolean;

  initialSearch?: string;
}

import { Skeleton } from "@/components/ui/skeleton";

function ProductPickerSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3">
        <Skeleton className="size-10 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/5" />
        </div>
      </div>
      <div className="space-y-2 pl-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/40 py-2.5"
          >
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-44 font-mono" />
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="ml-auto h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductPickerDialog({
  open,
  onOpenChange,
  onPick,
  excludeIds = [],
  excludeBundles = false,
  initialSearch,
}: ProductPickerDialogProps) {
  const [searchInput, setSearchInput] = React.useState(
    () => initialSearch ?? "",
  );
  const [search, setSearch] = React.useState(() => initialSearch ?? "");
  const [selected, setSelected] = React.useState<Map<string, PickedProduct>>(
    new Map(),
  );

  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(20);

  const applySearch = (nextSearch?: string) => {
    setSearch(nextSearch ?? searchInput);
    setPage(1);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearchInput("");
      setSearch("");
      setSelected(new Map());
      setPage(1);
    }
    onOpenChange(next);
  };

  const { data, isLoading, isFetching } = usePickerProducts(
    {
      search: search || undefined,
      page,
      perPage,
      excludeBundles,
    },
    { enabled: open },
  );

  const products = React.useMemo(() => {
    const result: {
      itemGroupId: string;
      itemName: string;
      thumbnail: string | null;
      isBundle: boolean;
      categoryName: string;
      variants: {
        itemId: string;
        sku: string;
        sellPrice: number | null;
        thumbnail: string | null;
        variationValues: { label: string; value: string }[];
      }[];
    }[] = [];

    for (const p of data?.items ?? []) {
      if (excludeBundles && p.isBundle) continue;

      const filteredVariants = p.variants.filter(
        (v) => !excludeIds.includes(v.itemId),
      );
      if (filteredVariants.length === 0) continue;
      result.push({
        itemGroupId: p.itemGroupId,
        itemName: p.itemName,
        thumbnail: p.thumbnail,
        isBundle: p.isBundle,
        categoryName: p.categoryName,
        variants: filteredVariants.map((v) => ({
          itemId: v.itemId,
          sku: v.sku,
          sellPrice: v.sellPrice,
          thumbnail: v.thumbnail ?? p.thumbnail,
          variationValues: v.variationValues,
        })),
      });
    }
    return result;
  }, [data, excludeBundles, excludeIds]);

  const showSkeleton = isLoading || (isFetching && products.length === 0);
  const isRefreshing = isFetching && !isLoading && products.length > 0;

  const visibleItemIds = React.useMemo(
    () => products.flatMap((p) => p.variants.map((v) => v.itemId)),
    [products],
  );

  const { data: stocksData } = useAggregatedStocksByIds(visibleItemIds);

  const stockByItemId = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stocksData?.data ?? []) {
      if (row.location?.is_small_warehouse !== true) continue;
      map.set(row.item_id, Number(row.total_available ?? 0));
    }
    return map;
  }, [stocksData]);

  const toggleSelect = (
    product: (typeof products)[0],
    variant: (typeof products)[0]["variants"][0],
  ) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(variant.itemId)) {
        next.delete(variant.itemId);
      } else {
        next.set(variant.itemId, {
          itemId: variant.itemId,
          sku: variant.sku,
          name: product.itemName,
          variantLabel: variant.variationValues.map((v) => v.value).join(", "),
          thumbnail: variant.thumbnail ?? product.thumbnail,
          sellPrice: variant.sellPrice,
        });
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onPick(Array.from(selected.values()));
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[85vh] max-h-[90vh] w-[95vw] flex-col gap-0 p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Pilih Produk</DialogTitle>
          <DialogDescription>
            Cari dan pilih produk untuk ditambahkan ke pesanan.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-6 py-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applySearch();
                  }
                }}
                placeholder="Cari nama produk / SKU…"
                className="h-10 rounded-full border-border bg-background pl-9"
              />
              {isFetching && (
                <Loader2Icon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            <Button type="button" size="sm" onClick={() => applySearch()}>
              Cari
            </Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-t">
          {showSkeleton ? (
            <ProductPickerSkeleton />
          ) : products.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
              <SearchXIcon className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Produk tidak ditemukan{search ? ` untuk "${search}"` : ""}
              </p>
            </div>
          ) : (
            <ScrollArea
              className={cn(
                "min-h-0 flex-1",
                isRefreshing &&
                  "opacity-60 pointer-events-none transition-opacity duration-200",
              )}
            >
              <Table className="min-w-max">
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="h-9 w-10" />
                    <TableHead className="h-9">Varian</TableHead>
                    <TableHead className="h-9">SKU</TableHead>
                    <TableHead className="h-9">Atribut</TableHead>
                    <TableHead className="h-9 w-24 text-right">Stok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <React.Fragment key={p.itemGroupId}>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={5} className="py-2">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
                              {p.thumbnail ? (
                                <Image
                                  src={p.thumbnail}
                                  alt={p.itemName}
                                  width={40}
                                  height={40}
                                  className="size-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.nextElementSibling?.classList.remove(
                                      "hidden",
                                    );
                                  }}
                                />
                              ) : null}
                              <ImageIcon
                                className={cn(
                                  "size-4 text-muted-foreground",
                                  p.thumbnail && "hidden",
                                )}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium">
                                  {p.itemName}
                                </span>
                                {p.isBundle && (
                                  <Badge
                                    variant="secondary"
                                    className="px-1.5 py-0 text-2xs"
                                  >
                                    Bundle
                                  </Badge>
                                )}
                              </div>
                              {p.categoryName && (
                                <div className="text-xs text-muted-foreground">
                                  {p.categoryName}
                                </div>
                              )}
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {p.variants.length} varian
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>

                      {p.variants.map((v) => {
                        const isSelected = selected.has(v.itemId);
                        const variantLabel = v.variationValues
                          .map((vv) => vv.value)
                          .join(" / ");
                        const variantThumb = v.thumbnail ?? p.thumbnail;
                        return (
                          <TableRow
                            key={v.itemId}
                            data-state={isSelected ? "selected" : undefined}
                            onClick={() => toggleSelect(p, v)}
                            className="cursor-pointer"
                          >
                            <TableCell className="py-2">
                              <Checkbox
                                checked={isSelected}
                                aria-hidden
                                tabIndex={-1}
                                className="pointer-events-none"
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex items-center gap-2.5">
                                <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
                                  {variantThumb ? (
                                    <Image
                                      src={variantThumb}
                                      alt={v.sku || variantLabel}
                                      width={28}
                                      height={28}
                                      className="size-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <ImageIcon className="size-3.5 text-muted-foreground" />
                                  )}
                                </div>
                                <span className="text-sm font-medium">
                                  {variantLabel || "Default"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 font-mono text-xs text-muted-foreground">
                              {v.sku || "—"}
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex flex-wrap gap-1">
                                {v.variationValues.map((vv) => (
                                  <Badge
                                    key={vv.label}
                                    variant="outline"
                                    className="px-1.5 py-0 text-2xs font-normal"
                                  >
                                    {vv.label}: {vv.value}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-right tabular-nums">
                              {stockByItemId.has(v.itemId) ? (
                                <span
                                  className={cn(
                                    "text-sm font-medium",
                                    (stockByItemId.get(v.itemId) ?? 0) <= 0 &&
                                      "text-muted-foreground",
                                  )}
                                >
                                  {(
                                    stockByItemId.get(v.itemId) ?? 0
                                  ).toLocaleString("id-ID")}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>

              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}

          {data?.meta && !isLoading && (
            <div className="border-t px-6 pb-4 pt-1">
              <SimplePagination
                page={data.meta.current_page}
                lastPage={data.meta.last_page}
                onPageChange={setPage}
                perPage={perPage}
                onPerPageChange={setPerPage}
                isFetching={isFetching}
                total={data.meta.total}
                label="produk"
              />
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 items-center gap-2 border-t px-6 py-4 sm:gap-0">
          <div className="flex-1 text-sm text-muted-foreground">
            {selected.size > 0 && `${selected.size} varian dipilih`}
          </div>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={selected.size === 0}
          >
            Tambah {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
