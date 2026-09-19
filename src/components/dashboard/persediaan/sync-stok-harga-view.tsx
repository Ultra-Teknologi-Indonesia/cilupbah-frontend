"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  PackageIcon,
  CheckIcon,
  Loader2Icon,
  SlidersHorizontalIcon,
  ChevronDownIcon,
  RefreshCwIcon,
  ToggleRightIcon,
} from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { FilterToolbar } from "@/components/dashboard/shared/filter-toolbar";
import { CopySku } from "@/components/dashboard/shared/copy-sku";
import { ChannelLogo } from "@/components/dashboard/integrasi-channel/channel-logo";
import { GlobalSyncToggle } from "@/components/dashboard/channel/global-sync-toggle";
import { TableSkeleton } from "@/components/ui/page-skeleton";
import { useListState } from "@/hooks/use-list-state";
import {
  useInventorySync,
  useToggleSync,
  useBulkToggleSync,
  type SyncMatrixParams,
  type SyncStoreColumn,
} from "@/hooks/persediaan/use-inventory-sync";
import { useSyncStock } from "@/hooks/master-produk/use-sync-stock";
import { usePermissions } from "@/hooks/auth/use-permissions";

type Mode = "sync" | "produk";

const MODE_TABS: { key: Mode; label: string }[] = [
  { key: "produk", label: "Produk" },
  { key: "sync", label: "Sync Stok dan Harga" },
];

const PRODUCT_COL_W = 320;
const STORE_COL_W = 128;
const HIDDEN_STORES_KEY = "sync-stok-harga:hidden-stores";

const CHANNEL_LABEL: Record<string, string> = {
  shopee: "Shopee",
  lazada: "Lazada",
  tiktok: "TikTok",
  tokopedia: "Tokopedia",
  woocommerce: "WooCommerce",
  blibli: "Blibli",
};

interface FilterState {
  channel: string;
}

const EMPTY_FILTERS: FilterState = { channel: "" };

