"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  CheckIcon,
  ChevronsUpDownIcon,
  CloudDownloadIcon,
  Loader2Icon,
  PackageIcon,
  SearchIcon,
  StoreIcon,
  XIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChannelLogo } from "@/components/dashboard/integrasi-channel/channel-logo";
import { useConnectedStores } from "@/hooks/channel/use-connected-stores";
import {
  channelSearchRowId,
  useUnifiedChannelSearch,
  useDownloadProduct,
  type ChannelSearchItem,
} from "@/hooks/master-produk/use-download";
import type { RawConnectedStore } from "@/types/channel";

const SUPPORTED = new Set(["tiktok", "lazada", "shopee"]);

function StoreMultiSelect({
  stores,
  selected,
  onToggle,
}: {
  stores: RawConnectedStore[];
  selected: Record<string, boolean>;
  onToggle: (shopId: string, next: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selectedCount = stores.filter((s) => selected[s.shop_id]).length;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.shop_name?.toLowerCase().includes(q) ||
        s.shop_id.toLowerCase().includes(q) ||
        s.channel?.name?.toLowerCase().includes(q),
    );
  }, [stores, query]);

  return (
    <Popover
      modal={true}
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={stores.length === 0}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 text-sm outline-none transition-[color,box-shadow]",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <span
            className={cn(
              "flex items-center gap-2 truncate",
              selectedCount === 0 && "text-muted-foreground",
            )}
          >
            <StoreIcon className="size-4 shrink-0 text-muted-foreground" />
            {selectedCount === 0
              ? "Semua toko yang aktif"
              : `${selectedCount} toko dipilih`}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) gap-0 p-0"
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari toko"
            className="h-10 border-0 bg-transparent px-0 focus-visible:ring-0"
          />
        </div>
        <div className="max-h-72 overflow-y-auto overscroll-contain p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Toko tidak ditemukan.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {filtered.map((s) => {
                const isSel = !!selected[s.shop_id];
                return (
                  <li key={s.shop_id}>
                    <button
                      type="button"
                      onClick={() => onToggle(s.shop_id, !isSel)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors",
                        isSel ? "bg-primary/10" : "hover:bg-muted/60",
                      )}
                    >
                      <ChannelLogo
                        code={s.channel?.code ?? ""}
                        name={s.channel?.name ?? "?"}
                        className="size-8 rounded-xl"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {s.shop_name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {s.channel?.name} · {s.shop_id}
                        </span>
                      </span>
                      <CheckIcon
                        className={cn(
                          "size-4 shrink-0 text-primary",
                          isSel ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function DownloadSatuanDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: stores = [] } = useConnectedStores();
  const downloadOne = useDownloadProduct();
  const unifiedSearch = useUnifiedChannelSearch();

  const [q, setQ] = React.useState("");
  const [selectedStores, setSelectedStores] = React.useState<
    Record<string, boolean>
  >({});
  const [items, setItems] = React.useState<ChannelSearchItem[]>([]);
  const [started, setStarted] = React.useState(false);
  const [rowSel, setRowSel] = React.useState<Record<string, boolean>>({});
  const [downloaded, setDownloaded] = React.useState<Record<string, boolean>>(
    {},
  );
  const [queued, setQueued] = React.useState<Record<string, boolean>>({});
  const [pending, setPending] = React.useState<Record<string, boolean>>({});

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setQ("");
      setSelectedStores({});
      setItems([]);
      setStarted(false);
      setRowSel({});
      setDownloaded({});
      setQueued({});
      setPending({});
    }
  }

  const supportedStores = React.useMemo(
    () =>
      stores.filter(
        (s) => s.is_active && s.channel?.code && SUPPORTED.has(s.channel.code),
      ),
    [stores],
  );
  const chosen = supportedStores.filter((s) => selectedStores[s.shop_id]);

  const handleSearch = async () => {
    if (!q.trim()) {
      toast("Masukkan kata kunci atau SKU yang ingin dicari");
      return;
    }

    setStarted(true);
    setItems([]);
    setRowSel({});

    const targetShopIds =
      chosen.length > 0
        ? chosen.map((s) => s.shop_id)
        : supportedStores.map((s) => s.shop_id);

    try {
      const res = await unifiedSearch.mutateAsync({
        q: q.trim(),
        shopIds: targetShopIds,
      });

      setItems(res.items);

      if (res.meta.failedStores?.length > 0) {
        toast.warning(
          `${res.meta.failedStores.length} toko mengalami gangguan respon`,
          {
            description: res.meta.failedStores
              .map((f) => `${f.shopName || f.shopId}: ${f.error}`)
              .join(", "),
          },
        );
      }
    } catch {
      // Error handled by hook apiError
    }
  };

  const runDownload = async (item: ChannelSearchItem) => {
    const id = channelSearchRowId(item);
    setPending((p) => ({ ...p, [id]: true }));
    try {
      await downloadOne.mutateAsync({
        channel: item.channelCode,
        shopId: item.shopId,
        externalProductId: item.externalProductId,
      });
      setQueued((q) => ({ ...q, [id]: true }));
    } catch {
    } finally {
      setPending((p) => ({ ...p, [id]: false }));
    }
  };

  const selectedItems = items.filter((i) => rowSel[channelSearchRowId(i)]);
  const bulkBusy = Object.values(pending).some(Boolean);

  const bulkDownload = async () => {
    for (const item of selectedItems) {
      if (
        downloaded[channelSearchRowId(item)] ||
        queued[channelSearchRowId(item)] ||
        item.alreadyDownloaded
      )
        continue;
      await runDownload(item);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90vh,860px)] max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle className="text-lg">Download Dari Channel</DialogTitle>
          <DialogDescription>
            Cari produk yang sudah diunggah di marketplace berdasarkan SKU/nama,
            lalu unduh datanya. Mendukung TikTok, Lazada &amp; Shopee.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 md:grid-cols-[20rem_1fr]">
          <div className="flex min-w-0 flex-col gap-4 border-b border-border/60 p-6 md:border-b-0 md:border-r">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Kata kunci</label>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cari nama atau SKU"
                  className="h-10 rounded-xl pl-9"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Toko</label>
              {supportedStores.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
                  Belum ada toko aktif.
                </div>
              ) : (
                <>
                  <StoreMultiSelect
                    stores={supportedStores}
                    selected={selectedStores}
                    onToggle={(shopId, next) =>
                      setSelectedStores((prev) => ({ ...prev, [shopId]: next }))
                    }
                  />
                  {chosen.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {chosen.map((s) => (
                        <span
                          key={s.shop_id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 py-1 pl-1.5 pr-1 text-xs"
                        >
                          <ChannelLogo
                            code={s.channel?.code ?? ""}
                            name={s.channel?.name ?? "?"}
                            className="size-4 rounded"
                          />
                          <span className="max-w-[9rem] truncate">
                            {s.shop_name}
                          </span>
                          <button
                            type="button"
                            aria-label={`Hapus ${s.shop_name}`}
                            onClick={() =>
                              setSelectedStores((prev) => ({
                                ...prev,
                                [s.shop_id]: false,
                              }))
                            }
                            className="grid size-4 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <XIcon className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <Button
              variant="primary"
              className="mt-auto h-10 w-full rounded-xl"
              onClick={handleSearch}
              disabled={unifiedSearch.isPending}
            >
              {unifiedSearch.isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" /> Mencari…
                </>
              ) : (
                <>
                  <SearchIcon className="size-4" /> Cari Produk
                </>
              )}
            </Button>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
              <span className="text-sm font-medium">Daftar Produk</span>
              <span className="text-xs text-muted-foreground">
                Total{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {items.length}
                </span>{" "}
                ditemukan
              </span>
            </div>

            {selectedItems.length > 0 && (
              <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-primary/5 px-5 py-2.5 text-sm">
                <span className="font-medium">
                  {selectedItems.length} dipilih
                </span>
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  onClick={bulkDownload}
                  disabled={bulkBusy}
                >
                  {bulkBusy ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <CloudDownloadIcon className="size-3.5" />
                  )}
                  Proses Terpilih
                </Button>
              </div>
            )}

            <div className="min-h-[20rem] flex-1 overflow-y-auto">
              {unifiedSearch.isPending ? (
                <div className="flex h-full min-h-[20rem] items-center justify-center text-sm text-muted-foreground">
                  <Loader2Icon className="mr-2 size-4 animate-spin" /> Mencari
                  produk lintas channel…
                </div>
              ) : !started ? (
                <div className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                  <div className="grid size-12 place-items-center rounded-2xl bg-muted/50">
                    <SearchIcon className="size-6" />
                  </div>
                  Masukkan kata kunci/SKU, pilih toko (opsional), lalu tekan
                  Cari Produk.
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
                  <div className="grid size-12 place-items-center rounded-2xl bg-muted/50">
                    <PackageIcon className="size-6" />
                  </div>
                  Tidak ada produk yang cocok di toko-toko yang dipilih.
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {items.map((item) => {
                    const id = channelSearchRowId(item);
                    const isDone = downloaded[id] || item.alreadyDownloaded;
                    const isQueued = queued[id];
                    return (
                      <li
                        key={id}
                        className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
                      >
                        <Checkbox
                          checked={!!rowSel[id]}
                          disabled={isDone || isQueued}
                          onCheckedChange={(v) =>
                            setRowSel((prev) => ({ ...prev, [id]: !!v }))
                          }
                        />
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-muted/40">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt=""
                              fill
                              sizes="40px"
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <span className="grid size-full place-items-center">
                              <PackageIcon className="size-4 text-muted-foreground" />
                            </span>
                          )}
                          <ChannelLogo
                            code={item.channelCode}
                            name={item.channelName || item.channelCode}
                            className="absolute -bottom-0.5 -right-0.5 size-4 rounded-md ring-2 ring-background"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="line-clamp-1 text-sm font-medium">
                              {item.name}
                            </p>
                            {item.hasBundleMapping && !item.hasRegularMapping && (
                              <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-3xs font-medium text-emerald-600 dark:text-emerald-400">
                                Terhubung ke Bundle
                              </span>
                            )}
                            {item.alreadyDownloaded && !item.hasBundleMapping && (
                              <span className="shrink-0 rounded bg-emerald-500/10 px-1.5 py-0.5 text-3xs font-medium text-emerald-600 dark:text-emerald-400">
                                Terhubung ke Master
                              </span>
                            )}
                            {item.downloadAction === "download" &&
                              item.masterProductId &&
                              item.masterStatus !== "deleted" && (
                              <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-3xs font-medium text-amber-700 dark:text-amber-400">
                                Mapping perlu disinkronkan
                              </span>
                            )}
                          </div>
                          <p
                            className="truncate font-mono text-xs text-muted-foreground"
                            title={item.sellerSkus.join(", ")}
                          >
                            SKU: {item.sellerSku ?? "—"}
                            {item.sellerSkus.length > 1 && (
                              <span className="font-sans"> · {item.sellerSkus.length} varian</span>
                            )}
                            {" "}·{" "}
                            {item.shopName ??
                              item.channelName ??
                              item.channelCode}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={isDone ? "outline" : "primary"}
                          className="h-8 shrink-0 gap-1.5"
                          onClick={() => runDownload(item)}
                          disabled={isDone || isQueued || pending[id]}
                        >
                          {pending[id] ? (
                            <Loader2Icon className="size-3.5 animate-spin" />
                          ) : isDone ? (
                            <CheckIcon className="size-3.5" />
                          ) : (
                            <CloudDownloadIcon className="size-3.5" />
                          )}
                          {isDone
                            ? "Sudah di Master"
                            : isQueued
                              ? "Dalam proses"
                              : item.downloadAction === "sync_bundle"
                                ? "Sinkronkan"
                                : "Download"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
