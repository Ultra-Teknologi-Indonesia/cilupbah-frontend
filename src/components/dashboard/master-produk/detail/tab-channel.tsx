"use client";

import * as React from "react";
import {
  ExternalLinkIcon,
  StoreIcon,
  Trash2Icon,
  RefreshCwIcon,
  CopyIcon,
  CheckIcon,
  LayoutGridIcon,
  TableIcon,
  Link2OffIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChannelLogo } from "@/components/dashboard/integrasi-channel/channel-logo";
import {
  useProductChannelListings,
  useUnlinkChannelMapping,
  useUnlinkVariantChannelMapping,
  useResyncChannelMapping,
  useBulkUnlinkChannelMappings,
} from "@/hooks/master-produk/use-product-tabs";
import { useConnectedStores } from "@/hooks/channel/use-connected-stores";
import { SyncStatusBadge, TabPagination } from "./tab-pagination";
import type { ChannelListingRow } from "@/hooks/master-produk/use-product-tabs";
import type { ChannelCode } from "@/types/channel";

type Listing = ChannelListingRow["listings"][number];

interface ChannelBucket {
  code: ChannelCode;
  name: string;
  listings: Listing[];
}

const CHANNEL_ORDER = [
  "shopee",
  "tiktok",
  "tokopedia",
  "lazada",
  "woocommerce",
  "blibli",
];

function bucketByChannel(listings: Listing[]): ChannelBucket[] {
  const buckets = new Map<string, ChannelBucket>();

  for (const listing of listings) {
    const code = (listing.channelCode ?? "unknown") as ChannelCode;
    const bucket = buckets.get(code) ?? {
      code,
      name: listing.channelName ?? listing.channelCode ?? "Channel lain",
      listings: [],
    };
    bucket.listings.push(listing);
    buckets.set(code, bucket);
  }

  return [...buckets.values()].sort((a, b) => {
    const ai = CHANNEL_ORDER.indexOf(a.code);
    const bi = CHANNEL_ORDER.indexOf(b.code);
    return (
      (ai === -1 ? CHANNEL_ORDER.length : ai) -
      (bi === -1 ? CHANNEL_ORDER.length : bi)
    );
  });
}

function CopyableId({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label ?? "ID"} berhasil disalin`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="inline-flex items-center gap-1 font-mono text-2xs text-muted-foreground">
      <span className="truncate max-w-[120px] select-all font-medium text-foreground">
        {value}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="rounded p-0.5 hover:bg-muted hover:text-foreground transition-colors"
        title="Salin ID"
      >
        {copied ? (
          <CheckIcon className="size-3 text-emerald-500" />
        ) : (
          <CopyIcon className="size-3 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

function ListingRow({
  listing,
  sku,
  onUnlink,
  onResync,
}: {
  listing: Listing;
  sku: string;
  onUnlink: (listing: Listing, sku: string) => void;
  onResync: (listing: Listing) => void;
}) {
  return (
    <li className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/60">
      <div className="min-w-0 flex-1 flex flex-col">
        <span
          className="truncate text-xs font-medium text-foreground"
          title={listing.shopName ?? undefined}
        >
          {listing.shopName ?? "Tanpa nama toko"}
        </span>
        {listing.externalProductId && (
          <CopyableId
            value={listing.externalProductId}
            label="ID Marketplace"
          />
        )}
      </div>

      <SyncStatusBadge
        status={listing.syncStatus}
        reason={listing.errorMessage}
      />

      <div className="flex items-center gap-1">
        {listing.channelUrl && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-primary"
                >
                  <a
                    href={listing.channelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Buka listing di ${listing.channelName ?? "channel"}`}
                  >
                    <ExternalLinkIcon className="size-3.5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Buka halaman produk marketplace</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {listing.productChannelMappingId && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => onResync(listing)}
                  aria-label="Sinkronkan ulang"
                >
                  <RefreshCwIcon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sinkronkan ulang ke channel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => onUnlink(listing, sku)}
                aria-label="Hapus tautan link"
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hapus link tautan channel</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </li>
  );
}