function VisibleStoresControl({
  stores,
  hidden,
  onChange,
}: {
  stores: SyncStoreColumn[];
  hidden: string[];
  onChange: (next: string[]) => void;
}) {
  const hiddenSet = new Set(hidden);

  const toggle = (id: string) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  return (
    <Popover modal={true}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 rounded-full">
          <SlidersHorizontalIcon className="size-4" />
          Toko
          {hidden.length > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-2xs font-semibold text-primary-foreground">
              {stores.length - hidden.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          Tampilkan kolom toko
        </p>
        <div className="max-h-72 overflow-y-auto">
          {stores.map((store) => (
            <label
              key={store.channelShopId}
              className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-muted"
            >
              <Checkbox
                checked={!hiddenSet.has(store.channelShopId)}
                onCheckedChange={() => toggle(store.channelShopId)}
              />
              <ChannelLogo
                code={store.channelCode}
                name={store.shopName ?? ""}
                className="size-6"
              />
              <span className="truncate text-sm">{store.shopName}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StoreColumnHeader({
  store,
  mode,
  onBulk,
  onSyncStock,
  pending,
  canEdit,
}: {
  store: SyncStoreColumn;
  mode: Mode;
  onBulk: (channelShopId: string, syncEnabled: boolean) => void;
  onSyncStock: (store: SyncStoreColumn) => void;
  pending: boolean;
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-1">
      <ChannelLogo
        code={store.channelCode}
        name={store.shopName ?? ""}
        className="size-7"
      />
      <span className="line-clamp-2 text-center text-2xs font-medium leading-tight text-foreground">
        {store.shopName}
      </span>
      {mode === "sync" && canEdit && (
        <Popover modal={true}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-2xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Aksi massal kolom"
            >
              Massal
              <ChevronDownIcon className="size-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-44 p-1">
            <button
              type="button"
              disabled={pending}
              onClick={() => onBulk(store.channelShopId, true)}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
            >
              Aktifkan semua
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => onBulk(store.channelShopId, false)}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm text-destructive hover:bg-muted disabled:opacity-50"
            >
              Matikan semua
            </button>
            <div className="my-1 border-t border-border/60" />
            <button
              type="button"
              onClick={() => onSyncStock(store)}
              className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-muted"
            >
              <RefreshCwIcon className="size-4 text-muted-foreground" />
              Sinkronkan stok toko ini
            </button>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export function SyncStokHargaView({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const { can } = usePermissions();
  const canEdit = can("edit-pengaturan-persediaan");
  const [mode, setMode] = useState<Mode>("sync");
  const [hiddenStores, setHiddenStores] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIDDEN_STORES_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setHiddenStores(JSON.parse(raw) as string[]);
    } catch {}
  }, []);

  const updateHiddenStores = useCallback((next: string[]) => {
    setHiddenStores(next);
    try {
      localStorage.setItem(HIDDEN_STORES_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const list = useListState<FilterState>(EMPTY_FILTERS, { perPage: 20 });

  const params: SyncMatrixParams = useMemo(
    () => ({
      search: list.appliedSearch || undefined,
      channelCode: list.filters.channel || undefined,
      page: list.page,
      perPage: list.perPage,
    }),
    [list.appliedSearch, list.filters.channel, list.page, list.perPage],
  );

  const { data, isLoading, isFetching } = useInventorySync(params);
  const toggle = useToggleSync(params);
  const bulkToggle = useBulkToggleSync();
  const syncStock = useSyncStock();
  const [syncStore, setSyncStore] = useState<SyncStoreColumn | null>(null);
  const [bulkAllTarget, setBulkAllTarget] = useState<boolean | null>(null);

  const rows = data?.rows ?? [];
  const meta = data?.meta;
  const storesCatalog = useMemo(
    () => meta?.storesCatalog ?? [],
    [meta?.storesCatalog],
  );

  const hiddenSet = useMemo(() => new Set(hiddenStores), [hiddenStores]);
  const visibleStores = useMemo(
    () => storesCatalog.filter((s) => !hiddenSet.has(s.channelShopId)),
    [storesCatalog, hiddenSet],
  );

  const channelOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const s of storesCatalog) {
      if (s.channelCode) seen.add(s.channelCode);
    }
    return [
      { value: "", label: "Semua Channel" },
      ...[...seen].map((code) => ({
        value: code,
        label: CHANNEL_LABEL[code] ?? code,
      })),
    ];
  }, [storesCatalog]);

  const handleToggle = useCallback(
    (variantId: string, channelShopId: string, syncEnabled: boolean) => {
      toggle.mutate({ variantId, channelShopId, syncEnabled });
    },
    [toggle],
  );

  const handleBulk = useCallback(
    (channelShopId: string, syncEnabled: boolean) => {
      bulkToggle.mutate({
        syncEnabled,
        channelShopId,
        search: params.search,
        channelCode: params.channelCode,
      });
    },
    [bulkToggle, params.search, params.channelCode],
  );

  const handleSyncStock = useCallback((store: SyncStoreColumn) => {
    setSyncStore(store);
  }, []);

  const handleBulkAll = useCallback(
    (syncEnabled: boolean) => {
      bulkToggle.mutate(
        {
          syncEnabled,
          search: params.search,
          channelCode: params.channelCode,
        },
        { onSuccess: () => setBulkAllTarget(null) },
      );
    },
    [bulkToggle, params.search, params.channelCode],
  );

  const bulkAllScope = useMemo(() => {
    const parts: string[] = [];
    if (params.channelCode) {
      parts.push(
        `channel ${CHANNEL_LABEL[params.channelCode] ?? params.channelCode}`,
      );
    }
    if (params.search) parts.push(`pencarian "${params.search}"`);
    return parts.length > 0 ? parts.join(" + ") : "SEMUA toko & produk";
  }, [params.channelCode, params.search]);

  const modeTabs = (
    <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
      <TabsList variant="line" className="h-auto">
        {MODE_TABS.map((t) => (
          <TabsTrigger key={t.key} value={t.key}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  return (
    <div className="flex flex-col gap-4">
      {canEdit && <GlobalSyncToggle />}

      <LiquidGlass
        radius={20}
        intensity="subtle"
        className="bg-white/30 dark:bg-white/[0.04]"
      >
        <FilterToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        onSearch={list.applySearch}
          searchPlaceholder="Cari produk atau SKU..."
          align="end"
          leading={embedded ? undefined : modeTabs}
          trailing={
            <div className="flex items-center gap-2">
              {canEdit && mode === "sync" && (
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 rounded-full"
                      disabled={bulkToggle.isPending}
                    >
                      <ToggleRightIcon className="size-4" />
                      Sync semua
                      <ChevronDownIcon className="size-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-52 p-1">
                    <button
                      type="button"
                      disabled={bulkToggle.isPending}
                      onClick={() => setBulkAllTarget(true)}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                    >
                      Aktifkan semua sync
                    </button>
                    <button
                      type="button"
                      disabled={bulkToggle.isPending}
                      onClick={() => setBulkAllTarget(false)}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm text-destructive hover:bg-muted disabled:opacity-50"
                    >
                      Matikan semua sync
                    </button>
                  </PopoverContent>
                </Popover>
              )}
              <VisibleStoresControl
                stores={storesCatalog}
                hidden={hiddenStores}
                onChange={updateHiddenStores}
              />
            </div>
          }
          onReset={
            list.hasActiveFilter || !!list.search ? list.resetAll : undefined
          }
          hasFilter={list.hasActiveFilter || !!list.search}
          activeCount={list.activeFilterCount}
          gridCols={2}
        >
          <Combobox
            options={channelOptions}
            value={list.filters.channel}
            onChange={(v) =>
              list.setFilters({ ...list.filters, channel: v ?? "" })
            }
            placeholder="Channel"
            searchPlaceholder="Cari channel"
            className="h-9 bg-background"
          />
        </FilterToolbar>

        {isFetching && !isLoading && (
          <div className="flex justify-center py-1">
            <Loader2Icon className="size-4 animate-spin text-primary" />
          </div>
        )}

        <div className="px-4 py-3 sm:px-5">
          {isLoading ? (
            <TableSkeleton rows={8} cols={6} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={PackageIcon}
              title="Belum ada produk"
              description="Produk yang punya listing di channel akan muncul di sini."
            />
          ) : (
            <div className="flex flex-col gap-3">
              <ScrollArea
                orientation="horizontal"
                type="auto"
                className="rounded-lg border border-border/40 bg-background"
                viewportClassName="[&>div]:!block"
              >
                <Table scrollContainer={false}>
                  <TableHeader>
                    <TableRow className="border-b border-border/60">
                      <TableHead
                        className="sticky left-0 z-30 border-r border-border/40 bg-background px-3 align-bottom text-xs font-medium uppercase tracking-wider text-muted-foreground"
                        style={{
                          width: PRODUCT_COL_W,
                          minWidth: PRODUCT_COL_W,
                        }}
                      >
                        Produk
                      </TableHead>
                      {visibleStores.map((store) => (
                        <TableHead
                          key={store.channelShopId}
                          className="border-l border-border/40 px-2 py-2 align-top"
                          style={{ width: STORE_COL_W, minWidth: STORE_COL_W }}
                        >
                          <StoreColumnHeader
                            store={store}
                            mode={mode}
                            onBulk={handleBulk}
                            onSyncStock={handleSyncStock}
                            pending={bulkToggle.isPending}
                            canEdit={canEdit}
                          />
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {rows.map((row) => {
                      const cellByShop = new Map(
                        row.stores.map((c) => [c.channelShopId, c]),
                      );
                      return (
                        <TableRow
                          key={row.itemId}
                          className="border-b border-border/20 transition-colors last:border-0 hover:bg-muted/40"
                        >
                          <TableCell
                            className="sticky left-0 z-20 border-r border-border/40 bg-background px-3 py-3"
                            style={{
                              width: PRODUCT_COL_W,
                              minWidth: PRODUCT_COL_W,
                            }}
                          >
                            <div className="flex items-center gap-3">
                              {row.thumbnail ? (
                                <Image
                                  src={row.thumbnail}
                                  alt={row.itemName ?? row.itemCode}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 shrink-0 rounded-xl border border-border/40 object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                                  <PackageIcon className="size-5 text-muted-foreground/60" />
                                </div>
                              )}
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="whitespace-normal break-words text-sm font-medium text-foreground">
                                    {row.itemName || row.itemCode}
                                  </span>
                                  {row.isBundle && (
                                    <Badge
                                      variant="outline"
                                      className="shrink-0 text-2xs leading-tight"
                                    >
                                      Bundle
                                    </Badge>
                                  )}
                                </div>
                                {row.variationValues.length > 0 && (
                                  <span className="whitespace-normal break-words text-xs text-muted-foreground">
                                    {row.variationValues
                                      .map((v) => v.value)
                                      .join(", ")}
                                  </span>
                                )}
                                <CopySku sku={row.itemCode} />
                              </div>
                            </div>
                          </TableCell>

                          {visibleStores.map((store) => {
                            const cell = cellByShop.get(store.channelShopId);
                            return (
                              <TableCell
                                key={store.channelShopId}
                                className="border-l border-border/20 px-2 py-3 text-center"
                                style={{
                                  width: STORE_COL_W,
                                  minWidth: STORE_COL_W,
                                }}
                              >
                                {!cell ? (
                                  <span className="text-sm text-muted-foreground/50">
                                    —
                                  </span>
                                ) : mode === "sync" && canEdit ? (
                                  <Switch
                                    size="sm"
                                    checked={cell.syncEnabled}
                                    disabled={toggle.isPending}
                                    onCheckedChange={(checked) =>
                                      handleToggle(
                                        row.itemId,
                                        store.channelShopId,
                                        checked,
                                      )
                                    }
                                    aria-label={`Sync ${row.itemCode} di ${store.shopName}`}
                                  />
                                ) : mode === "sync" ? (
                                  <span className="text-2xs text-muted-foreground">
                                    {cell.syncEnabled ? "Aktif" : "Nonaktif"}
                                  </span>
                                ) : (
                                  <CheckIcon className="mx-auto size-4 text-success" />
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {visibleStores.length === 0 && (
                <p className="px-1 text-xs text-muted-foreground">
                  Tidak ada kolom toko yang ditampilkan. Gunakan tombol{" "}
                  <span className="font-medium">Toko</span> untuk memunculkan
                  store.
                </p>
              )}

              {meta && (
                <SimplePagination
                  page={meta.currentPage}
                  lastPage={meta.lastPage}
                  perPage={list.perPage}
                  onPageChange={list.setPage}
                  onPerPageChange={list.setPerPage}
                  pageSizeOptions={TABLE_PAGE_SIZES}
                  isFetching={isFetching}
                  total={meta.total}
                  label="produk"
                />
              )}
            </div>
          )}
        </div>
      </LiquidGlass>

      <ConfirmDialog
        open={!!syncStore}
        onOpenChange={(o) => !o && setSyncStore(null)}
        title="Sinkronkan Stok Toko"
        description={
          syncStore
            ? `Sinkronkan stok SEMUA produk toko ${syncStore.shopName ?? ""} ke channel? Ini memproses banyak item di latar belakang.`
            : ""
        }
        confirmLabel="Sinkronkan"
        loading={syncStock.isPending}
        onConfirm={() => {
          if (!syncStore) return;
          syncStock.mutate(
            {
              mode: "all",
              channelShopId: syncStore.channelShopId,
              filters: { channel_shop_id: syncStore.channelShopId },
            },
            { onSuccess: () => setSyncStore(null) },
          );
        }}
      />

      <ConfirmDialog
        open={bulkAllTarget !== null}
        onOpenChange={(o) => !o && setBulkAllTarget(null)}
        title={bulkAllTarget ? "Aktifkan Semua Sync" : "Matikan Semua Sync"}
        description={
          bulkAllTarget
            ? `Nyalakan sync stok & harga untuk ${bulkAllScope}. Semua listing dalam cakupan ini akan mulai push stok & harga ke channel. Lanjutkan?`
            : `Matikan sync stok & harga untuk ${bulkAllScope}. Sistem berhenti push stok & harga ke channel untuk listing dalam cakupan ini. Lanjutkan?`
        }
        confirmLabel={bulkAllTarget ? "Aktifkan semua" : "Matikan semua"}
        variant={bulkAllTarget ? "default" : "destructive"}
        loading={bulkToggle.isPending}
        onConfirm={() => {
          if (bulkAllTarget === null) return;
          handleBulkAll(bulkAllTarget);
        }}
      />
    </div>
  );
}
