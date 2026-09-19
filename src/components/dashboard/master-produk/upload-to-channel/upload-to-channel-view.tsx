"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftIcon, SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProductDetail } from "@/hooks/master-produk/use-product-detail";
import type { ComboboxOption } from "@/components/ui/combobox";
import { DestinationTable } from "./destination-table";

const TABS = [
  { id: "belum", label: "Belum Diupload", isUploaded: false },
  { id: "sudah", label: "Sudah diupload", isUploaded: true },
] as const;

type TabId = (typeof TABS)[number]["id"];

const CHANNEL_OPTIONS: ComboboxOption[] = [
  { value: "tiktok", label: "TikTok" },
  { value: "shopee", label: "Shopee" },
  { value: "lazada", label: "Lazada" },
  { value: "tokopedia", label: "Tokopedia" },
  { value: "blibli", label: "Blibli" },
  { value: "webstore", label: "Webstore" },
];

export function UploadToChannelView({ id }: { id: string }) {
  const { data: product } = useProductDetail(id);
  const productName = product?.name ?? "Produk";

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlTab = searchParams.get("tab");
  const initialTab: TabId = TABS.some((t) => t.id === urlTab)
    ? (urlTab as TabId)
    : "belum";
  const [active, setActive] = React.useState<TabId>(initialTab);

  const setTab = (next: string) => {
    setActive(next as TabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [channel, setChannel] = React.useState<string | null>(null);

  const applySearch = (nextSearch?: string) => {
    const trimmed = (nextSearch ?? searchInput).trim();
    setSearchInput(trimmed);
    setSearch(trimmed);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          asChild
          aria-label="Kembali ke produk"
        >
          <Link href={`/dashboard/produk/${id}`}>
            <ArrowLeftIcon />
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Upload ke Channel</p>
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {productName}
          </h1>
        </div>
      </div>

      <Tabs
        value={active}
        onValueChange={setTab}
        className="rounded-2xl border border-border/60 bg-card/50 shadow-sm"
      >
        <div className="sticky top-0 z-10 overflow-x-auto rounded-t-2xl border-b border-border/60 bg-card/80 px-3 pt-3 backdrop-blur-xl">
          <TabsList variant="line" className="h-auto pb-2">
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex flex-col gap-4 p-4 tabular-nums sm:p-5">
          <LiquidGlass
            radius={16}
            intensity="default"
            className="bg-white/40 dark:bg-white/[0.06]"
          >
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              <div className="relative w-full max-w-xs sm:w-64">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applySearch();
                    }
                  }}
                  placeholder="Cari toko…"
                  className="h-9 rounded-full border-border bg-background pl-9 pr-16"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => applySearch()}
                  className="absolute right-1 top-1/2 h-7 -translate-y-1/2 rounded-full px-2.5 text-xs"
                >
                  Cari
                </Button>
                {searchInput.length > 0 && (
                  <button
                    type="button"
                    onClick={() => applySearch("")}
                    aria-label="Bersihkan pencarian"
                    className="absolute right-12 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                )}
              </div>
              <Combobox
                options={CHANNEL_OPTIONS}
                value={channel}
                onChange={setChannel}
                placeholder="Pilih Channel"
                searchPlaceholder="Cari channel"
                className="h-9 w-44 rounded-full"
              />
            </div>
          </LiquidGlass>

          {TABS.map((t) => (
            <TabsContent key={t.id} value={t.id} className="mt-0">
              {active === t.id && (
                <DestinationTable
                  productId={id}
                  productName={productName}
                  isUploaded={t.isUploaded}
                  search={search || undefined}
                  channel={channel ?? undefined}
                />
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  );
}