function VariantCard({
  row,
  onUnlink,
  onResync,
}: {
  row: ChannelListingRow;
  onUnlink: (listing: Listing, sku: string) => void;
  onResync: (listing: Listing) => void;
}) {
  const buckets = React.useMemo(
    () => bucketByChannel(row.listings),
    [row.listings],
  );

  return (
    <div className="rounded-4xl border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border/60 pb-3">
        <span className="font-mono text-sm font-semibold text-primary">
          {row.sku}
        </span>
        {row.options.map((option, i) => (
          <span
            key={i}
            className="rounded-xl bg-muted px-2 py-0.5 text-2xs text-foreground/80 font-medium"
          >
            {option.value}
          </span>
        ))}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {row.listings.length} listing
        </span>
      </div>

      {buckets.length === 0 ? (
        <p className="pt-3 text-xs text-muted-foreground">
          Varian ini belum ter-listing di channel mana pun.
        </p>
      ) : (
        <div className="grid gap-3 pt-3 lg:grid-cols-2 xl:grid-cols-3">
          {buckets.map((bucket) => (
            <div
              key={bucket.code}
              className="rounded-2xl border border-border/60 bg-muted/30 p-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <ChannelLogo
                    code={bucket.code}
                    name={bucket.name}
                    className="size-5 text-2xs"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                    {bucket.name}
                  </span>
                  <span className="text-2xs text-muted-foreground tabular-nums font-mono">
                    {bucket.listings.length}
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {bucket.listings.map((listing, i) => (
                    <ListingRow
                      key={listing.variantChannelMappingId ?? i}
                      listing={listing}
                      sku={row.sku}
                      onUnlink={onUnlink}
                      onResync={onResync}
                    />
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TabChannel({ productId }: { productId: string }) {
  const [shopId, setShopId] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [searchDebounced, setSearchDebounced] = React.useState("");
  const [sort, setSort] = React.useState("sku");
  const [viewMode, setViewMode] = React.useState<"table" | "card">("table");
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(20);

  const [selectedMappingIds, setSelectedMappingIds] = React.useState<string[]>(
    [],
  );
  const [isBulkUnlinkOpen, setIsBulkUnlinkOpen] = React.useState(false);

  // Unlink & Resync state
  const [targetUnlink, setTargetUnlink] = React.useState<{
    listing: Listing;
    sku: string;
  } | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  const { data: stores } = useConnectedStores();

  const { data, isLoading, isError, refetch, isFetching } =
    useProductChannelListings(
      productId,
      {
        page,
        perPage,
        shopId: shopId || undefined,
        search: searchDebounced || undefined,
        sort,
      },
      true,
    );

  const unlinkChannel = useUnlinkChannelMapping(productId);
  const unlinkVariant = useUnlinkVariantChannelMapping(productId);
  const bulkUnlink = useBulkUnlinkChannelMappings(productId);
  const resyncChannel = useResyncChannelMapping(productId);

  const rows = React.useMemo(() => data?.items ?? [], [data]);
  const meta = data?.meta;
  const lastPage = meta?.last_page ?? 1;
  const total = meta?.total ?? 0;

  const listingCount = React.useMemo(
    () => rows.reduce((sum, r) => sum + r.listings.length, 0),
    [rows],
  );

  // Flattened table rows for Jubelio-style table view
  const tableRows = React.useMemo(() => {
    return rows.flatMap((row) =>
      row.listings.map((listing) => ({
        sku: row.sku,
        options: row.options,
        listing,
      })),
    );
  }, [rows]);

  const handleOpenUnlink = (listing: Listing, sku: string) => {
    setTargetUnlink({ listing, sku });
  };

  const handleConfirmUnlink = async () => {
    if (!targetUnlink) return;

    try {
      if (targetUnlink.listing.variantChannelMappingId) {
        await unlinkVariant.mutateAsync(
          targetUnlink.listing.variantChannelMappingId,
        );
      } else if (targetUnlink.listing.productChannelMappingId) {
        await unlinkChannel.mutateAsync(
          targetUnlink.listing.productChannelMappingId,
        );
      }
      toast.success(
        `Tautan untuk SKU ${targetUnlink.sku} di toko ${targetUnlink.listing.shopName ?? "channel"} berhasil dihapus.`,
      );
      setTargetUnlink(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus tautan";
      toast.error(msg);
    }
  };

  const handleBulkUnlink = async () => {
    if (selectedMappingIds.length === 0) return;
    try {
      await bulkUnlink.mutateAsync({ variant_mapping_ids: selectedMappingIds });
      toast.success(`${selectedMappingIds.length} tautan berhasil dihapus.`);
      setSelectedMappingIds([]);
      setIsBulkUnlinkOpen(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal menghapus tautan masal";
      toast.error(msg);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedMappingIds.length === tableRows.length) {
      setSelectedMappingIds([]);
    } else {
      setSelectedMappingIds(
        tableRows
          .map((r) => r.listing.variantChannelMappingId)
          .filter(Boolean) as string[],
      );
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedMappingIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleResync = async (listing: Listing) => {
    if (!listing.productChannelMappingId) return;

    try {
      await resyncChannel.mutateAsync(listing.productChannelMappingId);
      toast.success(
        `Sinkronisasi ke toko ${listing.shopName ?? "channel"} berhasil dijadwalkan.`,
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal menjadwalkan sinkronisasi";
      toast.error(msg);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Input
            placeholder="Cari SKU atau Varian..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-[200px]"
          />
          <Select
            value={shopId || "all"}
            onValueChange={(v) => {
              setShopId(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="Semua toko marketplace" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua toko marketplace</SelectItem>
              {stores?.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  <span className="flex items-center gap-2">
                    <ChannelLogo
                      code={store.channel?.code as ChannelCode}
                      name={store.channel?.name || "Channel"}
                      className="size-4 text-2xs"
                    />
                    <span className="truncate max-w-[150px]">
                      {store.shop_name} ({store.channel?.name || "Channel"})
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort Toggle (Simple, or can be a Select) */}
          <Select value={sort} onValueChange={(v) => setSort(v)}>
            <SelectTrigger className="h-9 w-[140px]">
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sku">SKU (A-Z)</SelectItem>
              <SelectItem value="-sku">SKU (Z-A)</SelectItem>
              <SelectItem value="sell_price">Harga (Rendah)</SelectItem>
              <SelectItem value="-sell_price">Harga (Tinggi)</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="inline-flex rounded-xl border border-border bg-muted/40 p-0.5">
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setViewMode("table")}
              title="Tampilan Tabel (Jubelio)"
              aria-label="Tampilan Tabel"
            >
              <TableIcon className="size-3.5" />
            </Button>
            <Button
              variant={viewMode === "card" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setViewMode("card")}
              title="Tampilan Kartu Varian"
              aria-label="Tampilan Kartu"
            >
              <LayoutGridIcon className="size-3.5" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCwIcon
              className={`size-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Segarkan</span>
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">
            {total}
          </span>{" "}
          varian ter-listing
          {listingCount > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-foreground tabular-nums">
                {listingCount}
              </span>{" "}
              listing di halaman ini
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title="Gagal memuat listing channel"
          description="Periksa koneksi lalu muat ulang data."
          action={
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Coba lagi
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={StoreIcon}
          title="Belum ada listing channel"
          description={
            shopId || searchDebounced
              ? "Tidak ditemukan listing untuk pencarian atau toko yang dipilih."
              : "Produk ini belum diunggah atau terhubung ke marketplace mana pun."
          }
        />
      ) : viewMode === "table" ? (
        /* ================= JUBELIO-STYLE TABLE VIEW ================= */
        <div className="flex flex-col gap-3">
          {selectedMappingIds.length > 0 && (
            <div className="flex items-center justify-between bg-muted/40 border border-border/60 rounded-2xl px-4 py-2">
              <span className="text-sm font-medium">
                {selectedMappingIds.length} listing dipilih
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsBulkUnlinkOpen(true)}
              >
                <Trash2Icon className="size-4 mr-2" />
                Hapus Link Masal
              </Button>
            </div>
          )}
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xs">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={
                        selectedMappingIds.length > 0 &&
                        selectedMappingIds.length === tableRows.length
                      }
                      onCheckedChange={handleToggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[180px]">Varian SKU</TableHead>
                  <TableHead className="w-[200px]">Toko & Channel</TableHead>
                  <TableHead className="w-[160px]">ID Marketplace</TableHead>
                  <TableHead className="w-[140px]">Tautan Produk</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[110px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.map((item, idx) => (
                  <TableRow
                    key={item.listing.variantChannelMappingId ?? idx}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="text-center">
                      <Checkbox
                        checked={
                          item.listing.variantChannelMappingId
                            ? selectedMappingIds.includes(
                                item.listing.variantChannelMappingId,
                              )
                            : false
                        }
                        onCheckedChange={() =>
                          item.listing.variantChannelMappingId &&
                          handleToggleSelectRow(
                            item.listing.variantChannelMappingId,
                          )
                        }
                        disabled={!item.listing.variantChannelMappingId}
                      />
                    </TableCell>
                    {/* SKU & Options */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {item.sku}
                        </span>
                        {item.options.length > 0 && (
                          <span className="text-2xs text-muted-foreground">
                            {item.options.map((o) => o.value).join(" / ")}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Channel & Shop Name */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ChannelLogo
                          code={item.listing.channelCode as ChannelCode}
                          name={
                            item.listing.channelName ??
                            item.listing.channelCode ??
                            "Channel"
                          }
                          className="size-5 shrink-0 text-2xs"
                        />
                        <div className="flex flex-col min-w-0">
                          <span
                            className="truncate text-xs font-medium text-foreground"
                            title={item.listing.shopName ?? undefined}
                          >
                            {item.listing.shopName ?? "Toko Marketplace"}
                          </span>
                          <span className="text-2xs text-muted-foreground capitalize">
                            {item.listing.channelName ??
                              item.listing.channelCode}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* ID Marketplace */}
                    <TableCell>
                      {item.listing.externalProductId ? (
                        <CopyableId
                          value={item.listing.externalProductId}
                          label="ID Marketplace"
                        />
                      ) : (
                        <span className="text-2xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>

                    {/* Direct URL */}
                    <TableCell>
                      {item.listing.channelUrl ? (
                        <Button
                          asChild
                          variant="outline"
                          size="xs"
                          className="h-7 text-xs font-normal gap-1.5 text-primary border-primary/20 hover:bg-primary/5"
                        >
                          <a
                            href={item.listing.channelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={item.listing.channelUrl ?? undefined}
                          >
                            <span>Buka Toko</span>
                            <ExternalLinkIcon className="size-3" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-2xs text-muted-foreground font-mono">
                          —
                        </span>
                      )}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell>
                      <SyncStatusBadge
                        status={item.listing.syncStatus}
                        reason={item.listing.errorMessage}
                      />
                    </TableCell>

                    {/* Actions: Re-sync & Unlink */}
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {item.listing.productChannelMappingId && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  className="text-muted-foreground hover:text-primary"
                                  onClick={() => handleResync(item.listing)}
                                >
                                  <RefreshCwIcon className="size-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Sinkronkan Ulang</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        <Button
                          variant="ghost"
                          size="xs"
                          className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 text-2xs font-medium"
                          onClick={() =>
                            handleOpenUnlink(item.listing, item.sku)
                          }
                        >
                          <Trash2Icon className="size-3" />
                          <span>Hapus Link</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* ================= CARD VIEW ================= */
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <VariantCard
              key={row.variantId}
              row={row}
              onUnlink={handleOpenUnlink}
              onResync={handleResync}
            />
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <TabPagination
          page={page}
          perPage={perPage}
          lastPage={lastPage}
          isFetching={isFetching}
          onPage={setPage}
          onPerPage={(n) => {
            setPerPage(n);
            setPage(1);
          }}
        />
      )}

      {/* Confirmation Dialog for Unlink */}
      <ConfirmDialog
        open={Boolean(targetUnlink)}
        onOpenChange={(open) => {
          if (!open) setTargetUnlink(null);
        }}
        title="Putus Tautan Channel (Hapus Link)"
        description={`Apakah Anda yakin ingin melepas tautan untuk SKU "${targetUnlink?.sku}" pada toko "${targetUnlink?.listing.shopName ?? "channel"}"?`}
        confirmLabel="Hapus Link"
        cancelLabel="Batal"
        variant="destructive"
        loading={unlinkVariant.isPending || unlinkChannel.isPending}
        onConfirm={handleConfirmUnlink}
      >
        <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground flex items-center gap-1.5">
            <Link2OffIcon className="size-4 text-destructive" />
            <span>Catatan Keamanan Data:</span>
          </p>
          <ul className="mt-1.5 list-disc list-inside space-y-0.5 text-2xs">
            <li>
              Master produk dan varian SKU internal di sistem{" "}
              <strong>tidak akan terhapus</strong>.
            </li>
            <li>
              Persediaan fisik dan saldo stok di gudang tetap{" "}
              <strong>100% aman</strong>.
            </li>
            <li>
              Anda dapat menautkan kembali produk ini kapan saja dengan
              melakukan download/sinkron ulang.
            </li>
          </ul>
        </div>
      </ConfirmDialog>

      {/* Confirmation Dialog for Bulk Unlink */}
      <ConfirmDialog
        open={isBulkUnlinkOpen}
        onOpenChange={setIsBulkUnlinkOpen}
        title="Hapus Link Masal"
        description={`Apakah Anda yakin ingin melepas ${selectedMappingIds.length} tautan yang dipilih?`}
        confirmLabel="Hapus Link Masal"
        cancelLabel="Batal"
        variant="destructive"
        loading={bulkUnlink.isPending}
        onConfirm={handleBulkUnlink}
      >
        <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground flex items-center gap-1.5">
            <Link2OffIcon className="size-4 text-destructive" />
            <span>Catatan Keamanan Data:</span>
          </p>
          <ul className="mt-1.5 list-disc list-inside space-y-0.5 text-2xs">
            <li>
              Master produk dan varian SKU di sistem{" "}
              <strong>tidak akan terhapus</strong>.
            </li>
            <li>Anda dapat menautkan kembali produk ini kapan saja.</li>
          </ul>
        </div>
      </ConfirmDialog>
    </div>
  );
}
