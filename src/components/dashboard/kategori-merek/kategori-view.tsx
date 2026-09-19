"use client";

import * as React from "react";
import { DownloadIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useListState } from "@/hooks/use-list-state";
import { useUrlTab } from "@/hooks/use-url-tab";
import { KategoriListTab } from "./kategori-list-tab";
import { KategoriMappingTab } from "./kategori-mapping-tab";
import { ImportSystemDialog } from "./import-system-dialog";
import { TambahKategoriDialog } from "./tambah-kategori-dialog";

const KATEGORI_TABS = ["daftar", "pemetaan"] as const;
type KategoriTab = (typeof KATEGORI_TABS)[number];

export function KategoriView() {
  const [importOpen, setImportOpen] = React.useState(false);
  const [tambahOpen, setTambahOpen] = React.useState(false);

  const [tab, setTab] = useUrlTab<KategoriTab>("tab", "daftar", {
    validValues: KATEGORI_TABS,
  });
  const list = useListState<Record<string, never>>(
    {},
    { namespace: "kategori" },
  );

  return (
    <>
      <Tabs value={tab} onValueChange={(v) => setTab(v as KategoriTab)}>
        <LiquidGlass
          radius={24}
          intensity="default"
          className="bg-white/40 dark:bg-white/[0.06]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 pt-3 sm:px-5">
            <div className="overflow-x-auto">
              <TabsList variant="line">
                <TabsTrigger value="daftar">Daftar Kategori</TabsTrigger>
                <TabsTrigger value="pemetaan">Pemetaan Kategori</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex flex-wrap items-center gap-2 pb-3 sm:pb-0">
              <div className="relative w-full sm:w-64">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={list.search}
                  onChange={(e) => list.setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      list.applySearch();
                    }
                  }}
                  placeholder="Cari kategori…"
                  className="h-9 border-border bg-background pl-9 pr-8"
                />
                {list.search.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => list.applySearch("")}
                    aria-label="Bersihkan pencarian"
                    className="absolute right-2.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => list.applySearch()}
              >
                Cari
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => setImportOpen(true)}
              >
                <DownloadIcon className="size-4" />
                Import dari Sistem
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => setTambahOpen(true)}
              >
                <PlusIcon className="size-4" />
                Tambah Baru
              </Button>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-5">
            <TabsContent value="daftar" className="mt-0">
              <KategoriListTab search={list.appliedSearch} />
            </TabsContent>
            <TabsContent value="pemetaan" className="mt-0">
              <KategoriMappingTab search={list.appliedSearch} />
            </TabsContent>
          </div>
        </LiquidGlass>
      </Tabs>

      <ImportSystemDialog open={importOpen} onOpenChange={setImportOpen} />
      <TambahKategoriDialog open={tambahOpen} onOpenChange={setTambahOpen} />
    </>
  );
}
