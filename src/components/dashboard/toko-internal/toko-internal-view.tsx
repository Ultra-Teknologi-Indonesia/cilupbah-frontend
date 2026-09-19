"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { SearchIcon, StoreIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LiquidGlass } from "@/components/ui/liquid-glass";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInternalStores } from "@/hooks/penjualan/use-internal-stores";

export function TokoInternalView() {
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [page, setPage] = useState(1);

  const applySearch = (nextQuery?: string) => {
    setAppliedQuery((nextQuery ?? query).trim());
    setQuery((nextQuery ?? query).trim());
    setPage(1);
  };

  const { data, isLoading } = useInternalStores({
    page,
    per_page: 20,
    search: appliedQuery || undefined,
    "filter[is_active]": onlyActive ? 1 : undefined,
  });

  const items = data?.items ?? [];
  const meta = data?.meta;

  const emptyMessage = useMemo(() => {
    if (isLoading) return "Memuat…";
    if (appliedQuery)
      return `Tidak ada toko yang cocok dengan "${appliedQuery}".`;
    return "Belum ada toko internal.";
  }, [appliedQuery, isLoading]);

  return (
    <LiquidGlass
      radius={24}
      intensity="default"
      className="bg-white/40 dark:bg-white/[0.06]"
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 px-5 pt-5 sm:px-6">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applySearch();
              }
            }}
            placeholder="Cari nama atau kode toko"
            className="pl-9 pr-16"
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
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={onlyActive} onCheckedChange={setOnlyActive} />
          Hanya aktif
        </label>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead className="w-32">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              items.map((store) => (
                <TableRow key={store.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40">
                        {store.logo_thumb || store.logo_url ? (
                          <Image
                            src={store.logo_thumb ?? store.logo_url!}
                            alt={store.name}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-muted-foreground">
                            <StoreIcon className="size-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{store.name}</div>
                        <div className="truncate font-mono text-xs text-muted-foreground">
                          {store.code}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {store.is_active ? (
                      <Badge variant="secondary">Aktif</Badge>
                    ) : (
                      <Badge variant="outline">Nonaktif</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between px-5 pb-5 text-sm text-muted-foreground sm:px-6">
          <div>
            Menampilkan {items.length} dari {meta.total} toko
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.current_page <= 1}
            >
              Sebelumnya
            </Button>
            <span>
              Halaman {meta.current_page} / {meta.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={meta.current_page >= meta.last_page}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </LiquidGlass>
  );
}
