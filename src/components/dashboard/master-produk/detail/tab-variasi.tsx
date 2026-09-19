"use client";
import Image from "next/image";

import * as React from "react";
import {
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ImageIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { apiError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
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
import { formatCurrency as formatIDR, formatNumber } from "@/lib/format";
import {
  useProductVariants,
  useBulkVariants,
} from "@/hooks/master-produk/use-product-tabs";
import type { BulkVariantAction } from "@/hooks/master-produk/use-product-tabs";

type SortCol = "sku" | "sell_price" | "stock";
const PAGE_SIZES = TABLE_PAGE_SIZES;

function SortHeader({
  label,
  col,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  col: SortCol;
  sort: { col: SortCol; dir: "asc" | "desc" };
  onSort: (col: SortCol) => void;
  align?: "left" | "right";
}) {
  const activeCol = sort.col === col;
  const ariaSort = activeCol
    ? sort.dir === "asc"
      ? "ascending"
      : "descending"
    : "none";
  return (
    <TableHead
      aria-sort={ariaSort}
      className={cn(
        "px-3 py-2.5 text-muted-foreground",
        align === "right" && "text-right",
      )}
    >
      <button
        type="button"
        onClick={() => onSort(col)}
        className={cn(
          "inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label}
        {!activeCol ? (
          <ArrowUpDownIcon className="size-3 opacity-50" />
        ) : sort.dir === "asc" ? (
          <ArrowUpIcon className="size-3" />
        ) : (
          <ArrowDownIcon className="size-3" />
        )}
      </button>
    </TableHead>
  );
}

export function TabVariasi({ productId }: { productId: string }) {
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<{ col: SortCol; dir: "asc" | "desc" }>(
    {
      col: "sku",
      dir: "asc",
    },
  );
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(20);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const applySearch = (nextSearch?: string) => {
    setSearch((nextSearch ?? searchInput).trim());
    setSearchInput((nextSearch ?? searchInput).trim());
    setPage(1);
  };

  const sortParam = `${sort.dir === "desc" ? "-" : ""}${sort.col}`;
  const { data, isLoading, isError, refetch, isFetching } = useProductVariants(
    productId,
    { page, perPage, search, sort: sortParam },
    true,
  );
  const bulk = useBulkVariants(productId);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);

  const rows = data?.items ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;
  const lastPage = meta?.last_page ?? 1;

  const onSort = (col: SortCol) => {
    setSort((s) =>
      s.col === col
        ? { col, dir: s.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" },
    );
    setPage(1);
  };

  const pageIds = rows.map((r) => r.id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runBulk = (action: BulkVariantAction) => {
    const ids = [...selected];
    if (ids.length === 0) return;

    bulk.mutate(
      { action, variant_ids: ids },
      {
        onSuccess: (res) => {
          const blocked = res.data?.blocked ?? [];
          if (action === "delete" && blocked.length) {
            toast.warning(
              `Sebagian dilewati (terpakai): ${blocked.join(", ")}`,
            );
          } else {
            toast.success("Varian diperbarui.");
          }
          setSelected(new Set());
        },
        onError: (err) => {
          apiError(err, "Aksi gagal");
        },
        onSettled: () => setConfirmDeleteOpen(false),
      },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applySearch();
              }
            }}
            placeholder="Cari SKU…"
            className="h-9 pl-8 pr-14"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => applySearch()}
            className="absolute right-1 top-1/2 h-7 -translate-y-1/2 rounded-full px-2.5 text-xs"
          >
            Cari
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          Total{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {total}
          </span>{" "}
          varian
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} dipilih</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={bulk.isPending}
              onClick={() => setConfirmDeleteOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2Icon /> Hapus
            </Button>
          </div>
        </div>
      )}

      <Table
        containerClassName="rounded-lg border border-border/60 bg-card"
        className="min-w-[720px] border-collapse"
      >
        <TableHeader>
          <TableRow className="border-b border-border/60 bg-muted/40 text-left text-xs text-muted-foreground">
            <TableHead className="w-10 px-3 py-2.5">
              <input
                type="checkbox"
                aria-label="Pilih semua"
                className="size-4 cursor-pointer accent-primary"
                checked={allOnPageSelected}
                onChange={toggleAll}
              />
            </TableHead>
            <SortHeader label="SKU" col="sku" sort={sort} onSort={onSort} />
            <TableHead className="px-3 py-2.5 text-muted-foreground">
              Opsi
            </TableHead>
            <SortHeader
              label="Harga jual"
              col="sell_price"
              sort={sort}
              onSort={onSort}
            />
            <SortHeader
              label="Stok"
              col="stock"
              sort={sort}
              onSort={onSort}
              align="right"
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i} className="border-b border-border/40">
                <TableCell colSpan={5} className="px-3 py-3">
                  <div className="h-5 w-full animate-pulse rounded bg-muted/60" />
                </TableCell>
              </TableRow>
            ))
          ) : isError ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="px-3 py-10 text-center text-sm text-muted-foreground"
              >
                Gagal memuat varian.{" "}
                <button
                  className="font-medium text-primary hover:underline"
                  onClick={() => refetch()}
                >
                  Coba lagi
                </button>
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="px-3 py-10 text-center text-sm text-muted-foreground"
              >
                {search ? "Tidak ada varian yang cocok." : "Belum ada varian."}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((v) => (
              <TableRow
                key={v.id}
                className={cn(
                  "border-b border-border/40 last:border-0 hover:bg-muted/30",
                  selected.has(v.id) && "bg-primary/5",
                )}
              >
                <TableCell className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={`Pilih ${v.sku}`}
                    className="size-4 cursor-pointer accent-primary"
                    checked={selected.has(v.id)}
                    onChange={() => toggleOne(v.id)}
                  />
                </TableCell>
                <TableCell className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40">
                      {v.image ? (
                        <Image
                          unoptimized
                          width={400}
                          height={400}
                          src={v.image}
                          alt={v.sku}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <ImageIcon className="size-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-primary">
                        {v.sku}
                      </div>
                      {v.barcode && (
                        <div className="font-mono text-2xs text-muted-foreground">
                          {v.barcode}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {v.options.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      v.options.map((o, i) => (
                        <span
                          key={i}
                          className="rounded bg-muted px-1.5 py-0.5 text-2xs text-foreground/80"
                        >
                          {o.value}
                        </span>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-3 py-2.5 tabular-nums">
                  {formatIDR(v.sellPrice)}
                </TableCell>
                <TableCell className="px-3 py-2.5 text-right tabular-nums">
                  {formatNumber(v.stock)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <SimplePagination
        page={page}
        lastPage={lastPage}
        onPageChange={setPage}
        perPage={perPage}
        onPerPageChange={setPerPage}
        pageSizeOptions={PAGE_SIZES}
        total={total}
        label="varian"
        isFetching={isFetching}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Hapus Varian"
        description={`Hapus ${selected.size} varian terpilih?`}
        confirmLabel="Hapus"
        variant="destructive"
        loading={bulk.isPending}
        onConfirm={() => runBulk("delete")}
      />
    </div>
  );
}
