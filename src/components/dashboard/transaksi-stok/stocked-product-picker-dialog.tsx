"use client";

import * as React from "react";
import Image from "next/image";
import { ImageIcon, Loader2Icon, SearchIcon, SearchXIcon } from "lucide-react";
import { useStockedItems } from "@/hooks/persediaan/use-stocked-items";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopySku } from "@/components/dashboard/shared/copy-sku";
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
import { ScrollArea } from "@/components/ui/scroll-area";

export interface StockedPickedProduct {
  itemId: string;
  sku: string;
  name: string;
  variantLabel: string;
  isBundle?: boolean;
  thumbnail: string | null;
  totalOnHand: number;
  sellPrice: number;
}

interface StockedProductPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (products: StockedPickedProduct[]) => void;
  locationId: string;
  excludeIds?: string[];
  initialSearch?: string;
  includeZero?: boolean;
}

interface RawRow {
  item_id: string;
  sku: string;
  product_id: string | null;
  product_name: string | null;
  variant_label: string;
  variation_values: { label: string; value: string }[];
  thumbnail_url: string | null;
  total_on_hand: number;
  sell_price: number;
  is_bundle?: boolean;
  variant?: unknown | null;
}

function normalizeProductName(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

import { Skeleton } from "@/components/ui/skeleton";

function StockedProductPickerSkeleton() {
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

export function StockedProductPickerDialog({
  open,
  onOpenChange,
  onPick,
  locationId,
  excludeIds = [],
  initialSearch,
  includeZero = false,
}: StockedProductPickerDialogProps) {
  const [searchInput, setSearchInput] = React.useState(
    () => initialSearch ?? "",
  );
  const [search, setSearch] = React.useState(() => initialSearch ?? "");
  const [selected, setSelected] = React.useState<
    Map<string, StockedPickedProduct>
  >(new Map());
  const [page, setPage] = React.useState(1);
  const perPage = 20;

  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearchInput("");
      setSearch("");
      setSelected(new Map());
      setPage(1);
    }
    onOpenChange(next);
  };

  const { data, isLoading, isFetching } = useStockedItems({
    locationId,
    search,
    page,
    perPage,
    enabled: open,
    includeZero,
  });

  const rows = ((data?.data ?? []) as RawRow[]).filter(
    (r) => !excludeIds.includes(r.item_id),
  );

  const groups = React.useMemo(() => {
    const map = new Map<
      string,
      {
        productId: string;
        productName: string;
        thumbnail: string | null;
        isBundle: boolean;
        variants: RawRow[];
      }
    >();
    for (const r of rows) {
      const key = r.product_id ?? r.item_id;
      const existing = map.get(key);
      const productName = normalizeProductName(r.product_name);
      const isBundle = Boolean(r.is_bundle || r.variant === null);
      if (existing) {
        existing.variants.push(r);
        existing.isBundle = existing.isBundle || isBundle;
        if (!existing.productName && productName) {
          existing.productName = productName;
        }
        if (!existing.thumbnail && r.thumbnail_url) {
          existing.thumbnail = r.thumbnail_url;
        }
      } else {
        map.set(key, {
          productId: key,
          // SKU remains visible in the variant row; it must not become the group title.
          productName: productName ?? "Nama produk belum tersedia",
          thumbnail: r.thumbnail_url,
          isBundle,
          variants: [r],
        });
      }
    }
    return Array.from(map.values());
  }, [rows]);

  const showSkeleton = isLoading || (isFetching && groups.length === 0);
  const isRefreshing = isFetching && !isLoading && groups.length > 0;

  const total = data?.meta?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  const toggleSelect = (group: (typeof groups)[number], variant: RawRow) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(variant.item_id)) {
        next.delete(variant.item_id);
      } else {
        next.set(variant.item_id, {
          itemId: variant.item_id,
          sku: variant.sku,
          name: group.productName,
          variantLabel: variant.variant_label,
          isBundle: Boolean(variant.is_bundle || variant.variant === null),
          thumbnail: variant.thumbnail_url ?? group.thumbnail,
          totalOnHand: variant.total_on_hand,
          sellPrice: Number(variant.sell_price ?? 0),
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
            Hanya menampilkan produk yang punya stok di gudang ini.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-6 py-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari nama produk / SKU…"
              className="h-10 rounded-full border-border bg-background pl-9 pr-9"
            />
            {isFetching && (
              <Loader2Icon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col border-t">
          {showSkeleton ? (
            <StockedProductPickerSkeleton />
          ) : groups.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
              <SearchXIcon className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Tidak ada produk berstok di gudang ini
                {search ? ` untuk pencarian "${search}"` : ""}.
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
                    <TableHead className="h-9 text-right">Stok</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((g) => (
                    <React.Fragment key={g.productId}>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={5} className="py-2">
                          <div className="flex items-center gap-3">
                            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
                              {g.thumbnail ? (
                                <Image
                                  src={g.thumbnail}
                                  alt={g.productName}
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
                                  g.thumbnail && "hidden",
                                )}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="truncate font-medium">
                                {g.productName}
                              </span>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {g.isBundle
                                ? "Bundle"
                                : `${g.variants.length} varian`}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>

                      {g.variants.map((v) => {
                        const isSelected = selected.has(v.item_id);
                        const variantThumb = v.thumbnail_url ?? g.thumbnail;
                        return (
                          <TableRow
                            key={v.item_id}
                            data-state={isSelected ? "selected" : undefined}
                          >
                            <TableCell className="py-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelect(g, v)}
                              />
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex items-center gap-2.5">
                                <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
                                  {variantThumb ? (
                                    <Image
                                      src={variantThumb}
                                      alt={v.sku || v.variant_label}
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
                                  {v.is_bundle
                                    ? "Bundle"
                                    : v.variant_label || "Default"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-xs text-muted-foreground">
                              {v.sku ? <CopySku sku={v.sku} /> : "—"}
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex flex-wrap gap-1">
                                {v.variation_values.map((vv) => (
                                  <Badge
                                    key={`${vv.label}-${vv.value}`}
                                    variant="outline"
                                    className="px-1.5 py-0 text-2xs font-normal"
                                  >
                                    {vv.label}: {vv.value}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="py-2 text-right font-mono tabular-nums text-sm">
                              {v.total_on_hand}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-col gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {selected.size} dipilih
            {isFetching && !isLoading ? " · memuat…" : ""}
          </div>
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center">
            <SimplePagination
              page={page}
              lastPage={lastPage}
              onPageChange={setPage}
            />
            <div className="flex items-center gap-2 sm:ml-4">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Batal
              </Button>
              <Button onClick={handleConfirm} disabled={selected.size === 0}>
                Tambah ({selected.size})
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
